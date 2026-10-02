# -*- mode: python ; coding: utf-8 -*-
# Build:  cd backend && pyinstaller InventoryManager.spec
import os

frontend = os.path.abspath(os.path.join(SPECPATH, '..', 'frontend'))

a = Analysis(
    ['run.py'],
    pathex=[SPECPATH],
    datas=[(frontend, 'frontend')],
    hiddenimports=['flask_cors', 'flask_sqlalchemy', 'dotenv', 'sqlalchemy.dialects.sqlite'],
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz, a.scripts, a.binaries, a.datas, [],
    name='InventoryManager',
    console=True,   # keeps a window open so users can see the address and close the app
    upx=False,
)
