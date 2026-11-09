#!/bin/bash
set -e

source "$(dirname "$0")/_common.sh"

require_linear
require_jq
require_api_key

ISSUE_ID=$1
BRANCH_TYPE=${2:-feature}
VALID_TYPES=("feature" "style" "fix" "hotfix")

if [ -z "$ISSUE_ID" ]; then
    echo "Usage: $0 <ISSUE_ID> [BRANCH_TYPE]"
    echo "Types: ${VALID_TYPES[*]}"
    exit 1
fi

if [[ ! " ${VALID_TYPES[*]} " =~ " ${BRANCH_TYPE} " ]]; then
    echo -e "${RED}Error: Invalid branch type '$BRANCH_TYPE'${NC}"
    echo "Valid types: ${VALID_TYPES[*]}"
    exit 1
fi

echo -e "${YELLOW}Fetching issue $ISSUE_ID from Linear...${NC}"
ISSUE_DATA=$(linear issue view "$ISSUE_ID" --json 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to fetch issue $ISSUE_ID${NC}"
    echo "$ISSUE_DATA"
    exit 1
fi

ISSUE_TITLE=$(echo "$ISSUE_DATA" | jq -r '.title // empty')

translate_to_english() {
    local text="$1"
    local encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$text'))")
    local result=$(curl -s "https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=en&dt=t&q=$encoded")
    local translated=$(echo "$result" | jq -r '.[0][0][0] // empty')

    if [ -n "$translated" ]; then
        echo "$translated"
    else
        echo "$text"
    fi
}

echo -e "${YELLOW}Translating title to English...${NC}"
ISSUE_TITLE=$(translate_to_english "$ISSUE_TITLE")

slugify() {
    echo "$1" \
        | tr '[:upper:]' '[:lower:]' \
        | sed 's/[^a-z0-9]/-/g' \
        | sed 's/--*/-/g' \
        | sed 's/^-//' \
        | sed 's/-$//' \
        | cut -c1-50
}

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${YELLOW}Currently on branch: $CURRENT_BRANCH${NC}"
    echo "Switching to main..."
    git checkout main 2>/dev/null || git checkout master 2>/dev/null
fi

git pull --rebase 2>&1 | grep -v "Already up to date" || true

ISSUE_ID_LOWER=$(echo "$ISSUE_ID" | tr '[:upper:]' '[:lower:]')

SLUG=$(slugify "$ISSUE_TITLE")
BRANCH_NAME="${BRANCH_TYPE}/${ISSUE_ID_LOWER}/${SLUG}"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}Branch $BRANCH_NAME already exists${NC}"
    echo "Switching to existing branch..."
    git checkout "$BRANCH_NAME"
    echo "$BRANCH_NAME"
    exit 0
fi

git checkout -b "$BRANCH_NAME"

echo -e "${GREEN}Created branch: $BRANCH_NAME${NC}"

linear issue update "$ISSUE_ID" --state "In Progress" &>/dev/null \
    && echo -e "${GREEN}Issue $ISSUE_ID moved to 'In Progress'${NC}" \
    || echo -e "${YELLOW}Warning: Could not move issue to 'In Progress'${NC}"

echo "$BRANCH_NAME"
