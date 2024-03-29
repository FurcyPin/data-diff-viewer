#!/bin/bash
set -e
PROJECT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/../.." &> /dev/null && pwd )

cd $PROJECT_DIR/javascript/data-diff-viewer
rm -rf build
rm -rf node_modules
npm install
