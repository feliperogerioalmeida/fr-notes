#!/bin/bash
set -e

source "$(dirname "$0")/_common.sh"

require_linear
require_api_key

TITLE=""
DESCRIPTION=""
TEAM=""
PROJECT=""
PRIORITY=""
LABELS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --title) TITLE="$2"; shift 2 ;;
        --description) DESCRIPTION="$2"; shift 2 ;;
        --team) TEAM="$2"; shift 2 ;;
        --project) PROJECT="$2"; shift 2 ;;
        --priority) PRIORITY="$2"; shift 2 ;;
        --labels) LABELS="$2"; shift 2 ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

if [ -z "$TITLE" ] || [ -z "$TEAM" ]; then
    echo "Usage: $0 --title <TITLE> --team <TEAM> [OPTIONS]"
    echo ""
    echo "  --title        Issue title (required)"
    echo "  --description  Issue description"
    echo "  --team         Team key, e.g. PSN (required)"
    echo "  --project      Project name to link"
    echo "  --priority     1=urgent, 2=high, 3=medium, 4=low"
    echo "  --labels       Comma-separated label names"
    exit 1
fi

CMD=(linear issue create --title "$TITLE" --team "$TEAM")

if [ -n "$DESCRIPTION" ]; then
    CMD+=(--description "$DESCRIPTION")
fi

if [ -n "$PRIORITY" ]; then
    CMD+=(--priority "$PRIORITY")
fi

if [ -n "$LABELS" ]; then
    CMD+=(--label "$LABELS")
fi

RESULT=$("${CMD[@]}" 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to create issue${NC}"
    echo "$RESULT"
    exit 1
fi

ISSUE_ID=$(echo "$RESULT" | grep -oE '[A-Z]+-[0-9]+' | head -1)

if [ -n "$PROJECT" ] && [ -n "$ISSUE_ID" ]; then
    PROJECT_RESULT=$(linear issue update "$ISSUE_ID" --project "$PROJECT" 2>&1)
    if [ $? -ne 0 ]; then
        echo -e "${RED}Warning: Issue created but failed to link to project '$PROJECT'${NC}"
        echo "$PROJECT_RESULT"
    fi
fi

echo -e "${GREEN}Issue created: $ISSUE_ID - $TITLE${NC}"

if [ -n "$PROJECT" ]; then
    echo "Linked to project: $PROJECT"
fi

if [ -n "$ISSUE_ID" ]; then
    echo "$ISSUE_ID"
fi
