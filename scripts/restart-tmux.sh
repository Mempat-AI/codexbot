#!/bin/sh
set -eu

. "$(dirname -- "$0")/tmux-common.sh"

require_tmux
kill_session_if_exists
create_session
wait_for_ready
stabilize_session_shape

echo "Restarted Codex Anywhere in tmux session '$SESSION_NAME'."
print_session_help
