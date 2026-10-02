import socket
import threading
import webbrowser

from app import app


def find_port(start=5000, tries=20):
    """Use 5000 if free, otherwise the next free port (so a second copy never crashes)."""
    for port in range(start, start + tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    raise RuntimeError('No free port found')


if __name__ == '__main__':
    port = find_port()
    url = f'http://localhost:{port}'
    print("🚀 Inventory Management System")
    print(f"📊 Open: {url}")
    print("Keep this window open while you use the app. Close it (or press Ctrl+C) to stop.")
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    app.run(host='127.0.0.1', port=port, debug=False)
