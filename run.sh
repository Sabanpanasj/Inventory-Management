#!/bin/bash
# Starts the whole app (API + frontend) on http://localhost:5000. No internet needed.
cd "$(dirname "$0")/backend" || exit 1

command -v python3 >/dev/null || { echo "❌ Python 3 is required"; exit 1; }

if ! python3 -c "import flask, flask_sqlalchemy, flask_cors, dotenv" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    if [ -d ../wheels ]; then
        pip3 install --no-index --find-links ../wheels -r requirements.txt || exit 1   # offline install
    else
        pip3 install -r requirements.txt || exit 1
    fi
fi

[ -f ../frontend/vendor/chart.umd.min.js ] || echo "⚠️  Charts/icons not installed yet. Run 'python3 frontend/vendor.py' once while online."

python3 run.py
