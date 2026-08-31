from pathlib import Path


def test_windows_native_install_path_docs_match_installer() -> None:
    doc = Path("website/docs/user-guide/windows-native.md").read_text()
    install = Path("scripts/install.ps1").read_text()

    # The launchers live in the managed binary dir OUTSIDE the git checkout
    # (SLICK_HOME\bin, next to the managed uv) — NOT the whole venv\Scripts
    # (which would shadow the user's python, #83797) and NOT a dir inside
    # the checkout (which `slick update`'s autostash swept off disk).
    assert "%LOCALAPPDATA%\\slick\\bin" in doc
    assert (
        "Get-Command slick        # should print "
        "C:\\Users\\<you>\\AppData\\Local\\slick\\bin\\slick.exe"
    ) in doc
    # Installer exposes $SlickHome\bin, and must copy the launchers into it.
    assert '$slickBin = "$SlickHome\\bin"' in install
    assert "slick.exe" in install and "slick-acp.exe" in install
    # Guard against regressions to either legacy layout.
    assert '$slickBin = "$InstallDir\\venv\\Scripts"' not in install
    assert '$slickBin = "$InstallDir\\bin"' not in install
