#!/bin/bash
set -e

source "$(dirname "$0")/_common.sh"

require_linear
require_api_key

ISSUE_ID=$1
STATUS=$2

if [ -z "$ISSUE_ID" ] || [ -z "$STATUS" ]; then
    echo "Usage: $0 <ISSUE_ID> <STATUS>"
    echo "Status examples: 'In Progress', 'In Review', 'Done'"
    exit 1
fi

RESULT=$(linear issue update "$ISSUE_ID" --state "$STATUS" 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to update issue $ISSUE_ID to '$STATUS'${NC}"
    echo "$RESULT"
    exit 1
fi

echo -e "${GREEN}Issue $ISSUE_ID moved to '$STATUS'${NC}"
