"""Taller Q400-style fin: scale the fin up from its slanted root line; put the plane on a canvas with headroom."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
from PIL import Image
TOP = 96; S = 1.15
base = Image.open('base.png').convert('RGBA'); W, H = base.size
tall = Image.new('RGBA', (W, H + TOP), (0, 0, 0, 0)); tall.paste(base, (0, TOP))
a0, bs = 214.95 + TOP, -0.35            # fin root line y = a0 + bs*x (in tall coords)
P = tall.load(); fin = Image.new('RGBA', tall.size, (0, 0, 0, 0)); F = fin.load()
for x in range(100, 292):
    for y in range(0, H + TOP):
        if y < a0 + bs * x - 2 and P[x, y][3] > 0: F[x, y] = P[x, y]; P[x, y] = (0, 0, 0, 0)
# y_out = base + S*(y_in - base)  ->  y_in = (y_out - (1-S)*(a0 + bs*x)) / S
big = fin.transform(fin.size, Image.AFFINE, (1, 0, 0, -(1 - S) * bs / S, 1 / S, -(1 - S) * a0 / S), resample=Image.BICUBIC)
tall = Image.alpha_composite(tall, big); tall.save('base_tall.png')
f = lambda x, y: (x, (a0 + bs * x) + S * (y + TOP - (a0 + bs * x)) - TOP)   # map an original point to new (original-y units)
print('finLE', f(152, 10), 'finTE', f(127, 17), 'LE30', f(230, 103))
