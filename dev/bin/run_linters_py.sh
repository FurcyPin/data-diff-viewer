#!/bin/bash
set -e
PROJECT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/../.." &> /dev/null && pwd )

poetry run black .
poetry run ruff check . --fix
poetry run mypy data_diff_viewer
