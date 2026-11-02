"""Turboprop parts drawn in the Floggy art style, in the E175 art's pixel coordinates (y offset TOP for headroom)."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
import math
TOP = 96
K = 1.22   # stretch along x: longer, slimmer-looking fuselage
OUT = '#2b3a55'
AX = (0.994, -0.105)  # fuselage axis (tail -> nose)
def P(*pts): return ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)
def along(p, d): return (p[0] + AX[0] * d, p[1] + AX[1] * d)
def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
defs = '''<defs>
<linearGradient id="wingU" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f7f8"/><stop offset="1" stop-color="#d9dee4"/></linearGradient>
<linearGradient id="nac" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eef0f2"/><stop offset="1" stop-color="#c9d0d8"/></linearGradient>
<linearGradient id="blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3567b0"/><stop offset="1" stop-color="#21508f"/></linearGradient>
<radialGradient id="disc" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#4b5563" stop-opacity=".55"/><stop offset=".85" stop-color="#6f7b8a" stop-opacity=".38"/><stop offset="1" stop-color="#8b96a3" stop-opacity="0"/></radialGradient>
<linearGradient id="spin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4150"/><stop offset=".5" stop-color="#1b1f27"/><stop offset="1" stop-color="#0e1116"/></linearGradient>
<filter id="blur"><feGaussianBlur stdDeviation="1.1"/></filter>
</defs>'''

# ---- wing (high, near half up-and-aft; far half down-and-forward)
rLE, rTE = (505, 68), (447, 81)
nV = (-262, -108)         # near half span vector (to the nacelle kink: 29%, then dihedral)
fV = (232, 132)           # far half span vector
DIH = 28                  # outboard dihedral lift at the tip (px)
KINK = 0.29
nLE, nTE = (rLE[0] + nV[0], rLE[1] + nV[1] - DIH), (rLE[0] + nV[0] - 30, rLE[1] + nV[1] + 6 - DIH)
fLE, fTE = (rLE[0] + fV[0], rLE[1] + fV[1] - DIH * 0.8), (rLE[0] + fV[0] - 26, rLE[1] + fV[1] + 6 - DIH * 0.8)
def wing(LE, TE, tLE, tTE, boot=True):
    dl = DIH * (0.8 if tLE[1] > LE[1] else 1.0)
    kLE = lerp(LE, (tLE[0], tLE[1] + dl), KINK); kTE = lerp(TE, (tTE[0], tTE[1] + dl), KINK)
    s = f'<polygon points="{P(LE, kLE, tLE, tTE, kTE, TE)}" fill="url(#wingU)" stroke="{OUT}" stroke-width="1.1" stroke-linejoin="round"/>'
    if boot:
        b1, bk, b2 = lerp(LE, TE, 0.1), lerp(kLE, kTE, 0.11), lerp(tLE, tTE, 0.12)
        s += f'<polygon points="{P(LE, kLE, tLE, b2, bk, b1)}" fill="#59606b" opacity=".85"/>'
        s += f'<line x1="{lerp(LE,TE,.72)[0]:.1f}" y1="{lerp(LE,TE,.72)[1]:.1f}" x2="{lerp(tLE,tTE,.7)[0]:.1f}" y2="{lerp(tLE,tTE,.7)[1]:.1f}" stroke="#b8c0ca" stroke-width=".8"/>'
    # blue tip cap
    c1, c2 = lerp(LE, tLE, 0.95), lerp(TE, tTE, 0.95)
    s += f'<polygon points="{P(c1, tLE, tTE, c2)}" fill="url(#blue)" stroke="{OUT}" stroke-width="1" stroke-linejoin="round"/>'
    return s

# ---- nacelle (near), hanging under the wing at ~29% span
def nacelle(t, scale=1.0, intake=True):
    le = lerp(rLE, (rLE[0] + nV[0], rLE[1] + nV[1]), t)  # kink sits at the nacelle
    front = along((le[0], le[1] + 9 * scale), 44 * scale)      # spinner base centre
    L = 172 * scale; R = 14 * scale
    # body outline built in nacelle-local coords (u along axis back from front, v down)
    def pt(u, v): return (front[0] - AX[0] * u - AX[1] * v * -1 * 0 + (-AX[1]) * v * 0 + 0, 0)
    nx, ny = -AX[0], -AX[1]          # aft direction
    px, py = -AX[1], AX[0]           # 'down' normal (perpendicular, pointing down)
    if py < 0: px, py = -px, -py
    def W(u, v): return (front[0] + nx * u + px * v, front[1] + ny * u + py * v)
    top = [W(u, -r) for u, r in [(0, 9 * scale), (6 * scale, 12.5 * scale), (20 * scale, 14 * scale), (70 * scale, 14.5 * scale), (120 * scale, 12 * scale), (L, 2.5 * scale)]]
    bot = [W(u, r) for u, r in [(L, 3 * scale), (130 * scale, 13 * scale), (90 * scale, 18.5 * scale), (40 * scale, 17 * scale), (12 * scale, 14 * scale), (0, 9 * scale)]]
    def smooth(pts):
        d = f'M{pts[0][0]:.1f},{pts[0][1]:.1f}'
        for i in range(1, len(pts)):
            p0 = pts[i - 2] if i > 1 else pts[0]; p1 = pts[i - 1]; p2 = pts[i]; p3 = pts[i + 1] if i + 1 < len(pts) else pts[i]
            c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6); c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
            d += f' C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}'
        return d
    s = f'<path d="{smooth(top)} L{bot[0][0]:.1f},{bot[0][1]:.1f} {smooth(bot)[1:].split(" ",1)[1] if False else ""}" fill="none"/>'
    body = smooth(top + bot) + ' Z'
    s = f'<path d="{body}" fill="url(#nac)" stroke="{OUT}" stroke-width="1.1" stroke-linejoin="round"/>'
    # exhaust stub + panel line
    e = W(66 * scale, -2 * scale)
    s += f'<ellipse cx="{e[0]:.1f}" cy="{e[1]:.1f}" rx="{5*scale:.1f}" ry="{2.6*scale:.1f}" fill="#4a515c" transform="rotate(-6 {e[0]:.1f} {e[1]:.1f})"/>'
    a, b = W(30 * scale, -14 * scale), W(30 * scale, 17 * scale)
    s += f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="#c3cad3" stroke-width=".8"/>'
    if intake:  # chin intake scoop
        ip = [W(u, v) for u, v in [(3 * scale, 11 * scale), (2 * scale, 19 * scale), (12 * scale, 22 * scale), (34 * scale, 19 * scale), (40 * scale, 15 * scale)]]
        s += f'<path d="{smooth(ip)} Z" fill="url(#nac)" stroke="{OUT}" stroke-width="1" stroke-linejoin="round"/>'
        m = W(3.2 * scale, 15.5 * scale)
        s += f'<ellipse cx="{m[0]:.1f}" cy="{m[1]:.1f}" rx="{2.2*scale:.1f}" ry="{4.2*scale:.1f}" fill="#11141a" transform="rotate(-6 {m[0]:.1f} {m[1]:.1f})"/>'
    # spinner
    sp = [W(0, -9 * scale), W(-10 * scale, -4 * scale), W(-15 * scale, 0), W(-10 * scale, 4 * scale), W(0, 9 * scale)]
    s += f'<path d="{smooth(sp)} Z" fill="url(#spin)" stroke="#0b0d11" stroke-width=".8"/>'
    # prop disc + blurred blades
    c = W(-3 * scale, 0); Rr = 62 * scale
    s += f'<ellipse cx="{c[0]:.1f}" cy="{c[1]:.1f}" rx="{30*scale:.1f}" ry="{Rr:.1f}" fill="url(#disc)" stroke="#6f7b8a" stroke-width=".6" stroke-opacity=".5" transform="rotate(-8 {c[0]:.1f} {c[1]:.1f})"/>'
    bl = ''
    for k in range(6):
        ang = math.radians(25 + k * 60); dx, dy = 30 * scale * math.sin(ang), -Rr * math.cos(ang)
        bl += f'<path d="M{c[0]:.1f},{c[1]:.1f} L{c[0]+dx*0.98:.1f},{c[1]+dy*0.98:.1f}" stroke="#1d222b" stroke-width="{5.6*scale:.1f}" stroke-linecap="round" opacity="{0.8 if k%2==0 else 0.55}"/>'
    s += f'<g filter="url(#blur)" transform="rotate(-8 {c[0]:.1f} {c[1]:.1f})">{bl}</g>'
    return s

# ---- T-tail
finLE, finTE = (152, -12.8), (127, -6.0)
sNV, sFV = (nV[0] * 0.3, nV[1] * 0.3), (fV[0] * 0.3, fV[1] * 0.3)   # parallel to the wing, ~30% of its span
def stab(V, k=1.0):
    tLE = (finLE[0] + V[0], finLE[1] + V[1]); tTE = (tLE[0] - 16 * k, tLE[1] + 5 * k)
    s = f'<polygon points="{P(finLE, tLE, tTE, finTE)}" fill="url(#wingU)" stroke="{OUT}" stroke-width="1.1" stroke-linejoin="round"/>'
    b1, b2 = lerp(finLE, finTE, 0.12), lerp(tLE, tTE, 0.14)
    s += f'<polygon points="{P(finLE, tLE, b2, b1)}" fill="#59606b" opacity=".8"/>'
    return s
def bullet():
    a, b = (118, 19.5 - 49), (186, 12.4 - 49)
    nx, ny = 0.105, 0.994
    pts = f'M{a[0]:.1f},{a[1]:.1f} C{a[0]+8:.1f},{a[1]-6:.1f} {a[0]+30:.1f},{a[1]-8:.1f} {150:.1f},{-39.8:.1f} C{170:.1f},{-41.4:.1f} {b[0]-4:.1f},{b[1]-2:.1f} {b[0]:.1f},{b[1]:.1f} C{b[0]-4:.1f},{b[1]+3:.1f} {170:.1f},{-29.5:.1f} {150:.1f},{-28.5:.1f} C{a[0]+30:.1f},{-27.0:.1f} {a[0]+8:.1f},{a[1]+4:.1f} {a[0]:.1f},{a[1]:.1f} Z'
    return f'<g transform="translate(0,26)"><path d="{pts}" fill="url(#blue)" stroke="{OUT}" stroke-width="1.1"/></g>'
def strake(x, y, k=1.0, op=1.0):
    return f'<polygon points="{P((x, y), (x - 26*k, y - 7*k), (x - 24*k, y + 4*k))}" fill="url(#blue)" stroke="{OUT}" stroke-width="1" stroke-linejoin="round" opacity="{op}"/>'

def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{760*K:.0f}" height="{261+TOP}" viewBox="0 {-TOP} {760*K:.0f} {261+TOP}">{defs}<g transform="scale({K},1)">{body}</g></svg>'
fairing = f'<path d="M414,90.5 C428,84 440,75 458,71 C478,66.5 500,61 520,59.5 C532,58.6 542,58.5 552,58.6 L552,72 L414,96 Z" fill="url(#nac)"/>' + f'<path d="M414,90.5 C428,84 440,75 458,71 C478,66.5 500,61 520,59.5 C532,58.6 542,58.5 552,58.6" fill="none" stroke="{OUT}" stroke-width="1.1"/>'
back = wing(rLE, rTE, fLE, fTE) + wing(rLE, rTE, nLE, nTE) + fairing + stab(sFV, 0.9) + strake(238, 187, 0.75, 0.9)
fillet = f'<path d="M229,99 C248,104 274,107.5 316,108.5 L242,124 Z" fill="url(#blue)"/><path d="M229,99 C248,104 274,107.5 316,108.5" fill="none" stroke="{OUT}" stroke-width="1"/>'
front = fillet + nacelle(0.29) + stab(sNV) + bullet() + strake(232, 189, 0.8)
open('back.svg', 'w').write(svg(back)); open('front.svg', 'w').write(svg(front))
