import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# True when running as the packaged (PyInstaller) download
FROZEN = getattr(sys, 'frozen', False)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
# Where bundled read-only files (the frontend) live
RESOURCE_DIR = getattr(sys, '_MEIPASS', None) or os.path.join(BASE_DIR, '..')
FRONTEND_DIR = os.path.abspath(os.path.join(RESOURCE_DIR, 'frontend'))


def _user_data_dir():
    """Per-user folder for the database, so updating/re-downloading the app never wipes data."""
    home = Path.home()
    if sys.platform.startswith('win'):
        root = Path(os.environ.get('APPDATA', home / 'AppData' / 'Roaming'))
    elif sys.platform == 'darwin':
        root = home / 'Library' / 'Application Support'
    else:
        root = Path(os.environ.get('XDG_DATA_HOME', home / '.local' / 'share'))
    path = root / 'InventoryManager'
    path.mkdir(parents=True, exist_ok=True)
    return str(path)


# Dev: database next to the code. Packaged app: in the user's data folder.
DATA_DIR = _user_data_dir() if FROZEN else BASE_DIR

load_dotenv(os.path.join(DATA_DIR, '.env'))


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + Path(DATA_DIR, 'inventory.db').as_posix()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
