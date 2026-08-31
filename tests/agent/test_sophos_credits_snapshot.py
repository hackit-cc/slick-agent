"""Tests for build_sophos_credits_snapshot (L6-A, magnitudes-only)."""

from __future__ import annotations

from agent.account_usage import build_sophos_credits_snapshot
from slick_cli.sophos_account import (
    SophosPaidServiceAccessInfo,
    SophosPortalAccountInfo,
    SophosPortalSubscriptionInfo,
)


def _account(**kwargs) -> SophosPortalAccountInfo:
    kwargs.setdefault("logged_in", True)
    kwargs.setdefault("source", "account_api")
    kwargs.setdefault("fresh", True)
    return SophosPortalAccountInfo(**kwargs)


def _all_lines(snapshot) -> list[str]:
    return list(snapshot.details)


def test_healthy():
    info = _account(
        paid_service_access=True,
        paid_service_access_info=SophosPaidServiceAccessInfo(
            subscription_credits_remaining=18.0,
            purchased_credits_remaining=12.34,
            total_usable_credits=30.34,
        ),
        subscription=SophosPortalSubscriptionInfo(
            plan="Pro",
            current_period_end="2026-07-01",
        ),
    )
    snap = build_sophos_credits_snapshot(info)
    assert snap is not None
    assert snap.available is True
    assert snap.plan == "Pro"
    assert snap.provider == "sophos"
    assert snap.title == "Sophos credits"
    blob = "\n".join(_all_lines(snap))
    assert "$18.00" in blob
    assert "$12.34" in blob
    assert "$30.34" in blob
    assert "Renews: 2026-07-01" in blob
    assert "/billing" in blob
    # money-rule: magnitudes-only, never a percentage
    assert "%" not in blob








def test_logged_out():
    info = _account(
        logged_in=False,
        paid_service_access=True,
        paid_service_access_info=SophosPaidServiceAccessInfo(
            total_usable_credits=10.0,
        ),
    )
    assert build_sophos_credits_snapshot(info) is None


def test_none():
    assert build_sophos_credits_snapshot(None) is None






