#!/bin/sh
set -eu

. "$(dirname -- "$0")/tmux-common.sh"

TAIL_LINES="${CODEX_ANYWHERE_TMUX_TAIL_LINES:-60}"

require_tmux

if ! session_exists; then
  echo "tmux session '$SESSION_NAME' is not running."
  exit 1
fi

tmux capture-pane -t "$(primary_pane_target)" -p | tail -n "$TAIL_LINES"
