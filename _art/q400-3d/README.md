# Floggy Q400 (3D, final)

Not published: Jekyll skips folders that start with `_`.

The turboprop partner to the Floggy E175 art. It's built the same way as the E175: a three.js model in Floggy's cartoon style. The style has three-step shading, navy outlines (OutlineEffect), and a painted livery. The lettering is Fredoka, and the face is an eye in the windshield, a smile under the nose, and blush.

## Geometry

Built to Q400 dimensions:
- **Fuselage:** 32.8 m long, with a straight top and the belly sweeping up over the last fifth.
- **Wing:** high, on a turtle-deck fairing, with dihedral outboard of the nacelles and black de-ice boots.
- **Nacelles:** straight underside, chin inlet, black spinners, six-blade props.
- **Tail:** the jet-style swept trapezoid fin (to match the E175) with the F centered, plus a T-tail with a bullet and a dorsal fillet.

## Files

- `out/plane-q400-<color>.webp`: 760x261 transparent images, one per E175 color: blue, green, orange, pink, purple, red, teal, yellow.
- `preview-set.jpg`: the E175 and Q400 sets side by side.

## Render settings

Final pose: `cam=ref&roll=14&pitch=5&yaw=18&ts=9.2&fov=34`.

Livery colors:

| Color | `liv` |
|---|---|
| blue | `#3366B8` |
| green | `#3E8E4B` |
| orange | `#B45D2F` |
| pink | `#AD3C78` |
| purple | `#7835A0` |
| red | `#AD2F35` |
| teal | `#2F9399` |
| yellow | `#F2CC45` |

Other knobs, as URL parameters:
- `ts`, `ty`: title position.
- `es`, `ef`: eye position.
- `ms`, `mw`, `mc`: smile position, width and curve.
- `irot`, `io`: inlet swing and offset.
- `ad`: aft door station.
- `win=0`: no passenger windows.
- `face=0`: no face.

## Not done yet

- Putting the Q400 into the site's plane rotation. Decide which pages first.
- The Metroliner, built the same way.

The earlier flat 2D attempt is in `../q400/`.
