"""Render the Floggy Q400. Run from this folder:
   npm install three@0.160.0          (once; the page imports ./node_modules/three)
   python3 -m http.server 8799 &      (serve this folder)
   python3 render.py name="cam=ref&roll=14&pitch=5&yaw=18&ts=9.2&fov=34&liv=%233366B8"
Writes out_<name>.png (2400x1500, transparent)."""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
jobs = [a.split('=', 1) for a in sys.argv[1:]]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    for name, q in jobs:
        pg = b.new_page(viewport={'width': 2400, 'height': 1500})
        pg.goto(f'http://localhost:8799/index.html?{q}'); pg.wait_for_function('window.__done===true', timeout=180000)
        pg.locator('canvas').screenshot(path=os.path.join(HERE, f'out_{name}.png'), omit_background=True); print(name, 'ok')
    b.close()
