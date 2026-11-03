import numpy as np
from PIL import Image
src = '/home/claude/qxav8r.github.io/img/plane-yellow.webp'
im = np.array(Image.open(src).convert('RGBA')).astype(np.float32) / 255
rgb, a = im[..., :3], im[..., 3]
mx, mn = rgb.max(-1), rgb.min(-1); d = mx - mn; dd = np.where(d > 1e-6, d, 1)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
h = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) * 60; h = np.where(d > 1e-6, h, 0)
s = np.where(mx > 0, d / np.where(mx > 0, mx, 1), 0); v = mx
H, W = a.shape; yy, xx = np.mgrid[0:H, 0:W]
# regions
fbox = (xx >= 158) & (xx <= 198) & (yy >= 48) & (yy <= 104)
tbox = (xx >= 322) & (xx <= 414) & (yy >= 100) & (yy <= 136)
LX = [150, 210, 300, 400, 480, 550, 640, 715]; LY = [168, 172, 172, 170, 160, 146, 135, 128]
line = np.interp(xx, LX, LY); band = (xx >= 150) & (xx <= 720) & (np.abs(yy - line) <= 5)
blueish = (h >= 190) & (h <= 250) & (s > 0.12)
goldish = (h >= 30) & (h <= 62) & (s > 0.15) & (v < 0.85)
m_f = fbox & blueish; m_t = tbox & goldish
# cheatline: the navy run sitting just above the yellow belly, column by column
belly = (h >= 38) & (h <= 56) & (s > 0.5) & (v > 0.8) & (a > 0.9)
m_l = np.zeros_like(belly)
blue2 = (h >= 185) & (h <= 260) & (s > 0.05) & (v < 0.82)
zone = np.zeros_like(belly)
for x in range(140, 725):
    col = np.where(belly[110:, x])[0]
    if not len(col): continue
    yb = 110 + col[0]; zone[max(yb - 30, 0):yb + 3, x] = True
cand = (blue2 & zone).astype(np.uint8)
import cv2
# keep only horizontally continuous navy (the line), not the short window dashes
core = cv2.morphologyEx(cand, cv2.MORPH_OPEN, np.ones((1, 9), np.uint8))
m_l = (cv2.dilate(core, np.ones((3, 3), np.uint8)) > 0) & (blue2 | blueish) & zone
# target green #2E7D3E: hue 132, keep each pixel's shading relative to its source colour
def recolor(mask, base_v, base_s):
    nh = 132.0; ns = np.clip(s / base_s * 0.63, 0, 0.75); nv = np.clip(v / base_v * 0.49, 0, 1)
    c = nv * ns; x = c * (1 - np.abs((nh / 60) % 2 - 1)); m = nv - c
    out = np.stack([x + m, c + m, m], -1)  # hue 132 sits in the 120-180 sector: (r,g,b) = (0,c,x)+m
    out = np.stack([m, c + m, x + m], -1)
    rgb[mask] = out[mask]
recolor(m_f, 0.45, 0.66); recolor(m_l, 0.45, 0.66); recolor(m_t, 0.55, 0.53)
print('pixels', m_f.sum(), m_l.sum(), m_t.sum())
res = np.dstack([rgb, a]); Image.fromarray((res * 255).round().astype(np.uint8), 'RGBA').save('yellow_green.webp', quality=92)
bg = Image.new('RGBA', (W, H), (15, 30, 58, 255)); bg.alpha_composite(Image.open('yellow_green.webp')); bg.convert('RGB').resize((W * 2, H * 2), Image.LANCZOS).save('yellow_green.jpg', quality=90)
