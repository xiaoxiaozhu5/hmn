#!/bin/bash

set -eo pipefail
source /home/hmn/hmn/server/hmn.conf

echo 'Content-Type: text/plain'
echo ''

if [[ "$HTTP_X_GITLAB_TOKEN" != "$GITLAB_SECRET" ]]; then
    echo 'Not Authorized'
    exit 1
fi

/home/hmn/hmn/server/deploy.sh $1
