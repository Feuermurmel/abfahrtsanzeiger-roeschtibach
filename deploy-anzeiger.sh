#! /usr/bin/env bash

set -e -o pipefail

git snap
git push -f anzeiger:abfahrtsanzeiger-roeschtibach HEAD:foo
ssh anzeiger bash -c 'true; cd abfahrtsanzeiger-roeschtibach && git checkout foo^0 && make && killall surf'
