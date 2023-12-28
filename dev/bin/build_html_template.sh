#!/bin/bash

cd javascript/data-diff-viewer
npm install
npm run build
cd ../..

TARGET_DIR=data_diff_viewer/templates

rm -f $TARGET_DIR/diff_report.html
mkdir -p $TARGET_DIR
cp javascript/data-diff-viewer/build/index.html $TARGET_DIR/diff_report.html

