#!/bin/bash

mkdir -p dist
rm -rf dist/*

package_name="LocalCryptosWalletBackupExplorer"
parent_folder="LocalCryptosWalletBackupExplorer"

cp -r build $parent_folder

zip -r "dist/$package_name.zip" $parent_folder || exit 0
tar -czvf "dist/$package_name.tar.gz" $parent_folder

rm -rf $parent_folder
