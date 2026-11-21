#!/bin/zsh
# Usage: board.sh <Board> <out.json> [rootSelector] — renders a board headlessly and dumps its inventory.
S=${AUDIT_DIR:-$(pwd)/.audit}
pkill -f "remote-debugging-port=9333" 2>/dev/null; sleep 0.5
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --window-size=1300,820 --remote-debugging-port=9333 --user-data-dir=/tmp/claude-501/chrome-probe --no-first-run "file://$S/boards/$1.dc.html" >/dev/null 2>&1 &
until curl -s http://127.0.0.1:9333/json >/dev/null 2>&1; do sleep 0.3; done; sleep 6
node $(dirname $0)/probe.mjs 9333 "$1.dc.html" "${3:-.ss}" "$2"
pkill -f "remote-debugging-port=9333"
