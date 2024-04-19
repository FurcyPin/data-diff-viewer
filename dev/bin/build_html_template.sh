#!/bin/bash
set -e
PROJECT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/../.." &> /dev/null && pwd )

$PROJECT_DIR/dev/bin/clean_install_npm.sh
cd $PROJECT_DIR/javascript/data-diff-viewer
npm run build
cd ../..

TARGET_DIR=data_diff_viewer/templates

rm -f $TARGET_DIR/diff_report.html
mkdir -p $TARGET_DIR
cp javascript/data-diff-viewer/build/index.html $TARGET_DIR/diff_report.html

poetry run python dev/bin/inline_javascript_libraries.py

