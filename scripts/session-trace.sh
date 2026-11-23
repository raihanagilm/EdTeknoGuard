#!/usr/bin/env bash
# scripts/session-trace.sh — Record structured JSONL events per session
set -euo pipefail
EVENT_TYPE="${1:-session_event}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "2026-11-20T17:00:00Z")
mkdir -p .harness/traces
echo "{\"timestamp\": \"$TIMESTAMP\", \"event\": \"$EVENT_TYPE\"}" >> .harness/traces/traces.jsonl
echo "Trace recorded: $EVENT_TYPE"
exit 0
