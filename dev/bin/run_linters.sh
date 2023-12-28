#!/bin/bash
set -e

poetry run black .
poetry run ruff check . --fix
poetry run mypy data_diff_viewer
