#!/bin/bash
set -e
PROJECT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/../.." &> /dev/null && pwd )

$PROJECT_DIR/dev/bin/run_linters_js.sh
$PROJECT_DIR/dev/bin/run_linters_py.sh
