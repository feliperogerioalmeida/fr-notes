#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -f "$ROOT_DIR/.env" ]; then
    export $(cat "$ROOT_DIR/.env" | grep -v '^#' | xargs)
elif [ -f "$ROOT_DIR/.env.local" ]; then
    export $(cat "$ROOT_DIR/.env.local" | grep -v '^#' | xargs)
fi

require_linear() {
    if ! command -v linear &> /dev/null; then
        echo -e "${RED}Error: Linear CLI not installed${NC}"
        echo "Install: brew install schpet/tap/linear"
        exit 1
    fi
}

require_jq() {
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq not installed${NC}"
        echo "Install: brew install jq"
        exit 1
    fi
}

require_api_key() {
    if [ -z "$LINEAR_API_KEY" ]; then
        echo -e "${RED}Error: LINEAR_API_KEY not set${NC}"
        echo "Get key from: https://linear.app/settings/api"
        echo "Add to .env: LINEAR_API_KEY='your_key'"
        exit 1
    fi
}

