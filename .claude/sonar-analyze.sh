#!/bin/bash
if ! command -v sonar &> /dev/null; then
  exit 0
fi
# Only run if there are uncommitted changes (staged or unstaged)
if git diff --quiet && git diff --cached --quiet; then
  exit 0
fi
# Run agentic analysis; --force skips the >50-file confirmation prompt
FINDINGS=$(sonar analyze agentic --format json --force 2>/dev/null)
if [ -z "$FINDINGS" ]; then
  exit 0
fi
if ! command -v jq &> /dev/null; then
  exit 0
fi
COUNT=$(echo "$FINDINGS" | jq '[.[] | select(.severity == "BLOCKER" or .severity == "CRITICAL")] | length' 2>/dev/null)
if [ -z "$COUNT" ] || [ "$COUNT" = "0" ]; then
  exit 0
fi
SUMMARY=$(echo "$FINDINGS" | jq -r '[.[] | select(.severity == "BLOCKER" or .severity == "CRITICAL")] | map("[\(.severity)] \(.component // .file // "?"):\(.line // "?") — \(.message)") | join("\n")' 2>/dev/null)
jq -n \
  --arg count "$COUNT" \
  --arg summary "$SUMMARY" \
  '{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":("SonarCloud found " + $count + " BLOCKER/CRITICAL issue(s) in your changes — fix these before completing the task:\n" + $summary)}}'
