from common import *

TABS = PROD_TABS
S = []

def topbar(sub='Production Unit'):
    return (f'<div class="appbar"><div class="logo"></div><div class="grow col" style="gap:1px"><div class="h3" style="font-size:15px">Mountain Bakes</div>'
            f'<div class="xs">{e(sub)}</div></div><div class="iconbtn" style="position:relative">{ic("bell")}'
            f'<span style="position:absolute;top:6px;right:5px;min-width:18px;height:18px;border-radius:9px;background:{T["primary"]};color:#fff;font:600 10px Urbanist;display:flex;align-items:center;justify-content:center;padding:0 4px">9+</span></div>'
            f'<div class="avatar">PR</div></div>')

def put(name, body, active, fab=None, height=None, tabs=True):
    S.append(screen(name, '', TABS if tabs else None, active, fab=fab, height=height).replace('@@BODY@@', body))

# 01 Dashboard ---------------------------------------------------------------
plan = ''.join(card(f'''<div class="between"><div class="h3" style="font-size:15px">{n}</div>{status(st)}</div>
<div class="grid4" style="background:{T['tint']};border-radius:12px;padding:8px 10px">{mini('Demand', d)}{mini('Produced', pr)}{mini('In stock', s)}{mini('Balance', b, T['danger'] if b.startswith('-') else None)}</div>
<div class="row" style="gap:10px">{progress(cov, T['success'] if cov >= 100 else T['warning'])}<span class="xs" style="width:70px;text-align:right">{cov}% covered</span></div>''', 'flat')
               for n, st, d, pr, s, b, cov in [('Cream Puff', 'Shortage', '449', '430', '-3', '-3', 96), ('Fudge Pastry', 'Shortage', '181', '84', '138', '-43', 76), ('Banana Bread', 'Completed', '34', '34', '41', '7', 100)])
heat_br = ['Alabad', 'Comm. Mkt', 'Committee', 'G-10']
heat_pr = [('Cream Puff', [40, 12, 20, 10]), ('Fudge Pastry', [22, 4, 10, 6]), ('Nutella Pastry', [9, 2, 0, 4]), ('Filled Donuts', [18, 6, 12, 0])]
def heatc(v):
    a = min(1, v / 40)
    return f'background:rgba(242,84,45,{0.08 + a*0.8:.2f});color:{"#fff" if a > .5 else T["text"]}'
heat = (f'<div class="heat" style="grid-template-columns:96px repeat(4,1fr)"><div></div>' + ''.join(f'<div class="xs" style="height:auto">{b}</div>' for b in heat_br)
        + ''.join(f'<div class="xs" style="justify-content:flex-start;color:{T["text2"]}">{n}</div>' + ''.join(f'<div style="{heatc(v)}">{v}</div>' for v in vals) for n, vals in heat_pr) + '</div>')
db = topbar() + f'''<div class="body pb" style="padding-top:8px">{title('Live · updated 10:58 PM', 'Production dashboard')}
{seg(['Today', 'This week', 'Month'], 1)}
{card(f"""<div class="between"><div class="eyebrow">Total demand · this week</div><span class="pill" style="background:rgba(255,255,255,.14);color:{T['cream']}">{ic('arrowdown', 12)} 83.9%</span></div>
<div style="font:600 36px Urbanist;color:{T['cream']}">70 <span style="font-size:16px;color:rgba(255,255,255,.6)">units</span></div>
<div class="row" style="gap:20px"><div class="col" style="gap:2px"><div class="sm">Produced</div><div style="font:600 16px Urbanist;color:{T['cream']}">1,243</div></div><div class="col" style="gap:2px"><div class="sm">Fulfilment</div><div style="font:600 16px Urbanist;color:{T['honey']}">100%</div></div><div class="col" style="gap:2px"><div class="sm">Open orders</div><div style="font:600 16px Urbanist;color:{T['cream']}">1</div></div></div>""", 'hero')}
<div class="grid3">{kpi('Delivered', '0', '−100%')}{kpi('Returned', '0', '−100%')}{kpi('Changed', '0', 'by production')}</div>
{card(f"""<div class="between"><div class="h3">Demand vs production</div>{pill('12 months', 'neutral')}</div>
{line_chart([([18, 20, 22, 25, 24, 28, 27, 30, 26, 29, 31, 12], T['honey'], True), ([22, 24, 27, 28, 30, 31, 33, 35, 31, 36, 38, 16], T['primary'], False)], 318, 120, ['Nov', 'Feb', 'May', 'Aug', 'Oct'])}
{legend([('Demand 39,243', T['honey']), ('Produced 51,403', T['primary'])])}""")}
{section('Production plan', link('All 53'))}{plan}
{section('Branch × product demand')}
{card(f'<div class="sm">Units per branch this week. Darker cells are larger orders.</div>{heat}')}
{section('Top requested', link('Top 10'))}
{card(''.join(f'<div class="li"><div class="thumb" style="width:32px;height:32px;border-radius:10px;font-size:12px">{i}</div><div class="grow h3" style="font-size:14px">{n}</div><div class="amt">{v}</div></div>' for i, n, v in [(1, 'Cream Puff', '82 units'), (2, 'Fudge Pastry', '42'), (3, 'Filled Donuts', '36'), (4, 'Nutella Pastry', '15')]), '', 'gap:0;padding:4px 16px')}</div>'''
put('P01 Production Dashboard', db, 'Dashboard', height=2000)

# 02 Orders -----------------------------------------------------------------
def po_card(i, st, po, d, br, req, qty, appr):
    return card(f'''<div class="between"><div class="col" style="gap:2px"><div class="h3">{i}</div><div class="xs">{po} · {d}</div></div>{status(st)}</div>
<div class="row" style="gap:10px"><div class="thumb">{ic('home', 20)}</div><div class="grow col" style="gap:2px"><div class="h3" style="font-size:14px">{br}</div><div class="xs">Required {req}</div></div>
<div class="col" style="align-items:flex-end;gap:0"><div class="amt">{qty} units</div><div class="xs">{appr}</div></div></div>''', 'flat')
po = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Production orders', None, f'<div class="iconbtn">{ic("download")}</div>')}
{card(f"""<div class="between"><div class="eyebrow">Special order · SO-000002</div>{status('Prepared')}</div><div class="h3">2 pound Black Forest · Simple</div>
<div class="grid3">{mini('Branch', 'Alabad')}{mini('Required', '08 Oct')}{mini('Price', 'Rs. 1,600')}</div>
<div class="banner info" style="padding:8px 12px">Prepared and in Production Stock. It moves to the branch when the branch verifies it with a photo.</div>""", 'tint')}
{card(f"""<div class="between"><div class="h3">Demand summary · waiting</div>{pill('1 to review', 'warn')}</div>
<div class="tr th"><div class="grow">Product</div><div class="c">Stock</div><div class="c">Dem.</div><div class="c">Bal</div></div>""" + ''.join(f'<div class="tr"><div class="grow">{n}</div><div class="c">{s}</div><div class="c">{d}</div><div class="c" style="color:{T["danger"] if b < 0 else T["text"]};font-weight:600">{b}</div></div>' for n, s, d, b in [('Cream Puff', 20, 24, -4), ('Fudge Pastry', 138, 10, 128), ('Filled Donuts', 34, 12, 22)]), '', 'gap:0')}
{chips([('All', 211), ('Pending', 1), ('Approved', 200), ('Delivered', 10)], 0)}
{po_card('DMD-000281', 'Pending', 'PO-CCB-2250', '12 Oct · 22:50', 'Committee Chowk Branch', '13 Oct', 70, 'awaiting approval')}
{po_card('DMD-000280', 'Approved', 'PO-CMB-2214', '12 Oct · 22:14', 'Commercial Market Branch', '13 Oct', 46, '46 approved')}
{po_card('DMD-000279', 'Delivered', 'PO-ALB-2140', '11 Oct · 21:40', 'Alabad Branch', '12 Oct', 88, 'verified 12 Oct')}</div>'''
put('P02 Production Orders', po, 'Orders', height=1500)

# 03 Order Detail -----------------------------------------------------------
od_rows = ''.join(f'<div class="tr"><div class="grow col" style="gap:0"><span>{n}</span><span class="xs">Rs. {p}</span></div><div class="c">{d}</div><div class="c">{a}</div><div class="c w">{amt}</div></div>'
                  for n, p, d, a, amt in [('Cream Puff', 150, 24, 24, '3,600'), ('Fudge Pastry', 180, 10, 10, '1,800'), ('Filled Donuts', 150, 12, 12, '1,800'), ('Banana Bread', 350, 4, 4, '1,400'), ('Classic Brownie', 125, 2, 2, '250')])
od = appbar('DMD-000281', 'PO-CCB-20261012-2250', back=True, actions=[pill('Pending', 'warn', True)]) + f'''<div class="body">
{card(f'<div class="row" style="gap:12px"><div class="thumb">{ic("home", 20)}</div><div class="grow col" style="gap:2px"><div class="h3">Committee Chowk Branch</div><div class="xs">Near Committee Chowk, Rawalpindi · +92 319 5381210</div></div></div><div class="grid3">{mini("Submitted", "12 Oct 22:50")}{mini("Required", "13 Oct")}{mini("By", "ahmed@")}</div>', 'flat')}
{card(f'<div class="tr th"><div class="grow">Product</div><div class="c">Dem.</div><div class="c">Appr.</div><div class="c w">Rs.</div></div>{od_rows}<div class="tr" style="font-weight:600"><div class="grow">Totals</div><div class="c">52</div><div class="c">52</div><div class="c w">8,850</div></div>', '', 'gap:0')}
{card(f'<div class="h3">Previous order balance</div><div class="grid3">{mini("Last order", "DMD-000276")}{mini("Balance", "Rs. 0")}{mini("Returned", "1 · Rs. 350")}</div>', 'tint')}
{banner('POP Print sends the receipt to this device’s printer. A4 Challan prints one page: customer copy on top, company copy below the cut line.', 'info', 'printer')}
<div class="grid2">{btn('POP print', 'secondary', 'printer', 'sm')}{btn('A4 challan', 'secondary', 'file', 'sm')}</div></div>'''
S.append(screen('P03 Order Detail', '', footer=btn('Submit for verification', 'primary', 'check', 'full'), height=1180).replace('@@BODY@@', od))

# 05 Sales -----------------------------------------------------------------
ps_list = ''.join(card(f'<div class="between"><div class="col" style="gap:2px"><div class="h3" style="font-size:15px">{c}</div><div class="xs">{i} · {t}</div></div><div class="col" style="align-items:flex-end;gap:4px"><div class="amt">{a}</div>{pill(p, "brand")}</div></div><div class="sm">{pr}</div>', 'flat')
                  for c, i, t, a, p, pr in [('Walk-in customer', 'MB-P-00412', '18:20', 'Rs. 2,400', 'Cash', 'Lotus Cake Bento ×2 · 2 units'), ('Staff sale', 'MB-P-00411', '16:05', 'Rs. 600', 'Cash', 'Cream Puff ×4 · 4 units')])
ps = topbar() + f'''<div class="body pb" style="padding-top:8px">{title("Today's sales · 2 recorded", 'Sales', None, f'<div class="iconbtn">{ic("calendar")}</div>')}
{card(f"""<div class="eyebrow">Total sales · 12 Oct · after discount</div><div style="font:600 34px Urbanist;color:{T['cream']}">Rs. 3,000</div>
<div class="row" style="gap:24px"><div class="col" style="gap:2px"><div class="sm">Gross</div><div style="font:600 15px Urbanist;color:{T['cream']}">Rs. 3,000</div></div><div class="col" style="gap:2px"><div class="sm">Discount</div><div style="font:600 15px Urbanist;color:{T['honey']}">Rs. 0</div></div></div>""", 'hero')}
<div class="grid2">{kpi('Cash', 'Rs. 3,000')}{kpi('Items sold', '6', '2 products')}</div>{chips([('All', 2), ('Cash', 2), ('Easypaisa', 0)], 0)}{ps_list}</div>'''
put('P05 Sales', ps, 'More', fab='New sale', height=900)

# 06 New Sale --------------------------------------------------------------
pns = appbar('New sale', 'Production counter', back=True) + f'''<div class="body" style="padding-top:4px">
<div class="eyebrow">Customer (optional)</div><div class="grid2">{field('Name', 'Walk-in customer', ph=True)}{field('Mobile', '03xx xxxxxxx', ph=True)}</div>
<div class="between"><div class="eyebrow">Items</div>{btn('Add item', 'soft', 'plus', 'xs')}</div>{search('Search product…')}
{card(f'<div class="between"><div class="h3" style="font-size:15px">Lotus Cake Bento</div><div class="amt">Rs. 2,400</div></div><div class="between">{stepper(2)}<span class="xs">Rate Rs. 1,200</span></div>', 'flat')}
<div class="eyebrow">Payment method</div>{seg(['Cash', 'Easypaisa', 'Bank'], 0)}{field('Received cash', '2,500', pre='Rs.', cls='focus')}
{field('Notes (optional)', 'Any notes…', ph=True)}
<div class="card flat sum"><div class="between">Subtotal<b>Rs. 2,400</b></div><div class="between">Discount<b>Rs. 0</b></div><div class="between">Government tax<b>Rs. 0</b></div><div class="divider"></div>
<div class="between" style="color:{T['text']}"><span style="font-weight:600">Grand total</span><b style="font-size:20px">Rs. 2,400</b></div><div class="between">Received · returned<b style="color:{T['success']}">Rs. 2,500 · Rs. 100</b></div></div></div>'''
S.append(screen('P06 New Sale', '', footer=btn('Save sale', 'secondary', None, 'grow') + btn('Save & print', 'primary', 'printer', 'grow'), height=1060).replace('@@BODY@@', pns))

# 07 Production Stock --------------------------------------------------------
def pst(n, i, st, o, p, d, b):
    return card(f'''<div class="between"><div class="col" style="gap:2px"><div class="h3" style="font-size:15px">{n}</div><div class="xs">{i}</div></div>{status(st)}</div>
<div class="grid4" style="background:{T['tint']};border-radius:12px;padding:8px 10px">{mini('Opening', o)}{mini('Prepared', p)}{mini('Demand', d)}{mini('Balance', b, T['danger'] if str(b).startswith('-') else None)}</div>''', 'flat')
pstk = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Production stock', 'Central production pool, today. Opening is yesterday’s closing balance.')}
{field('Date', '12 Oct 2026', icon='calendar')}
<div class="grid2">{btn("Today's prepared", 'primary', 'plus', 'sm')}{btn('Adjustment', 'secondary', 'edit', 'sm')}</div>
{card(f"""<div class="eyebrow">Balance · end of day</div><div style="font:600 36px Urbanist;color:{T['cream']}">207</div>
<div class="grid4" style="gap:8px">""" + ''.join(f'<div class="col" style="gap:2px"><div class="sm">{k}</div><div style="font:600 14px Urbanist;color:{T["cream"]}">{v}</div></div>' for k, v in [('Opening', '−597'), ('Prepared', '+1,243'), ('Total', '646'), ('Demand', '2,009'), ('Sale', '0'), ('Returns', '0'), ('Adjust', '7'), ('Detail', '›')]) + '</div>', 'hero')}
{banner('<b>Insufficient stock for 8 products.</b> Fudge Pastry short 43 · Filled Donuts short 139 · and 6 more.', 'bad', 'alert')}
{search('Search products…')}{chips([('All', 53), ('Shortage', 6), ('Out', 2)], 0)}
{pst('Fudge Pastry', 'STK-000005', 'Shortage', '82', '+84', '181', '138')}{pst('Filled Donuts', 'STK-000012', 'Shortage', '-36', '+90', '173', '34')}{pst('Cream Puff', 'STK-000001', 'Out', '-258', '+430', '449', '-3')}{pst('Lemon Tart', 'STK-000025', 'Out', '1', '—', '12', '-1')}</div>'''
put('P07 Production Stock', pstk, 'Stock', height=1500)

# 08 Prepared Products ---------------------------------------------------------
pp_rows = ''.join(f'<div class="li"><div class="grow col" style="gap:2px"><div class="h3" style="font-size:14px">{n}</div><div class="xs">{c} · today {t}</div></div>{stepper(a)}</div>'
                  for n, c, t, a in [('Basbusa', 'Basbusa', 0, 12), ('Banana Bread', 'Bread', 34, 0), ('Classic Brownie', 'Brownie', 9, 20), ('Nutella Brownie', 'Brownie', 0, 0), ('Caramel Cake Bento', 'Cakes', 5, 0),
                                     ('Dry Cake', 'Cakes', 4, 6), ('German Fudge Cake Bento', 'Cakes', 6, 0), ('HITME Cake Bento', 'Cakes', 18, 0), ('Kitkat Cake Bento', 'Cakes', 7, 0), ('Lotus Cake Bento', 'Cakes', 3, 4)])
pp = appbar("Today's prepared", '12 Oct 2026', back=True) + f'''<div class="body" style="padding-top:4px">
<div class="p">Enter the quantity prepared. Every figure is added to what today already holds.</div>{search('Search products…')}{chips([('All', 53), ('Cakes', 14), ('Pastry', 12), ('Bread', 4)], 0)}
<div class="card" style="padding:4px 16px;gap:0">{pp_rows}</div>
<div class="card tint" style="flex-direction:row;justify-content:space-between;align-items:center"><div class="col" style="gap:2px"><div class="xs">Adding</div><div style="font:600 20px Urbanist;color:{T['primary']}">+42</div></div>{ic('right', 20, T['text3'])}<div class="col" style="gap:2px;align-items:flex-end"><div class="xs">Prepared today</div><div style="font:600 20px Urbanist">1,285</div></div></div></div>'''
S.append(screen('P08 Prepared Products', '', footer=btn('Clear', 'secondary', None, 'grow') + btn('Save', 'primary', 'check', 'grow'), height=1300).replace('@@BODY@@', pp))

# 09 Branch Stock --------------------------------------------------------------
brs = ['Alabad', 'Banigala', 'Comm. Mkt', 'Committee', 'Dhok Khaba', 'Dhok Sayedan', 'G-10', 'Laziza']
bsd = [('Cream Puff', [4152, 17, 10, 20, 170, 657, 100, 3321]), ('Chocolate Balls', [1126, 20, 9, 14, 100, 222, 92, 932]), ('Red Velvet Pastry', [448, 7, 1, 7, 28, 49, 0, 1070]),
       ('Nutella Pastry', [280, 7, 2, 0, 35, 53, 0, 65]), ('Fudge Pastry', [795, 4, 7, 0, 42, 98, 0, 1345]), ('Rocher Cake Bento', [35, 2, 0, 0, 8, 19, 0, 0]),
       ('Chocolate Sundae', [236, 13, 1, 2, 20, 59, 5, 531]), ('Qatar Crunch', [67, 2, 2, 2, 3, 18, 0, 108]), ('Filled Donuts', [557, 2, 0, 0, 18, 96, 0, 369]), ('Plain Donuts', [133, 6, 1, 4, 0, 13, 0, 451])]
def cell(v):
    if v == 0: return f'background:{T["dangerSoft"]};color:{T["danger"]}'
    if v < 5: return f'background:{T["warningSoft"]};color:{T["warning"]}'
    return f'background:{T["surface"]};color:{T["text"]}'
grid = (f'<div style="display:grid;grid-template-columns:110px repeat(4,1fr);gap:4px">' + '<div class="xs">Product</div>' + ''.join(f'<div class="xs" style="text-align:center">{b}</div>' for b in brs[:4])
        + ''.join(f'<div style="font:600 12px Urbanist;display:flex;align-items:center">{n}</div>' + ''.join(f'<div style="height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font:600 12px Urbanist;{cell(v)}">{v:,}</div>' for v in vals[:4]) for n, vals in bsd) + '</div>')
bs = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Branch stock')}{search('Search products…')}
{chips(['Alabad – Committee', 'Dhok Khaba – Laziza'], 0)}
{card(grid + f'<div class="between"><span class="xs">1–10 of 53 products · 4 of 8 branches</span>{ic("right", 18, T["text3"])}</div>')}
{legend([('0 stock', T['danger']), ('1–4', T['warning']), ('5+', T['border'])])}</div>'''
put('P09 Branch Stock', bs, 'Stock', height=1000)

# 10 Returns ---------------------------------------------------------------------
def pret(p, q, br, r, st, rid, d):
    acts = f'<div class="row" style="gap:6px">{btn("Reject", "danger", None, "xs")}{btn("Approve", "primary", "check", "xs")}</div>' if st == 'Awaiting Review' else btn('View', 'secondary', None, 'xs')
    return card(f'''<div class="between"><div class="row" style="gap:12px"><div class="thumb">{ic('return', 20)}</div><div class="col" style="gap:2px"><div class="h3" style="font-size:15px">{p} <span style="color:{T['text3']}">×{q}</span></div><div class="xs">{br}</div></div></div>{status(st)}</div>
<div class="p" style="color:{T['text']}">“{r}”</div><div class="between"><span class="xs">{rid} · {d}</span>{acts}</div>''', 'flat')
rt = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Product returns', 'Last 30 days. Open a return to approve, reject or send it back to the branch.')}
{search('Search reason, product or branch…')}{chips([('All', 7), ('Awaiting', 2), ('Approved', 4), ('Rejected', 1)], 0)}
{pret('Banana Bread', 1, 'Commercial Market Branch', 'Damage from company', 'Awaiting Review', 'B1C5DBA1', '12 Oct')}
{pret('Lotus 1 Pound Cake', 1, 'Commercial Market Branch', 'Damage from company', 'Awaiting Review', '1967A3DC', '12 Oct')}
{pret('Banana Bread', 1, 'Commercial Market Branch', 'Expired', 'Rejected', 'C54DEEC3', '11 Oct')}
{pret('Oreo 1 Pound Cake', 1, 'Commercial Market Branch', 'Expired', 'Approved', '4202432A', '11 Oct')}</div>'''
put('P10 Returns', rt, 'Returns', height=1100)

# 11 Discounts -------------------------------------------------------------------
def pdisc(a, st, r, br, dm, d):
    acts = f'<div class="row" style="gap:6px">{btn("Reject", "danger", None, "xs")}{btn("Approve", "primary", "check", "xs")}</div>' if st == 'Awaiting Review' else btn('View', 'secondary', None, 'xs')
    return card(f'''<div class="between"><div class="col" style="gap:2px"><div class="h3" style="font-size:15px">{br}</div><div class="xs">{dm} · {d}</div></div><div class="col" style="align-items:flex-end;gap:4px"><div class="amt" style="font-size:17px">{a}</div>{status(st)}</div></div>
<div class="between"><span class="p" style="color:{T['text']}">“{r}”</span>{acts}</div>''', 'flat')
dc = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Discounts', 'Last 30 days. Open a claim to approve, reject or send it back.')}
<div class="grid2">{kpi('Awaiting review', 'Rs. 1,800', '4 claims', T['warning'])}{kpi('Approved', 'Rs. 1,750', '3 claims', T['success'])}</div>
{search('Search demand #, reason or branch…')}{chips([('All', 7), ('Awaiting', 4), ('Approved', 3)], 0)}
{pdisc('Rs. 400', 'Awaiting Review', 'All discount kiya hai', 'Committee Chowk Branch', 'DMD-000278', '11 Oct')}
{pdisc('Rs. 300', 'Awaiting Review', 'For sale damage saman', 'Commercial Market Branch', 'DMD-000280', '11 Oct')}
{pdisc('Rs. 250', 'Awaiting Review', 'For special customers', 'Commercial Market Branch', 'DMD-000277', '11 Oct')}
{pdisc('Rs. 200', 'Approved', 'For special customers', 'Commercial Market Branch', 'DMD-000275', '10 Oct')}</div>'''
put('P11 Discounts', dc, 'More', height=1120)

# 12 Special Events -----------------------------------------------------------------
def pev(n, d, h, tag, days):
    return card(f'''<div class="between"><div class="row" style="gap:12px"><div class="col" style="width:52px;height:56px;border-radius:16px;background:{T['primarySoft']};align-items:center;justify-content:center;gap:0;flex-shrink:0"><div style="font:600 20px Urbanist;color:{T['primary']}">{d.split()[0]}</div><div class="xs" style="color:{T['primary']}">{d.split()[1].upper()}</div></div>
<div class="col" style="gap:3px"><div class="h3" style="font-size:15px">{n}</div><div class="xs">{h} · estimated</div></div></div>{pill(days, 'brand')}</div>
<div class="row" style="gap:8px">{pill(tag, 'neutral')}{pill('Low', 'neutral')}<div class="grow"></div><span class="xs">0/8 branches</span></div><div class="row" style="gap:10px">{progress(0)}<span class="xs">0%</span></div>''', 'flat')
pe = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Special events')}
<div class="grid4">{kpi('Upcoming', '14')}{kpi('Next in', '4d')}{kpi('Demands', '0')}{kpi('Ready', '0%')}</div>
{pev('World Food Day', '16 Oct', '5 Jumada al-Awwal 1448 AH', 'International', 'in 4 days')}
{pev('Martyrdom of Lady Fatimah', '24 Oct', '13 Jumada al-Awwal 1448 AH', 'Ahlul Bayt', 'in 12 days')}
{pev('Halloween', '31 Oct', '20 Jumada al-Awwal 1448 AH', 'International', 'in 19 days')}
{empty('grid', 'Nothing to consolidate yet', 'Once branches submit their advance demand it is rolled up here, product by product.')}</div>'''
put('P12 Special Events', pe, 'More', height=1180)

# 13 Production Reports --------------------------------------------------------------
prr = ''.join(f'<div class="tr"><div class="grow">{d}</div><div class="c w" style="font-weight:600">{q:,}</div></div>' for d, q in [('Fri 02 Oct', 1448), ('Sat 03 Oct', 876), ('Mon 05 Oct', 1392), ('Tue 06 Oct', 834), ('Thu 08 Oct', 1624), ('Fri 09 Oct', 673)])
pr = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Production reports', None, f'<div class="iconbtn">{ic("download")}</div>')}
<div class="grid2">{select('Report', 'Production')}{select('Period', 'Monthly')}</div>
{card(f"""<div class="eyebrow">Prepared · October to date</div><div style="font:600 34px Urbanist;color:{T['cream']}">6,847 <span style="font-size:15px;color:rgba(255,255,255,.6)">units</span></div><div class="sm">6 production days · avg 1,141 a day</div>""", 'hero')}
{card(f"""<div class="h3">Prepared per day</div>{bars([1448, 876, 1392, 834, 1624, 673], ['02', '03', '05', '06', '08', '09'], on=4)}""")}
{card(f'<div class="tr th"><div class="grow">Date</div><div class="c w">Prepared</div></div>{prr}', '', 'gap:0')}
<div class="grid4">{btn('PDF', 'secondary', None, 'xs')}{btn('Excel', 'secondary', None, 'xs')}{btn('CSV', 'secondary', None, 'xs')}{btn('Print', 'secondary', None, 'xs')}</div></div>'''
put('P13 Production Reports', pr, 'More', height=1220)

# 14 Help Desk -------------------------------------------------------------------------
hd = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Help desk', 'Spotted an issue? Forward it to admin.')}
{chips([('Awaiting admin', 1), ('Resolved', 0)], 0)}
{card(f"""<div class="between"><div class="col" style="gap:2px"><div class="h3">SUP-000515 · DMD-000261</div><div class="xs">Demand · Committee Chowk · 05 Oct 2026</div></div>{status('Open')}</div>
<div class="grid3" style="background:{T['tint']};border-radius:12px;padding:10px 12px;row-gap:10px">{mini('Status', 'Rejected')}{mini('Products', '1')}{mini('Requested', '3')}{mini('Approved', '—')}{mini('Packing', '0')}{mini('Changed', 'No')}</div>
<div class="sm">Submitted by ahmed@mountainbakes.com · reviewed by production@mountainbakes.com</div>
<div class="banner warn" style="padding:8px 12px">Issue: “delete”</div>""", 'flat')}
{section('History')}{search('Search history…')}{empty('help', 'No resolved queries yet', 'Resolved and rejected queries move here.')}</div>'''
put('P14 Help Desk', hd, 'More', fab='New query', height=1000)

# 15 New Query (sheet) ------------------------------------------------------------------
nq = f'''<div class="p">Search a sale (MB-…), demand (DMD-…), expense (EXP-…), stock (STK-…) or cash deposit (CT-…) ID. Its details load automatically.</div>
<div class="row" style="gap:8px;align-items:flex-end"><div class="grow">{field('Reference ID', 'e.g. DMD-000261', ph=True, cls='focus')}</div>{btn('Find', 'dark', 'search')}</div>
{field('Describe the issue', 'What looks wrong with this record?', ph=True, cls='area', req=True)}'''
S.append(sheet_screen('P15 New Query', title(None, 'Help desk'), nq, 'New query', None, btn('Cancel', 'secondary', None, 'grow') + btn('Submit to admin', 'primary', 'send', 'grow'), 300))

# 16 Drawer --------------------------------------------------------------------------------
nav = [('Dashboard', 'home'), ('Production orders', 'orders'), ('Sales', 'sales'), ('Production stock', 'stock'), ("Today's prepared", 'chef'), ('Branch stock', 'grid'), ('Returns', 'return'),
       ('Discounts', 'tag'), ('Special events', 'event'), ('Reports', 'chart'), ('Help desk', 'help')]
navh = ''.join(f'<div class="navi{" on" if i == 0 else ""}">{ic(icn, 21)}{n}</div>' for i, (n, icn) in enumerate(nav))
S.append(f'''<div class="screen" data-name="P16 Drawer">{statusbar()}<div class="body" style="opacity:.9">{title(None, 'Production dashboard')}</div><div class="scrim"></div>
<div class="drawer"><div style="height:47px"></div><div class="col" style="padding:12px 20px 16px;gap:14px"><div class="row" style="gap:12px"><div class="logo"></div><div class="col" style="gap:1px"><div class="h3">Mountain Bakes</div><div class="xs">Production User</div></div></div>
<div class="card tint" style="padding:10px 12px;flex-direction:row;align-items:center;gap:10px">{ic('chef', 18, T['primary'])}<div class="grow h3" style="font-size:14px">Production Unit</div></div></div>
<div class="col" style="gap:2px;padding:0 10px;flex:1">{navh}</div>
<div class="row" style="gap:12px;padding:16px 20px 34px;border-top:1px solid {T['border']}"><div class="avatar">PR</div><div class="grow col" style="gap:1px"><div class="h3" style="font-size:14px">Production</div><div class="xs">production@mountainbakes.com</div></div><div class="iconbtn" style="color:{T['danger']}">{ic('logout')}</div></div></div></div>''')

if __name__ == '__main__':
    import sys
    open(sys.argv[1], 'w').write(page(S, 'Production'))
    print(len(S))
