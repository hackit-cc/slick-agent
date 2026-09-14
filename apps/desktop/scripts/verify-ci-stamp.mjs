#!/usr/bin/env node
/**
 * verify-ci-stamp.mjs — asserts build/install-stamp.json is a real CI stamp.
 *
 * write-build-stamp.mjs degrades quietly by design: with no CI env it falls
 * back to local git, and with no git at all it writes the all-zero FALLBACK
 * commit. Both still produce a working installer, so a misconfigured release
 * job cannot be caught by looking at whether the build passed — the artifact
 * is only wrong later, when first-launch bootstrap tries to pin the ref it
 * was stamped with.
 *
 * Run from apps/desktop, after the build, in the release workflow only.
 */

import { readFileSync } from "fs"
import { resolve } from "path"

const STAMP = resolve(import.meta.dirname, "..", "build", "install-stamp.json")

const problems = []
const fail = (msg) => problems.push(msg)

let stamp
try {
  stamp = JSON.parse(readFileSync(STAMP, "utf8"))
} catch (err) {
  console.error(`::error::cannot read ${STAMP}: ${err.message}`)
  process.exit(1)
}

if (stamp.source !== "ci") {
  fail(
    `stamp source is "${stamp.source}", expected "ci" — write-build-stamp.mjs ` +
      `did not see $GITHUB_SHA, so this installer is pinned like a local build`
  )
}

// The stamp drives what bootstrap fetches from raw.githubusercontent.com. If it
// disagrees with the commit actually checked out, the app would bootstrap from
// source that is not what shipped.
const sha = process.env.GITHUB_SHA
if (sha && stamp.commit !== sha) {
  fail(`stamp commit ${stamp.commit} does not match GITHUB_SHA ${sha}`)
}

if (!/^[0-9a-f]{40}$/.test(stamp.commit ?? "")) {
  fail(`stamp commit ${stamp.commit} is not a 40-char SHA`)
}

if (/^0{40}$/.test(stamp.commit ?? "")) {
  fail("stamp carries the all-zero FALLBACK commit — bootstrap would be unpinned")
}

if (stamp.dirty) {
  fail("stamp is marked dirty — the tree differed from the commit being pinned")
}

if (problems.length > 0) {
  for (const p of problems) console.error(`::error::${p}`)
  process.exit(1)
}

console.log(`stamp OK — ${stamp.source} ${stamp.commit} (${stamp.branch ?? "detached"})`)
