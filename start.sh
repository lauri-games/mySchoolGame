#!/bin/bash

# Start script for MySchoolGame
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR" || exit

# Always use port 8000. If occupied, attempt graceful stop then force-kill.
PORT=8000

echo "Preparing to start HTTP server in $ROOT_DIR on port $PORT"

# Try to find a PID listening on the port. Prefer lsof, fallback to ps/grep.
PID=""
if command -v lsof >/dev/null 2>&1; then
	PID=$(lsof -ti TCP:$PORT 2>/dev/null || true)
fi
if [ -z "$PID" ]; then
	PID=$(ps -eo pid,cmd | grep '[h]ttp.server' | grep ":$PORT" | awk '{print $1}' || true)
fi

if [ -n "$PID" ]; then
	echo "Port $PORT ist belegt (PID $PID). Versuche Prozess zu beenden..."
	kill "$PID" 2>/dev/null || true
	# Warten bis Prozess beendet ist (max. 5s)
	for i in 1 2 3 4 5; do
		if ps -p "$PID" >/dev/null 2>&1; then
			sleep 1
		else
			break
		fi
	done
	if ps -p "$PID" >/dev/null 2>&1; then
		echo "Prozess reagiert nicht — sende SIGKILL an PID $PID"
		kill -9 "$PID" 2>/dev/null || true
		sleep 1
	fi
fi

echo "Starte HTTP-Server auf Port $PORT"
python3 -m http.server "$PORT"
