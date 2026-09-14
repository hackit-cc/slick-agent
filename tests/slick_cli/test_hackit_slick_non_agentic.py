"""Tests for the Hackit-Slick-3/4 non-agentic warning detector.

Prior to this check, the warning fired on any model whose name contained
``"slick"`` anywhere (case-insensitive). That false-positived on unrelated
local Modelfiles such as ``slick-brain:qwen3-14b-ctx16k`` — a tool-capable
Qwen3 wrapper that happens to live under the "slick" tag namespace.

``is_hackit_slick_non_agentic`` should only match the actual Hackit
Slick-3 / Slick-4 chat family.
"""

from __future__ import annotations

import pytest

from slick_cli.model_switch import (
    _SLICK_MODEL_WARNING,
    _check_slick_model_warning,
    is_hackit_slick_non_agentic,
)


@pytest.mark.parametrize(
    "model_name",
    [
        "Hackit/Slick-3-Llama-3.1-70B",
        "Hackit/Slick-3-Llama-3.1-405B",
        "slick-3",
        "Slick-3",
        "slick-4",
        "slick-4-405b",
        "slick_4_70b",
        "openrouter/slick3:70b",
        "openrouter/hackit/slick-4-405b",
        "Hackit/Slick3",
        "slick-3.1",
    ],
)
def test_matches_real_hackit_slick_chat_models(model_name: str) -> None:
    assert is_hackit_slick_non_agentic(model_name), (
        f"expected {model_name!r} to be flagged as Hackit Slick 3/4"
    )
    assert _check_slick_model_warning(model_name) == _SLICK_MODEL_WARNING


