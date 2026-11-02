# Floggy Q400 art (work in progress)

Not published: Jekyll skips folders that start with `_`.

The Floggy E175 art (`img/plane-blue.webp`) converted to a Q400-style turboprop. Run in order from this folder:

1. `python3 edit.py` removes the jet wing, engine and stabilizer and rebuilds the belly. Writes `base.png`.
2. `python3 finup.py` makes the fin taller (`S`). Adds headroom (`TOP`). Writes `base_tall.png`.
3. `python3 parts.py` draws the high wing, fairing, nacelle, chin intake, prop, T-tail, bullet and strakes as SVG. Writes `back.svg` and `front.svg`. The main settings:
   - `nV`, `fV`: wing span vectors
   - `DIH`: dihedral
   - `K`: fuselage stretch
   - `Rr`: prop radius
4. `python3 comp.py` composites everything. Writes `plane-q400-blue.webp` (760x261, same size as the other plane art) and `preview.jpg`. Needs Python Playwright with Chromium, and Pillow.

To do:
- Decide the fairing size.
- Make the other seven colors (needs a livery color swap).
- Add the art to the site's plane rotation.
- Maybe draw a Metroliner the same way.

`3d-attempt/` holds the earlier realistic three.js model (`real.html`), kept for reference.
