#!/bin/bash
# Claude Code bridge script for AI Controller
# Usage: claude-bridge.sh "system prompt" "user message"

SYSTEM_PROMPT="$1"
USER_MESSAGE="$2"

exec /usr/bin/claude --print --system-prompt "$SYSTEM_PROMPT" "$USER_MESSAGE"
