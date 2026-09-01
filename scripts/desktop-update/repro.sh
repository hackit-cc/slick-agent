#!/bin/bash
# repro.sh -- reproduce desktop-update paths against a sandboxed SLICK_HOME.
#
# Nothing here touches your real ~/.slick or checkout. Each mode builds (or
# reuses) a disposable install under /tmp and drives the REAL code path --
# the actual installer, the actual orchestrator, the actual `slick update`.
#
#   repro.sh shim          shim UI only: success event after 6s
#   repro.sh shim-fail     shim UI only: error event after 6s
#   repro.sh fresh         fresh install into a sandbox SLICK_HOME
#                          (scripts/install.sh, the literal user path)
#   repro.sh behind [N]    sandbox install rewound N commits (default 25),
#                          then the posix orchestrator drives it forward --
#                          the "user who hasn't updated in a while" path
#   repro.sh error         orchestrator against a broken install (missing
#                          venv) -- exercises abort + result-file + shim error
#   repro.sh gate          linux relaunch-gate decision matrix (anchoring,
#                          sandbox preflight, opt-out fallbacks) -- asserts
#                          every outcome without touching a real install
#
# The sandbox persists between runs (~/tmp is fine to nuke): fresh reuses
# nothing, behind/error reuse the last sandbox install when present because
# a from-scratch install is minutes.
#
# npm entry points (apps/desktop/package.json):
#   npm run update:shim / update:shim:fail / update:repro:fresh /
#   update:repro:behind [-- N] / update:repro:error

set -euo pipefail

MODE="${1:-help}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX="${SLICK_UPDATE_REPRO_HOME:-/tmp/slick-update-repro}"
SANDBOX_ROOT="$SANDBOX/slick-agent"

say() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

ensure_sandbox_install() {
  if [ -x "$SANDBOX_ROOT/venv/bin/slick" ]; then
    say "reusing sandbox install at $SANDBOX_ROOT"
    return
  fi
  say "fresh sandbox install into $SANDBOX (this takes a while)"
  rm -rf "$SANDBOX"
  mkdir -p "$SANDBOX"
  # The literal user path: install.sh against a clone of THIS checkout, so
  # the repro reproduces what you're about to ship, not origin/main.
  git clone --quiet "$REPO_ROOT" "$SANDBOX_ROOT"
  SLICK_HOME="$SANDBOX" bash "$SANDBOX_ROOT/scripts/install.sh" --non-interactive --skip-setup --slick-home "$SANDBOX"
}

case "$MODE" in
  shim)
    SLICK_SELFTEST_HOLD_SECONDS="${SLICK_SELFTEST_HOLD_SECONDS:-6}" \
      bash "$SCRIPT_DIR/posix.sh" --self-test-ui
    ;;
  shim-fail)
    SLICK_SELFTEST_FAIL=1 SLICK_SELFTEST_HOLD_SECONDS="${SLICK_SELFTEST_HOLD_SECONDS:-6}" \
      bash "$SCRIPT_DIR/posix.sh" --self-test-ui
    ;;
  fresh)
    rm -rf "$SANDBOX"
    ensure_sandbox_install
    say "fresh install OK: $("$SANDBOX_ROOT/venv/bin/slick" --version 2>/dev/null || echo '?')"
    ;;
  behind)
    N="${2:-25}"
    ensure_sandbox_install
    say "rewinding sandbox checkout $N commits"
    git -C "$SANDBOX_ROOT" fetch --quiet origin main || true
    git -C "$SANDBOX_ROOT" checkout --quiet main
    git -C "$SANDBOX_ROOT" reset --hard --quiet "HEAD~$N"
    say "sandbox now at: $(git -C "$SANDBOX_ROOT" log --oneline -1)"
    say "driving the orchestrator (watch the shim; log: $SANDBOX/logs/desktop-update-handoff.log)"
    SLICK_HOME="$SANDBOX" bash "$SCRIPT_DIR/posix.sh" \
      --install-root "$SANDBOX_ROOT" --branch main --desktop-pid 0 || true
    say "result file:"
    cat "$SANDBOX/.slick-update-result.json" 2>/dev/null || echo "(none written)"
    echo
    say "sandbox after update: $(git -C "$SANDBOX_ROOT" log --oneline -1)"
    ;;
  error)
    ensure_sandbox_install
    say "breaking the sandbox venv, then driving the orchestrator"
    mv "$SANDBOX_ROOT/venv" "$SANDBOX_ROOT/venv.hidden"
    SLICK_HOME="$SANDBOX" bash "$SCRIPT_DIR/posix.sh" \
      --install-root "$SANDBOX_ROOT" --branch main --desktop-pid 0 || true
    mv "$SANDBOX_ROOT/venv.hidden" "$SANDBOX_ROOT/venv"
    say "result file (expect ok:false, exit 3):"
    cat "$SANDBOX/.slick-update-result.json" 2>/dev/null || echo "(none written)"
    echo
    ;;
  gate)
    # Pure-decision matrix for the linux relaunch gate. Builds a fake
    # checkout layout under /tmp; --self-test-gate prints the decision and
    # exits without running an update.
    G="/tmp/slick-gate-test.$$"
    UNPACKED="$G/slick-agent/apps/desktop/release/linux-unpacked"
    mkdir -p "$UNPACKED"
    touch "$UNPACKED/slick" && chmod +x "$UNPACKED/slick"

    fails=0
    expect() { # name expected actual
      if [ "$2" = "$3" ]; then printf 'ok   %s -> %s\n' "$1" "$3"
      else printf 'FAIL %s -> %s (want %s)\n' "$1" "$3" "$2"; fails=$((fails+1)); fi
    }
    decide() { bash "$SCRIPT_DIR/posix.sh" --self-test-gate --install-root "$G/slick-agent" "$@" | cut -d: -f1; }

    expect "appimage (not under unpacked)"      skew     "$(decide --relaunch-target /opt/Slick/slick)"
    expect "sibling-prefix dir not fooled"      skew     "$(decide --relaunch-target "$UNPACKED-evil/slick")"
    expect "no chrome-sandbox (namespace)"      relaunch "$(decide --relaunch-target "$UNPACKED/slick")"

    touch "$UNPACKED/chrome-sandbox"
    expect "sandbox not root/setuid"            manual   "$(decide --relaunch-target "$UNPACKED/slick")"
    expect "opt-out: --sandbox-fallback"        relaunch "$(decide --relaunch-target "$UNPACKED/slick" --sandbox-fallback)"
    expect "opt-out: --no-sandbox launch arg"   relaunch "$(decide --relaunch-target "$UNPACKED/slick" -- --no-sandbox)"
    expect "opt-out: ELECTRON_DISABLE_SANDBOX"  relaunch "$(ELECTRON_DISABLE_SANDBOX=1 decide --relaunch-target "$UNPACKED/slick")"

    # Result JSON must survive hostile strings (git allows `"` in branch
    # names; messages carry arbitrary text) -- parse it back with python.
    QHOME="$G/qhome"; mkdir -p "$QHOME/slick-agent"
    bash "$SCRIPT_DIR/posix.sh" --no-ui --no-marker-cleanup --desktop-pid 0 \
      --install-root "$QHOME/slick-agent" --branch 'evil"branch\n$(x)' >/dev/null 2>&1 || true
    if python3 -c "import json,sys; d=json.load(open('$QHOME/.slick-update-result.json')); sys.exit(0 if d['branch']=='evil\"branch\\\\n\$(x)' and d['ok']==False else 1)"; then
      printf 'ok   result JSON escapes hostile branch/message\n'
    else
      printf 'FAIL result JSON escaping\n'; fails=$((fails+1))
    fi

    rm -rf "$G"
    [ "$fails" -eq 0 ] && say "gate matrix: all pass" || { say "gate matrix: $fails FAILED"; exit 1; }
    ;;
  launch)
    # Terminal-lifecycle matrix (gille round 2): launch acceptance is part
    # of the outcome. Each case runs the REAL orchestrator (--no-ui) against
    # a fake install whose `slick` stub exits 0 instantly, so the flow
    # reaches finish() with FINAL_CODE=0 and exercises the launch leg.
    L="/tmp/slick-launch-test.$$"
    fails=0
    expect_msg() { # name python-expr
      if python3 -c "import json,sys; d=json.load(open('$L/.slick-update-result.json')); sys.exit(0 if ($2) else 1)"; then
        printf 'ok   %s\n' "$1"
      else
        printf 'FAIL %s -> %s\n' "$1" "$(cat "$L/.slick-update-result.json" 2>/dev/null)"; fails=$((fails+1))
      fi
    }
    stub_install() { # creates a fake install whose slick update succeeds
      rm -rf "$L"; mkdir -p "$L/slick-agent/venv/bin"
      printf '#!/bin/sh\nexit 0\n' > "$L/slick-agent/venv/bin/slick"
      chmod +x "$L/slick-agent/venv/bin/slick"
    }

    # 1. linux relaunch target dies instantly -> manual downgrade in result
    stub_install
    UNPACKED="$L/slick-agent/apps/desktop/release/linux-unpacked"
    mkdir -p "$UNPACKED"
    printf '#!/bin/sh\nexit 1\n' > "$UNPACKED/slick"; chmod +x "$UNPACKED/slick"
    if [ "$(uname)" != "Darwin" ]; then
      bash "$SCRIPT_DIR/posix.sh" --no-ui --desktop-pid 0 --install-root "$L/slick-agent" \
        --relaunch-target "$UNPACKED/slick" >/dev/null 2>&1 || true
      expect_msg "instant-exit relaunch downgrades to manual" "d['ok']==True and d['manual']==True and 'Reopen Slick' in d['message']"
    else
      # mac: a SUPPLIED target that is missing is a REJECTED launch and
      # must downgrade to manual — never a clean "Update complete."
      bash "$SCRIPT_DIR/posix.sh" --no-ui --desktop-pid 0 --install-root "$L/slick-agent" \
        --relaunch-target "$L/NoSuch.app" >/dev/null 2>&1 || true
      expect_msg "missing bundle downgrades to manual" "d['ok']==True and d['manual']==True and 'Reopen Slick' in d['message']"
    fi

    # 2. gated skew: success result carries the skew message (the manual
    #    event's payload), never a bare "Update complete."
    stub_install
    bash "$SCRIPT_DIR/posix.sh" --no-ui --desktop-pid 0 --install-root "$L/slick-agent" \
      --relaunch-target /opt/Slick/slick >/dev/null 2>&1 || true
    if [ "$(uname)" != "Darwin" ]; then
      expect_msg "skew outcome surfaces in result message" "d['ok']==True and d['manual']==True and 'was not changed' in d['message']"
    fi

    rm -rf "$L"
    [ "$fails" -eq 0 ] && say "launch matrix: all pass" || { say "launch matrix: $fails FAILED"; exit 1; }
    ;;
  *)
    sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
    exit 64
    ;;
esac
