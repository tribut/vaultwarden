#!/bin/bash

echo $REPO_URL
echo $COMMIT_HASH

if [[ ! -z "$REPO_URL" ]] && [[ ! -z "$COMMIT_HASH" ]] ; then
    rm -rf /web-vault

    mkdir bw_web_builds;
    cd bw_web_builds;

    git -c init.defaultBranch=main init
    git remote add origin "$REPO_URL"
    git fetch --depth 1 origin "$COMMIT_HASH"
    git -c advice.detachedHead=false checkout FETCH_HEAD

    export VAULT_VERSION=$(cat Dockerfile | grep "ARG VAULT_VERSION" | cut -d "=" -f2)
    ./scripts/build.sh
    printf '{"version":"%s"}' "$COMMIT_HASH" > ./web-vault/vw-version.json

    mv ./web-vault /web-vault
fi
