#!/bin/bash
set -e

source "$(dirname "$0")/_common.sh"

require_linear
require_api_key

if ! linear team list &> /dev/null; then
    echo -e "${RED}Error: Cannot access Linear API${NC}"
    echo "Check your LINEAR_API_KEY is valid"
    exit 1
fi

echo -e "${GREEN}Linear CLI accessible${NC}"
