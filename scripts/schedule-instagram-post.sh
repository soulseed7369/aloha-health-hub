#!/usr/bin/env bash
set -euo pipefail

PLIST_DIR="$HOME/Library/LaunchAgents"
mkdir -p "$PLIST_DIR"

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 --label LABEL --datetime 'YYYY-MM-DD HH:MM' --command '...'
       $0 --list
       $0 --remove LABEL" >&2
  exit 1
fi

ACTION="create"
LABEL=""
DATETIME=""
COMMAND=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --label) LABEL="$2"; shift 2 ;;
    --datetime) DATETIME="$2"; shift 2 ;;
    --command) COMMAND="$2"; shift 2 ;;
    --list) ACTION="list"; shift ;;
    --remove) ACTION="remove"; LABEL="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ "$ACTION" == "list" ]]; then
  ls "$PLIST_DIR" | grep '^hw\.' || true
  exit 0
fi

if [[ "$ACTION" == "remove" ]]; then
  PLIST="$PLIST_DIR/$LABEL.plist"
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Removed $LABEL"
  exit 0
fi

if [[ -z "$LABEL" || -z "$DATETIME" || -z "$COMMAND" ]]; then
  echo "Missing required args" >&2
  exit 1
fi

YEAR=$(date -j -f "%Y-%m-%d %H:%M" "$DATETIME" "+%Y")
MONTH=$(date -j -f "%Y-%m-%d %H:%M" "$DATETIME" "+%m")
DAY=$(date -j -f "%Y-%m-%d %H:%M" "$DATETIME" "+%d")
HOUR=$(date -j -f "%Y-%m-%d %H:%M" "$DATETIME" "+%H")
MINUTE=$(date -j -f "%Y-%m-%d %H:%M" "$DATETIME" "+%M")

PLIST="$PLIST_DIR/$LABEL.plist"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>$COMMAND</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Year</key><integer>$YEAR</integer>
    <key>Month</key><integer>$MONTH</integer>
    <key>Day</key><integer>$DAY</integer>
    <key>Hour</key><integer>$HOUR</integer>
    <key>Minute</key><integer>$MINUTE</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>/tmp/$LABEL.out.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/$LABEL.err.log</string>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "Scheduled $LABEL for $DATETIME"
echo "$PLIST"
