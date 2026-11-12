"""Export the v6 bottom navigation as standalone SVGs to drag into Figma.

One SVG per app per active tab (390 x 130). The white bar is the bottom 96px; the raised
active circle pokes 34px above it. Place at the bottom of a 390-wide frame: y = frame height - 130.
"""
import os
from common import DUO, NAV_BADGE, NAV_INK, BRANCH_TABS, PROD_TABS, FIN_TABS

FONT = "Urbanist"
W, H = 390, 130
BAR_Y, BAR_H = H - 96, 96


def icon(name, cx, cy, size, stroke):
    f, st = DUO[name]
    sc = size / 24
    return (f'<g transform="translate({cx - size / 2:.1f} {cy - size / 2:.1f}) scale({sc:.4f})" fill="none" stroke="{stroke}" '
            f'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">{st}</g>')


def bar(tabs, active, uid):
    tw = (W - 12) / len(tabs)
    label_y = BAR_Y + 14 + 26 + 7 + 11
    parts = []
    for i, (name, ic_name) in enumerate(tabs):
        cx = 6 + tw * i + tw / 2
        if name == active:
            cy = BAR_Y - 30 + 34
            parts.append(f'<g filter="url(#glow{uid})"><circle cx="{cx:.1f}" cy="{cy}" r="34" fill="#FFFFFF"/></g>')
            parts.append(f'<circle cx="{cx:.1f}" cy="{cy}" r="29" fill="url(#grad{uid})"/>')
            parts.append(icon(ic_name, cx, cy, 28, '#FFFFFF'))
            parts.append(f'<text x="{cx:.1f}" y="{label_y}" text-anchor="middle" font-family="{FONT}" font-size="14" font-weight="700" fill="#F2542D">{name}</text>')
        else:
            cy = BAR_Y + 14 + 13
            parts.append(icon(ic_name, cx, cy, 26, NAV_INK))
            parts.append(f'<text x="{cx:.1f}" y="{label_y}" text-anchor="middle" font-family="{FONT}" font-size="13.5" font-weight="500" fill="{NAV_INK}">{name}</text>')
            if name in NAV_BADGE:
                b = NAV_BADGE[name]
                bw = max(18, 8 + len(b) * 6.5)
                bx, by = cx + 13 + 10 - bw / 2 - 1, cy - 13 - 6
                parts.append(f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bw:.1f}" height="18" rx="9" fill="#6C5CE7" stroke="#FFFFFF" stroke-width="2"/>')
                parts.append(f'<text x="{bx + bw / 2:.1f}" y="{by + 12.6:.1f}" text-anchor="middle" font-family="{FONT}" font-size="10" font-weight="700" fill="#FFFFFF">{b}</text>')
    defs = (f'<defs><linearGradient id="grad{uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF8A3D"/><stop offset="1" stop-color="#F2542D"/></linearGradient>'
            f'<filter id="shadow{uid}" x="-10%" y="-60%" width="120%" height="200%"><feDropShadow dx="0" dy="-6" stdDeviation="12" flood-color="#3C281E" flood-opacity="0.08"/></filter>'
            f'<filter id="glow{uid}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#F2542D" flood-opacity="0.35"/></filter></defs>')
    path = f'M0 {BAR_Y + 30} Q0 {BAR_Y} 30 {BAR_Y} H{W - 30} Q{W} {BAR_Y} {W} {BAR_Y + 30} V{H} H0 Z'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{defs}'
            f'<g filter="url(#shadow{uid})"><path d="{path}" fill="#FFFFFF"/></g>' + ''.join(parts) + '</svg>')


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'nav-svg')
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        if f.endswith('.svg'): os.remove(os.path.join(out, f))
    n = 0
    for app, tabs in [('branch', BRANCH_TABS), ('production', PROD_TABS), ('finance', FIN_TABS)]:
        for i, (name, _) in enumerate(tabs):
            open(os.path.join(out, f'{app}-nav-{name.lower()}.svg'), 'w').write(bar(tabs, name, f'{app}{i}'))
            n += 1
    print(n, 'SVGs in', out)
