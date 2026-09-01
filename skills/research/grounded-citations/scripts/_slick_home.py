"""Resolve SLICK_HOME for standalone skill scripts.

Skill scripts may run outside the Slick process (system Python, nix env,
CI) where ``slick_constants`` is not importable.  This module provides the
same ``get_slick_home()`` contract without requiring it on ``sys.path``.

When ``slick_constants`` IS available it is used directly so profile
resolution and any future enhancements are picked up automatically.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from slick_constants import get_slick_home as get_slick_home
except (ModuleNotFoundError, ImportError):

    def get_slick_home() -> Path:
        """Return the Slick home directory (default: ``~/.slick``)."""
        val = os.environ.get("SLICK_HOME", "").strip()
        return Path(val) if val else Path.home() / ".slick"
