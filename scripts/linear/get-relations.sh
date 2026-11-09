#!/bin/bash
set -e

source "$(dirname "$0")/_common.sh"

require_linear
require_jq
require_api_key

ISSUE_ID=$1

if [ -z "$ISSUE_ID" ]; then
    echo "Usage: $0 <ISSUE_ID>"
    exit 1
fi

ISSUE_DATA=$(linear issue view "$ISSUE_ID" --json 2>&1)

if [ $? -ne 0 ]; then
    echo "[]"
    exit 0
fi

echo "$ISSUE_DATA" | jq '.relations // []'
