"""Tests for _verify_console_scripts_installed (issue #52931)."""

from __future__ import annotations

import textwrap
from pathlib import Path
from unittest.mock import patch

import pytest


@pytest.fixture
def temp_pyproject(tmp_path, monkeypatch):
    pyproject = tmp_path / "pyproject.toml"
    pyproject.write_text(
        textwrap.dedent(
            """\
        [project]
        name = "fake"
        version = "0.0.0"

        [project.scripts]
        slick = "slick_cli.main:main"
        slick-agent = "run_agent:main"
        slick-acp = "acp_adapter.entry:main"
    """
        )
    )
    import slick_cli.main as main_mod

    monkeypatch.setattr(main_mod, "PROJECT_ROOT", tmp_path)
    return tmp_path


@pytest.fixture
def fake_scripts_dir(tmp_path):
    scripts = tmp_path / "venv" / "Scripts"
    scripts.mkdir(parents=True)
    return scripts


class TestVerifyConsoleScriptsInstalled:
    def test_no_action_when_all_shims_present(self, temp_pyproject, fake_scripts_dir):
        for name in ("slick", "slick-agent", "slick-acp"):
            (fake_scripts_dir / f"{name}.exe").write_bytes(b"fake")

        with patch("slick_cli.main._is_windows", return_value=True), \
             patch("slick_cli.main._venv_scripts_dir", return_value=fake_scripts_dir), \
             patch("slick_cli.main._run_quarantined_install") as mock_install:
            from slick_cli.main import _verify_console_scripts_installed

            _verify_console_scripts_installed(["uv", "pip"], env={})

        mock_install.assert_not_called()




    def test_quarantine_shims_include_declared_console_scripts(
        self, temp_pyproject, fake_scripts_dir
    ):
        import slick_cli.main as main_mod

        with patch("slick_cli.main._is_windows", return_value=True):
            names = {path.name for path in main_mod._slick_exe_shims(fake_scripts_dir)}

        assert {"slick.exe", "slick-agent.exe", "slick-acp.exe"} <= names
        assert "slick-gateway.exe" in names
