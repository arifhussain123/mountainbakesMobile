from common import *

def swatch(name, hexv, note=''):
    border = f'border:1px solid {T["border"]};' if hexv.upper() in ('#FFFFFF', '#FBF6EE', '#FFF4E4') else ''
    return (f'<div class="col" style="gap:8px;width:150px"><div style="height:84px;border-radius:16px;background:{hexv};{border}"></div>'
            f'<div class="h3" style="font-size:14px">{e(name)}</div><div class="xs">{hexv}{(" · " + e(note)) if note else ""}</div></div>')

def block(head, inner, sub=''):
    return (f'<div class="col" style="gap:18px"><div class="col" style="gap:4px"><div class="eyebrow">{e(sub)}</div>'
            f'<div class="h2" style="font-size:26px">{e(head)}</div></div>{inner}</div>')

colors = [
    ('Brand', [('Saffron (primary)', T['primary'], 'gradient end'), ('Saffron light', '#FF8A3D', 'gradient start'), ('Saffron soft', T['primarySoft'], 'tints'),
               ('Midnight', T['cocoa'], 'hero, nav bar'), ('Midnight 2', T['cocoa2']), ('Violet', T['berry'], 'accent')]),
    ('Surfaces & text', [('Mist bg', T['bg']), ('Surface', T['surface']), ('Tint', T['tint']), ('Border', T['border']),
                         ('Text', T['text']), ('Text 2', T['text2']), ('Text 3', T['text3'])]),
    ('Status', [('Success', T['success']), ('Success soft', T['successSoft']), ('Warning', T['warning']), ('Warning soft', T['warningSoft']),
                ('Danger', T['danger']), ('Danger soft', T['dangerSoft']), ('Info', T['info']), ('Info soft', T['infoSoft'])]),
]
col_html = ''.join(f'<div class="col" style="gap:12px"><div class="label">{g}</div><div class="row" style="gap:16px;flex-wrap:wrap;align-items:flex-start">'
                   + ''.join(swatch(*s) for s in sw) + '</div></div>' for g, sw in colors)

type_rows = [
    ('Display / H1', 'Urbanist SemiBold 32/38 · −1 tracking', '<div class="h1">Today\'s Overview</div>'),
    ('H2', 'Urbanist SemiBold 21/27', '<div class="h2">Top selling products</div>'),
    ('H3', 'Urbanist SemiBold 17/22', '<div class="h3">Committee Chowk Branch</div>'),
    ('Body', 'Urbanist Regular 15/21', '<div class="p">Finance approves it and posts the receipt.</div>'),
    ('Small', 'Urbanist Regular 13/18', '<div class="sm">CT-000043 · Cash · 12 Oct 2026</div>'),
    ('Label', 'Urbanist SemiBold 12 · sentence case', '<div class="eyebrow">Deductions · today</div>'),
    ('Figure', 'Urbanist Bold 22 · −0.6 tracking', '<div class="kpi" style="border:none;padding:0;background:none"><div class="v">Rs. 189,250</div></div>'),
]
type_html = '<div class="col" style="gap:0">' + ''.join(
    f'<div class="row" style="gap:24px;padding:14px 0;border-top:1px solid {T["border"]}"><div class="col" style="gap:2px;width:200px"><div class="h3" style="font-size:14px">{a}</div><div class="xs">{b}</div></div><div class="grow">{c}</div></div>'
    for a, b, c in type_rows) + '</div>'

buttons = ('<div class="row" style="gap:12px;flex-wrap:wrap">' + btn('Submit Order', 'primary') + btn('Save Draft', 'secondary') + btn('Sign In', 'dark')
           + btn('Add Item', 'soft', 'plus') + btn('Reject', 'danger') + btn('Approve', 'primary', 'check', 'sm') + btn('Export', 'secondary', 'download', 'sm') + btn('View', 'secondary', None, 'xs') + '</div>')
pills = '<div class="row" style="gap:8px;flex-wrap:wrap">' + ''.join(status(s) for s in ['Pending', 'Approved', 'Rejected', 'In Review', 'Draft', 'Upcoming', 'Changed']) + '</div>'
chips_html = chips([('All', 41), ('Pending', 6), ('Approved', 33), ('Rejected', 2)], 0) + seg(['Daily', 'Weekly', 'Monthly'], 0)
fields = ('<div class="grid2" style="gap:16px;width:720px">' + field('Email', 'you@mountainbakes.com', ph=True, req=True, icon='mail')
          + field('Amount', '12,500', pre='Rs.', cls='focus') + select('Category', 'Utilities') + field('Date', '12 Oct 2026', icon='calendar')
          + '</div>')
cards = ('<div class="row" style="gap:16px;align-items:stretch;width:900px">'
         + '<div style="width:220px;display:flex">' + kpi('Orders', '31', '0 pending · 0 cancelled', icon='orders') + '</div>'
         + card('<div class="eyebrow">Sales · today</div><div style="font:600 30px Urbanist">Rs. 19,750</div><div class="sm">31 orders · avg Rs. 637</div>', 'hero', 'width:280px')
         + card(f'<div class="li" style="padding:0"><div class="thumb">CP</div><div class="grow col" style="gap:2px"><div class="h3" style="font-size:15px">Cream Puff</div><div class="xs">Pastry · 42 sold</div></div><div class="amt">Rs. 6,300</div></div>', '', 'width:340px')
         + '</div>')
misc = ('<div class="row" style="gap:20px;align-items:center;flex-wrap:wrap">' + stepper(2) + toggle(True) + toggle(False) + checkbox(True) + checkbox(False)
        + f'<div style="width:220px">{progress(64)}</div>' + pager(('1', '2', '3'), 0) + '</div>')
banners = '<div class="col" style="gap:10px;width:600px">' + banner('1 deposit already made for this date (CT-000043).', 'info') + banner('Insufficient production stock for 8 products.', 'warn', 'alert') + '</div>'
icons = '<div class="row" style="gap:14px;flex-wrap:wrap;width:900px">' + ''.join(
    f'<div class="col" style="align-items:center;gap:6px;width:64px"><div class="iconbtn" style="color:{T["text"]}">{ic(n)}</div><div class="xs">{n}</div></div>' for n in P) + '</div>'
nav = (f'<div style="width:390px;height:88px;position:relative;border-radius:16px;overflow:hidden;border:1px solid {T["border"]}">{tabbar(BRANCH_TABS, "Home")}</div>')

principles = '<div class="grid3" style="gap:16px;width:1100px">' + ''.join(card(f'<div class="h3">{a}</div><div class="p">{b}</div>', 'flat') for a, b in [
    ('Midnight & Saffron', 'Cool mist surfaces with deep midnight hero cards. A saffron gradient marks the one action that matters on each screen, with a soft glow so it reads at a glance.'),
    ('Graphical buttons', 'Primary buttons are gradient pills with a glow and an arrow badge. Secondary buttons are white with a light shadow. The tab bar floats and shows the active tab as a lit-up chip.'),
    ('One hand, one thumb', '52px fields and buttons, 44px+ touch targets, primary actions pinned to the bottom. Forms open as bottom sheets so the list stays in view.'),
]) + '</div>'

ds = (f'<div class="ds" style="width:1280px;background:{T["bg"]};padding:64px;display:flex;flex-direction:column;gap:56px">'
      f'<div class="row" style="gap:18px"><div class="logo" style="width:64px;height:64px;border-radius:50%;font-size:26px"></div>'
      f'<div class="col" style="gap:4px"><div class="eyebrow">Mountain Bakes · Mobile redesign 2026 · Midnight & Saffron · Urbanist</div><div class="h1" style="font-size:44px;line-height:52px">Design System · v2</div></div></div>'
      + principles + block('Colour', col_html, 'Foundations') + block('Typography', type_html, 'Foundations')
      + block('Buttons', buttons, 'Components') + block('Status pills', pills, 'Components') + block('Filters & segments', f'<div class="col" style="gap:14px;width:520px">{chips_html}</div>', 'Components')
      + block('Form fields', fields, 'Components') + block('Cards & figures', cards, 'Components') + block('Controls', misc, 'Components')
      + block('Banners', banners, 'Components') + block('Bottom navigation', nav, 'Components') + block('Icons', icons, 'Components')
      + '</div>')

if __name__ == '__main__':
    import sys
    open(sys.argv[1], 'w').write(page([ds], 'Design System'))
