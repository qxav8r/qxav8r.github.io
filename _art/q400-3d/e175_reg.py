import sys
from PIL import Image, ImageDraw, ImageFont
def add_reg(src, reg, out, x=214, y=152, size=12, ang=6.5):
    im = Image.open(src).convert('RGBA')
    S = 4
    try: f = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', size * S)
    except Exception: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', size * S)
    w, h = f.getbbox(reg)[2] + 8, f.getbbox(reg)[3] + 8
    t = Image.new('RGBA', (w, h), (0, 0, 0, 0)); ImageDraw.Draw(t).text((4, 2), reg, font=f, fill=(27, 34, 48, 235))
    t = t.rotate(ang, resample=Image.BICUBIC, expand=True); t = t.resize((t.width // S, t.height // S), Image.LANCZOS)
    im.alpha_composite(t, (int(x - t.width / 2), int(y - t.height / 2))); im.save(out, quality=90)
if __name__ == '__main__':
    add_reg(sys.argv[1], sys.argv[2], sys.argv[3], *(float(a) for a in sys.argv[4:]))
