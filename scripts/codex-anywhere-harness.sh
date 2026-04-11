#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

usage() {
  cat <<'EOF'
Usage: ./scripts/codex-anywhere-harness.sh <start|restart|ensure|status|logs>
EOF
}

command_name="${1:-}"
case "$command_name" in
  start)
    exec "$SCRIPT_DIR/start-tmux.sh"
    ;;
  restart)
    exec "$SCRIPT_DIR/restart-tmux.sh"
    ;;
  ensure)
    exec "$SCRIPT_DIR/ensure-tmux.sh"
    ;;
  status)
    exec "$SCRIPT_DIR/status-tmux.sh"
    ;;
  logs)
    exec "$SCRIPT_DIR/logs-tmux.sh"
    ;;
  *)
    usage
    exit 1
    ;;
esac
