from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]


def test_phase0_demo_direct_script_entrypoint() -> None:
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "run_phase0_demo.py")],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
        timeout=30,
    )

    assert result.returncode == 0, result.stderr
    assert '"winner"' in result.stdout
    assert '"decisions"' in result.stdout
