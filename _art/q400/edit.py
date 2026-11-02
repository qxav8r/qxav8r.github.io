import os
HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
from PIL import Image, ImageDraw
im = Image.open(os.path.join(HERE, '../../img/plane-blue.webp')).convert('RGBA')
W, H = im.size; P = im.load()
def gold(x):
    g = [y for y in range(100, 230) if P[x, y][3] > 200 and P[x, y][0] > 190 and P[x, y][1] > 140 and P[x, y][2] < 120]; return g[0]
def bottom(x, start):
    y = start
    while P[x, y][3] > 128: y += 1
    return y - 1
XA, XB = 268, 462
gA, gB = gold(XA), gold(XB); bA, bB = bottom(XA, gA), bottom(XB, gB)
print('A', XA, gA, bA, 'B', XB, gB, bB)
out = im.copy(); O = out.load()
def samp(x, y):
    y0 = int(y); f = y - y0; a = P[x, min(y0, H - 1)]; b = P[x, min(y0 + 1, H - 1)]
    return [a[i] * (1 - f) + b[i] * f for i in range(4)]
for x in range(XA + 1, XB):
    t = (x - XA) / (XB - XA); s = t * t * (3 - 2 * t) * 0.35 + t * 0.65
    g = gA + (gB - gA) * s; b = bA + (bB - bA) * s
    for y in range(int(g - 14), H):
        def m(gs, bs):  # map dest y -> source y in a reference column
            if y <= g: return gs - (g - y)
            if y <= b: return gs + (y - g) * (bs - gs) / (b - g)
            return bs + (y - b)
        ca = samp(XA, m(gA, bA)); cb = samp(XB, m(gB, bB))
        c = [ca[i] * (1 - t) + cb[i] * t for i in range(4)]
        if y < g - 10:  # feather into the original above
            k = (g - 10 - y) / 4; o = O[x, y]; c = [c[i] * (1 - k) + o[i] * k for i in range(4)]
        O[x, y] = tuple(int(round(v)) for v in c)
# erase what hangs below the belly aft of the rebuilt stretch (near wing, old stabilizer), and the far winglet
BOT = [(150, 165), (157, 165), (168, 167.5), (182, 170), (192, 173.5), (200, 177), (225, 187), (250, 190), (268, bA)]
def bot(x):
    for (x0, y0), (x1, y1) in zip(BOT, BOT[1:]):
        if x0 <= x <= x1: return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
for x in range(W):
    for y in range(H):
        b = bot(x) if 150 <= x <= XA else None
        if (x < 150 and y > 75) or (b is not None and y > b + 1) or (535 <= x <= 562 and y < 60 - (x - 540) * 0.25 - 1) or (XA < x < XB and y > bA + (bB - bA) * ((x - XA) / (XB - XA)) + 1.5):
            O[x, y] = (0, 0, 0, 0)
out.save('base.png')
bg = Image.new('RGBA', out.size, (200, 220, 240, 255)); bg.paste(out, (0, 0), out); bg.resize((W * 2, H * 2), Image.LANCZOS).save('base_v.png')
