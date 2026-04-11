#!/bin/sh
set -eu

. "$(dirname -- "$0")/tmux-common.sh"

require_tmux

if session_exists; then
  prune_extra_windows_and_panes
  if session_is_ready; then
    echo "tmux session '$SESSION_NAME' is already running and ready."
    print_session_help
    exit 0
  fi
  echo "tmux session '$SESSION_NAME' exists but is not ready; recreating it."
  kill_session_if_exists
fi

create_session
wait_for_ready
stabilize_session_shape

echo "Codex Anywhere is running in tmux session '$SESSION_NAME'."
print_session_help
