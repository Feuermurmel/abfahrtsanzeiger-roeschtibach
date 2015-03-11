#! /usr/bin/env bash

set -e -o pipefail

rm -rf deploy
mkdir deploy
git clone . deploy

(
	cd deploy;
	
	commit=$(git rev-parse HEAD);
	make all;
	cd out;
	git init;
	git add .;
	git commit -m "Deployed from commit $$commit."
)

git fetch -f deploy/out HEAD:gh-pages
git push -f origin gh-pages

