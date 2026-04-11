#!/bin/sh
set -eu

. "$(dirname -- "$0")/tmux-common.sh"

require_tmux
resolve_codex_anywhere_home

echo "session: $SESSION_NAME"
echo "workspace: $WORKDIR"
echo "storage-root: $CODEX_ANYWHERE_HOME_VALUE"
echo "storage-mode: $CODEX_ANYWHERE_HOME_MODE"
echo "config-path: $(config_path_for_root "$CODEX_ANYWHERE_HOME_VALUE")"
echo "state-path: $(state_path_for_root "$CODEX_ANYWHERE_HOME_VALUE")"
restorable_state_status

if ! session_exists; then
  echo "tmux-session: absent"
  exit 0
fi

echo "tmux-session: present"
echo "window-target: $(session_target)"
echo "primary-pane-target: $(primary_pane_target)"
echo "primary-command: $(current_primary_command)"
echo "ready: $(session_is_ready && echo yes || echo no)"
echo "pane-shape:"
tmux list-panes -t "$SESSION_NAME:0" -F '  pane=#{pane_index} active=#{pane_active} dead=#{pane_dead} cmd=#{pane_current_command}'
