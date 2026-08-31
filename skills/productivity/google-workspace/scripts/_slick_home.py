"""Resolve SLICK_HOME for standalone skill scripts.

Skill scripts may run outside the Slick process (e.g. system Python,
nix env, CI) where ``slick_constants`` is not importable.  This module
provides the same ``get_slick_home()`` and ``display_slick_home()``
contracts as ``slick_constants`` without requiring it on ``sys.path``.

When ``slick_constants`` IS available it is used directly so that any
future enhancements (profile resolution, Docker detection, etc.) are
picked up automatically.  The fallback path replicates the core logic
from ``slick_constants.py`` using only the stdlib.

All scripts under ``google-workspace/scripts/`` should import from here
instead of duplicating the ``SLICK_HOME = Path(os.getenv(...))`` pattern.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from slick_constants import display_slick_home as display_slick_home
    from slick_constants import get_slick_home as get_slick_home
except (ModuleNotFoundError, ImportError):

    def get_slick_home() -> Path:
        """Return the Slick home directory (default: ~/.slick).

        Mirrors ``slick_constants.get_slick_home()``."""
        val = os.environ.get("SLICK_HOME", "").strip()
        return Path(val) if val else Path.home() / ".slick"

    def display_slick_home() -> str:
        """Return a user-friendly ``~/``-shortened display string.

        Mirrors ``slick_constants.display_slick_home()``."""
        home = get_slick_home()
        try:
            return "~/" + home.relative_to(Path.home()).as_posix()
        except ValueError:
            return str(home)
