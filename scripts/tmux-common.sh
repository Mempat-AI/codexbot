#!/bin/sh
set -eu

SESSION_NAME="${CODEX_ANYWHERE_TMUX_SESSION:-codex-anywhere}"
WINDOW_NAME="${CODEX_ANYWHERE_TMUX_WINDOW:-bot}"
WORKDIR="${CODEX_ANYWHERE_TMUX_WORKDIR:-$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)}"
COMMAND="${CODEX_ANYWHERE_TMUX_COMMAND:-npm run connect}"
READY_PATTERN="${CODEX_ANYWHERE_TMUX_READY_PATTERN:-Codex Anywhere running for workspace:}"
READY_TIMEOUT_SECONDS="${CODEX_ANYWHERE_TMUX_READY_TIMEOUT_SECONDS:-20}"
STABILIZE_SECONDS="${CODEX_ANYWHERE_TMUX_STABILIZE_SECONDS:-4}"
CONFIG_HOME_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}"
PRIMARY_CONFIG_ROOT="${CODEX_ANYWHERE_ROOT:-$CONFIG_HOME_ROOT/codex-anywhere}"
WORKSPACES_ROOT="${CODEX_ANYWHERE_WORKSPACES_ROOT:-$CONFIG_HOME_ROOT/codex-anywhere/workspaces}"
CODEX_ANYWHERE_HOME_VALUE=""
CODEX_ANYWHERE_HOME_MODE=""

workspace_slug() {
  name="$(basename "$WORKDIR")"
  if [ -z "$name" ] || [ "$name" = "/" ]; then
    name="workspace"
  fi
  printf '%s' "$name" | tr -cs 'A-Za-z0-9._-' '-'
}

workspace_hash() {
  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$WORKDIR" | shasum | awk '{print substr($1, 1, 12)}'
    return
  fi
  if command -v sha256sum >/dev/null 2>&1; then
    printf '%s' "$WORKDIR" | sha256sum | awk '{print substr($1, 1, 12)}'
    return
  fi
  printf 'nohash'
}

default_codex_anywhere_home() {
  printf '%s/%s-%s' "$WORKSPACES_ROOT" "$(workspace_slug)" "$(workspace_hash)"
}

shell_quote() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

require_tmux() {
  if ! command -v tmux >/dev/null 2>&1; then
    echo "tmux is not installed."
    exit 1
  fi
}

session_exists() {
  tmux has-session -t "$SESSION_NAME" 2>/dev/null
}

session_target() {
  printf "%s:%s" "$SESSION_NAME" "$WINDOW_NAME"
}

primary_pane_target() {
  printf "%s:%s.0" "$SESSION_NAME" "$WINDOW_NAME"
}

create_session() {
  resolve_codex_anywhere_home
  tmux new-session -d -s "$SESSION_NAME" -n "$WINDOW_NAME" -c "$WORKDIR" "CODEX_ANYWHERE_HOME=$(shell_quote "$CODEX_ANYWHERE_HOME_VALUE") $COMMAND"
}

kill_session_if_exists() {
  if session_exists; then
    tmux kill-session -t "$SESSION_NAME"
  fi
}

prune_extra_windows_and_panes() {
  if ! session_exists; then
    return
  fi

  tmux list-windows -t "$SESSION_NAME" -F '#{window_index}' | while IFS= read -r window_index; do
    if [ "$window_index" != "0" ]; then
      tmux kill-window -t "$SESSION_NAME:$window_index"
    fi
  done

  tmux list-panes -t "$SESSION_NAME:0" -F '#{pane_id}' | awk 'NR>1 {print $0}' | while IFS= read -r pane_id; do
    tmux kill-pane -t "$pane_id"
  done

  tmux rename-window -t "$SESSION_NAME:0" "$WINDOW_NAME"
}

stabilize_session_shape() {
  if ! session_exists; then
    return 1
  fi

  elapsed=0
  while [ "$elapsed" -lt "$STABILIZE_SECONDS" ]; do
    prune_extra_windows_and_panes
    sleep 1
    elapsed=$((elapsed + 1))
  done

  prune_extra_windows_and_panes
}

capture_primary_pane() {
  tmux capture-pane -t "$(primary_pane_target)" -p
}

current_primary_command() {
  tmux display-message -p -t "$(primary_pane_target)" '#{pane_current_command}'
}

wait_for_ready() {
  if [ -z "$READY_PATTERN" ]; then
    return 0
  fi

  elapsed=0
  while [ "$elapsed" -lt "$READY_TIMEOUT_SECONDS" ]; do
    if ! session_exists; then
      echo "tmux session '$SESSION_NAME' disappeared during startup."
      return 1
    fi
    output="$(capture_primary_pane 2>/dev/null || true)"
    if printf '%s' "$output" | grep -Fq "$READY_PATTERN"; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "Timed out waiting for Codex Anywhere to report readiness."
  echo "Last pane output:"
  capture_primary_pane 2>/dev/null | tail -40 || true
  return 1
}

session_is_ready() {
  if ! session_exists; then
    return 1
  fi
  output="$(capture_primary_pane 2>/dev/null || true)"
  printf '%s' "$output" | grep -Fq "$READY_PATTERN"
}

print_session_help() {
  resolve_codex_anywhere_home
  echo "Session: $SESSION_NAME"
  echo "Workspace: $WORKDIR"
  echo "Storage root: $CODEX_ANYWHERE_HOME_VALUE ($CODEX_ANYWHERE_HOME_MODE)"
  restorable_state_status
  echo "Attach with: tmux attach -t $SESSION_NAME"
  echo "Logs with: tmux capture-pane -t $(primary_pane_target) -p | tail -40"
}

restorable_state_status() {
  resolve_codex_anywhere_home
  if root_has_restorable_state "$CODEX_ANYWHERE_HOME_VALUE"; then
    echo "restorable-state: present ($(state_path_for_root "$CODEX_ANYWHERE_HOME_VALUE"))"
  else
    echo "restorable-state: absent ($(state_path_for_root "$CODEX_ANYWHERE_HOME_VALUE"))"
  fi
}

config_path_for_root() {
  printf '%s/config.json' "$1"
}

state_path_for_root() {
  printf '%s/state.json' "$1"
}

root_config_matches_workspace() {
  root="$1"
  node -e '
    const fs = require("node:fs");
    const path = require("node:path");
    const root = process.argv[1];
    const cwd = process.argv[2];
    const configPath = path.join(root, "config.json");
    if (!fs.existsSync(configPath)) process.exit(1);
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      process.exit(config.workspaceCwd === cwd ? 0 : 1);
    } catch {
      process.exit(1);
    }
  ' "$root" "$WORKDIR"
}

root_has_restorable_state() {
  root="$1"
  node -e '
    const fs = require("node:fs");
    const path = require("node:path");
    const statePath = path.join(process.argv[1], "state.json");
    if (!fs.existsSync(statePath)) process.exit(1);
    try {
      const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
      const chats = state && typeof state === "object" ? state.chats : null;
      if (!chats || typeof chats !== "object") process.exit(1);
      const hasThread = Object.values(chats).some((chat) => chat && typeof chat === "object" && chat.threadId);
      process.exit(hasThread ? 0 : 1);
    } catch {
      process.exit(1);
    }
  ' "$root"
}

resolve_codex_anywhere_home() {
  if [ -n "$CODEX_ANYWHERE_HOME_VALUE" ]; then
    return
  fi

  if [ -n "${CODEX_ANYWHERE_HOME:-}" ]; then
    CODEX_ANYWHERE_HOME_VALUE="$CODEX_ANYWHERE_HOME"
    CODEX_ANYWHERE_HOME_MODE="explicit"
    return
  fi

  workspace_root="$(default_codex_anywhere_home)"

  if root_config_matches_workspace "$workspace_root"; then
    CODEX_ANYWHERE_HOME_VALUE="$workspace_root"
    CODEX_ANYWHERE_HOME_MODE="workspace"
    return
  fi

  if root_config_matches_workspace "$PRIMARY_CONFIG_ROOT"; then
    CODEX_ANYWHERE_HOME_VALUE="$PRIMARY_CONFIG_ROOT"
    CODEX_ANYWHERE_HOME_MODE="primary"
    return
  fi

  CODEX_ANYWHERE_HOME_VALUE="$workspace_root"
  CODEX_ANYWHERE_HOME_MODE="workspace-new"
}
