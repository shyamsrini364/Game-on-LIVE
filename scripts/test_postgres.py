"""Run full regression suite with an explicit ignored Neon environment file."""
import argparse
import os
from pathlib import Path
import subprocess
import sys
from dotenv import dotenv_values

parser = argparse.ArgumentParser()
parser.add_argument('--env-file', required=True)
args = parser.parse_args()
config = dotenv_values(args.env_file)
url = config.get('DATABASE_URL')
if not url:
    raise SystemExit('DATABASE_URL missing from selected file')
environment = os.environ.copy()
environment['TEST_DATABASE_URL'] = url
# The unittest report is credential-free; never print the environment.
result = subprocess.run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v'],
                        cwd=Path(__file__).resolve().parent.parent, env=environment)
raise SystemExit(result.returncode)
