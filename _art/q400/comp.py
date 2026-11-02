import os
HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
import sys
from playwright.sync_api import sync_playwright
from PIL import Image
D = HERE + '/'
TOP = 96; S = 3; K = 1.22
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': round(760 * K), 'height': 261 + TOP}, device_scale_factor=S)
    for n in ('back', 'front'):
        pg.goto('file://' + D + n + '.svg'); pg.screenshot(path=D + n + '.png', omit_background=True)
    b.close()
base = Image.open(D + 'base_tall.png').convert('RGBA').resize((round(760 * K) * S, (261 + TOP) * S), Image.LANCZOS)
canvas = Image.open(D + 'back.png').convert('RGBA')
lay = Image.new('RGBA', canvas.size, (0, 0, 0, 0)); lay.paste(base, (0, 0)); canvas = Image.alpha_composite(canvas, lay)
canvas = Image.alpha_composite(canvas, Image.open(D + 'front.png').convert('RGBA'))
c = canvas.crop(canvas.getbbox())
W, H = 760, 261; s = min((W - 10) / c.width, (H - 6) / c.height)
c2 = c.resize((round(c.width * s), round(c.height * s)), Image.LANCZOS)
out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out.paste(c2, ((W - c2.width) // 2, (H - c2.height) // 2), c2)
out.save(D + 'plane-q400-blue.webp', quality=92); out.save(D + 'tp.png')
e = Image.open(os.path.join(HERE, '../../img/plane-blue.webp')).convert('RGBA')
pv = Image.new('RGBA', (760, 261 * 2 + 10), (255, 255, 255, 255)); pv.paste(e, (0, 0), e); pv.paste(out, (0, 271), out); pv.convert('RGB').save(D + 'tp_cmp.jpg', quality=92)
big = Image.new('RGBA', c.size, (200, 220, 240, 255)); big.paste(c, (0, 0), c); big.convert('RGB').save(D + 'tp_big.jpg', quality=90)
