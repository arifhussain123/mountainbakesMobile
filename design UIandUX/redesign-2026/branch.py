from common import *

TABS = BRANCH_TABS
S = []
BR = 'Committee Chowk Branch'

def topbar(sub='Committee Chowk Branch'):
    return (f'<div class="appbar"><div class="logo"></div><div class="grow col" style="gap:1px"><div class="h3" style="font-size:15px">Mountain Bakes</div>'
            f'<div class="xs">{e(sub)}</div></div><div class="iconbtn" style="position:relative">{ic("bell")}'
            f'<span style="position:absolute;top:9px;right:10px;width:8px;height:8px;border-radius:4px;background:{T["primary"]};border:2px solid #fff"></span></div>'
            f'<div class="avatar">MH</div></div>')

# 01 Splash ------------------------------------------------------------
S.append(f'''<div class="screen" data-name="B01 Splash" style="background:linear-gradient(160deg,#A594FF 0%,#7F6BF2 50%,#5B48D8 100%);position:relative">{statusbar(True)}{d3('sphere', -60, 90, 220)}{d3('ball', 46, 170, 64, 'left')}{d3('ring', -40, 140, 140, 'left', 'bottom')}{d3('mint', 54, 230, 34, 'right', 'bottom')}
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:0 40px;position:relative">
<div class="logo-lg" style="width:132px;height:132px"></div>
<div class="col" style="align-items:center;gap:8px"><div style="font:600 34px/40px Urbanist;color:{T['cream']}">Mountain Bakes</div>
<div style="font:600 12px Urbanist;letter-spacing:2.4px;color:{T['honey']};text-transform:uppercase">Fresh · Quality · Every Day</div></div></div>
<div class="col" style="align-items:center;gap:12px;padding-bottom:64px"><div style="width:120px">{progress(45, T['honey']).replace(T['tint'], 'rgba(255,255,255,.15)')}</div>
<div style="font:500 13px Urbanist;color:rgba(255,255,255,.6)">Loading…</div></div></div>''')

# 02 Onboarding ---------------------------------------------------------
def onboard(name, h, p, art, idx, cta, feats=None):
    dots = ''.join(f'<span style="width:{22 if i == idx else 8}px;height:8px;border-radius:4px;background:{T["primary"] if i == idx else T["border"]};display:block"></span>' for i in range(3))
    fe = ''
    if feats:
        fe = '<div class="row" style="gap:8px;flex-wrap:wrap">' + ''.join(f'<span class="chip">{ic(i, 16)}{t}</span>' for t, i in feats) + '</div>'
    skip = f'<div style="font:600 14px Urbanist;color:{T["text2"]}">Skip</div>' if idx < 2 else '<div></div>'
    return f'''<div class="screen" data-name="{name}">{statusbar()}
<div class="between" style="padding:8px 24px"><div class="row" style="gap:6px">{dots}</div>{skip}</div>
<div style="margin:12px 24px 0;height:340px;border-radius:32px;background:{T['tint']};position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center">{art}</div>
<div class="col" style="gap:14px;padding:28px 24px 0;flex:1"><div class="h1" style="font-size:36px;line-height:42px">{h}</div><div class="p" style="font-size:15px;line-height:22px">{e(p)}</div>{fe}</div>
<div style="padding:0 24px 40px">{btn(cta, 'primary', None, 'full')}</div></div>'''

art1 = (f'<div style="position:absolute;width:260px;height:260px;border-radius:130px;background:{T["primarySoft"]}"></div>'
        f'<div style="position:relative;width:150px;height:150px;border-radius:48px;background:linear-gradient(150deg,#A594FF 0%,#6C5CE7 100%);box-shadow:inset 0 2px 0 rgba(255,255,255,.35),inset 0 -12px 24px rgba(40,20,140,.3),0 24px 40px rgba(91,72,216,.35);display:flex;align-items:center;justify-content:center">{ic("cake", 76, T["cream"], 1.4)}</div>'
        f'<div class="card" style="position:absolute;left:22px;top:36px;padding:10px 12px;gap:2px"><div class="xs">Sales today</div><div class="h3">Rs. 19,750</div></div>'
        f'<div class="card" style="position:absolute;right:20px;bottom:40px;padding:10px 12px;gap:2px"><div class="xs">On the shelf</div><div class="h3">116 units</div></div>')
S.append(onboard('B02 Onboarding 1', 'Fresh from the<br>oven, daily', 'Sales, stock and orders for your branch, from the first bake to the evening close.', art1, 0, 'Next',
                 [('Live sales', 'sales'), ('Stock', 'stock'), ('Daily close', 'lock')]))
art2 = (f'<div style="position:absolute;width:240px;height:240px;border-radius:120px;background:radial-gradient(circle at 32% 28%,#C9BEFF 0%,#8E7CFF 35%,#5B48D8 75%,#3F2FB8 100%);box-shadow:0 26px 50px rgba(91,72,216,.40)"></div>'
        f'<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;color:{T["cream"]}">{ic("clock", 54, T["honey"], 1.6)}'
        f'<div style="font:600 56px/60px Urbanist,serif">2:00</div><div style="font:600 13px Urbanist;letter-spacing:2px;color:{T["honey"]}">AM · DAY CLOSES</div></div>')
S.append(onboard('B02b Onboarding 3', 'The day ends<br>at 2 AM', 'A sale rung up at 9 pm belongs to that evening even if it reaches the office next morning. A late shift is never split across two days.', art2, 2, 'Get Started'))

# 02c Login --------------------------------------------------------------
S.append(f'''<div class="screen" data-name="B02c Login">{statusbar()}
<div style="height:220px;margin:0 0 0;background:linear-gradient(160deg,#A594FF 0%,#7F6BF2 50%,#5B48D8 100%);overflow:hidden;border-radius:0 0 36px 36px;position:relative;display:flex;align-items:flex-end;padding:0 24px 28px;margin-top:-47px;padding-top:47px">
{d3('sphere', -30, 18, 150)}{d3('ring', 10, -34, 70, 'right', 'bottom')}<div class="col" style="gap:14px;position:relative"><div class="logo-lg" style="width:64px;height:64px"></div>
<div style="font:600 32px/38px Urbanist;color:{T['cream']}">Welcome back</div></div></div>
<div class="body" style="padding-top:24px;gap:18px"><div class="p">Sign in to open your branch.</div>
{field('Email', 'you@mountainbakes.com', ph=True, req=True, icon='mail')}
{field('Password', '••••••••••', req=True, icon='lock', cls='focus', right=f'<span style="font:600 13px Urbanist;color:{T["primary"]}">Show</span>')}
<div class="between"><div class="row" style="gap:10px">{checkbox(True)}<div class="col" style="gap:0"><div class="h3" style="font-size:14px">Remember me</div><div class="xs">Fills in your email next time.</div></div></div>
<div style="font:600 13px Urbanist;color:{T['primary']}">Forgot password?</div></div>
<div style="flex:1"></div>{btn('Sign In', 'primary', None, 'full')}
<div class="row" style="justify-content:center;gap:6px" >{ic('lock', 14, T['text3'])}<span class="xs">Your password is never saved on this phone.</span></div></div></div>''')

# 03 Home ---------------------------------------------------------------
home = topbar() + f'''<div class="body pb" style="padding-top:8px">
{title("Mon 12 Oct 2026", "Today's overview", None, f'<div class="iconbtn">{ic("refresh")}</div>')}
{seg(['Today', 'Week', 'Month'], 0)}
{card(f"""<div class="between"><div class="eyebrow">Sales · today</div><span class="pill" style="background:rgba(255,255,255,.14);color:{T['cream']}">{ic('arrowup', 12)} 8.4% vs Sun</span></div>
<div style="font:600 36px/42px Urbanist;color:{T['cream']};font-variant-numeric:tabular-nums">Rs. 19,750</div>
<div class="row" style="gap:20px"><div class="col" style="gap:2px"><div class="sm">Net (sales − expenses)</div><div style="font:600 16px Urbanist;color:{T['cream']}">Rs. 19,450</div></div>
<div class="col" style="gap:2px"><div class="sm">Orders</div><div style="font:600 16px Urbanist;color:{T['cream']}">31</div></div><div class="col" style="gap:2px"><div class="sm">Avg order</div><div style="font:600 16px Urbanist;color:{T['cream']}">Rs. 637</div></div></div>""", 'hero')}
<div class="grid3">{kpi('Expenses', 'Rs. 300', 'from till')}{kpi('Discounts', 'Rs. 200', '2 claims')}{kpi('Returns', '0', 'units')}</div>
{section('Last 7 days', link('Reports'))}
{card(f"""<div class="between"><div class="col" style="gap:2px"><div class="xs">Avg per day</div><div class="h3">Rs. 31,979</div></div>{pill('Sun 11 · Rs. 41,200', 'brand')}</div>
{bars([28, 33, 25, 36, 30, 41, 20], ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'], on=5)}""")}
{section('Top sellers', seg(['Sales', 'Qty'], 0).replace('class="seg"', 'class="seg" style="width:130px"'))}
{card(''.join(f'<div class="li"><div class="thumb">{a}</div><div class="grow col" style="gap:2px"><div class="h3" style="font-size:15px">{n}</div><div class="xs">{q} sold</div></div><div class="amt">{v}</div></div>' for a, n, q, v in [
    ('CP', 'Cream Puff', 42, 'Rs. 6,300'), ('FP', 'Fudge Pastry', 18, 'Rs. 3,240'), ('BB', 'Banana Bread', 7, 'Rs. 2,450'), ('ND', 'Filled Donuts', 15, 'Rs. 2,250')]), '', 'gap:0;padding:4px 16px')}
{section('Payment methods')}
{card(f"""<div class="row" style="gap:18px">{donut([(84.5, T['primary']), (15.5, T['honey'])], 112, 16, '<div class="h3">252</div><div class="xs">sales</div>')}
<div class="col grow" style="gap:12px"><div class="col" style="gap:2px"><div class="row" style="gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:{T['primary']};display:block"></i><span class="sm">Cash · 84.5%</span></div><div class="amt">Rs. 189,250</div></div>
<div class="col" style="gap:2px"><div class="row" style="gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:{T['honey']};display:block"></i><span class="sm">Easypaisa · 15.5%</span></div><div class="amt">Rs. 34,600</div></div></div></div>""")}
{section('Branch stock', link('Open stock'))}
<div class="grid2">{kpi('Previous', 'Rs. 20,700', '56 items carried in')}{kpi('New stock', 'Rs. 35,850', '161 items')}{kpi('Sold', 'Rs. 10,500', '59 items')}{kpi('Remaining', 'Rs. 45,000', '151 items · 0 diff', T['success'])}</div>
<div class="sm" style="text-align:center">Valued at current prices · agrees with the Stock page</div>
</div>'''
S.append(screen('B03 Home', '', TABS, 'Home', height=1720).replace('@@BODY@@', home))

# 04 New Orders ---------------------------------------------------------
def order_card(oid, st, date, req, vp, p, vq, q, pack, reason=None):
    rs = f'<div class="banner warn" style="padding:8px 12px">Reason · {e(reason)}</div>' if reason else ''
    return card(f'''<div class="between"><div class="col" style="gap:2px"><div class="h3">{oid}</div><div class="xs">{date} · Required {req}</div></div>{status(st)}</div>
<div class="grid3" style="background:{T['tint']};border-radius:14px;padding:10px 12px">{mini('Products', f'{vp} / {p}')}{mini('Qty', f'{vq} / {q}')}{mini('Packing', pack)}</div>{rs}''')
orders = topbar('Production orders · last 7 days') + '<div class="body pb" style="padding-top:8px">' + title(None, 'New orders', None, f'<div class="iconbtn">{ic("refresh")}</div>') + \
    chips([('All', 20), ('Pending', 1), ('Approved', 17), ('Changed', 2)], 0) + \
    order_card('DMD-000281', 'Pending', '12 Oct · 22:50', '13 Oct', 9, 9, 70, 70, 2) + \
    order_card('DMD-000278', 'Changed', '11 Oct · 21:15', '12 Oct', 8, 9, 54, 62, 1, 'Fudge Pastry short at production — 8 cut') + \
    order_card('DMD-000276', 'Approved', '10 Oct · 22:02', '11 Oct', 11, 11, 88, 88, 3) + \
    order_card('DMD-000273', 'Approved', '09 Oct · 21:40', '10 Oct', 10, 10, 71, 71, 2) + \
    '<div class="between"><span class="xs">Showing 4 of 20</span>' + pager(('1', '2', '3'), 0) + '</div></div>'
S.append(screen('B04 New Orders', '', TABS, 'Orders', fab='New order', height=1000).replace('@@BODY@@', orders))

# 05 Create Order (sheet) ---------------------------------------------
prod_rows = [('Cream Puff', 'Pastry', 20, 150, 12), ('Fudge Pastry', 'Pastry', 4, 180, 10), ('Banana Bread', 'Bread', 7, 350, 4), ('Filled Donuts', 'Donuts', 2, 150, 12), ('Classic Brownie', 'Brownie', 0, 200, 6)]
rows = ''.join(f'<div class="li"><div class="grow col" style="gap:2px"><div class="h3" style="font-size:14px">{n}</div><div class="xs">{c} · stock {s} · Rs. {r}</div></div>{stepper(q)}</div>' for n, c, s, r, q in prod_rows)
co_body = f'''<div class="row" style="gap:8px">{pill('PO-CCB-20261012-2250', 'neutral')}{pill('Committee Chowk', 'brand')}</div>
{search('Search products…')}
<div class="card flat" style="padding:4px 16px;gap:0">{rows}</div>
<div class="grid2">{btn('Packing material', 'secondary', 'plus', 'sm')}{btn('Special order item', 'secondary', 'plus', 'sm')}</div>
{field('Required date', '13 Oct 2026', req=True, icon='calendar', help='The order cannot be submitted without it.')}
<div class="card tint" style="flex-direction:row;justify-content:space-between">{mini('Products', '5')}{mini('Quantity', '44')}{mini('Amount', 'Rs. 8,860')}</div>'''
S.append(sheet_screen('B05 Create Order', title(None, 'New orders'), co_body, 'New production order', None,
                      btn('Save draft', 'secondary', None, 'grow') + btn('Submit order', 'primary', None, 'grow'), 70, 1010))

# 06 Return Items (sheet) ----------------------------------------------
ri = f'''<div class="grid2">{field('Date', '12 Oct 2026', icon='calendar')}{field('Time', '21:44', icon='clock')}</div>
<div class="card flat" style="padding:4px 16px;gap:0"><div class="li"><div class="thumb">BB</div><div class="grow col" style="gap:2px"><div class="h3" style="font-size:14px">Banana Bread</div><div class="xs">7 available</div></div>{stepper(2)}</div>
<div class="li"><div class="thumb">{ic('plus', 18)}</div><div class="grow" style="font:600 14px Urbanist;color:{T['primary']}">Add another product</div></div></div>
{field('Return reason', 'Damaged / unsold / expired…', ph=True)}
{photo_picker(True, 'Capture or upload a photo of the returned items.', 'Return photo')}
<div class="card tint" style="flex-direction:row;justify-content:space-between">{mini('Products', '1')}{mini('Total units', '2')}{mini('Branch', 'Committee Chowk')}</div>'''
S.append(sheet_screen('B06 Return Items', title(None, 'Branch stock'), ri, 'Return items', 'Sent back to Production for review.', btn('Cancel', 'secondary', None, 'grow') + btn('Save return', 'primary', None, 'grow'), 80))

# 07 Request Discount (sheet) ------------------------------------------
rd = f'''{select('Demand', 'DMD-000281 · 12 Oct · Rs. 8,850', req=True)}
{field('Amount', '400', pre='Rs.', cls='focus', req=True)}
{field('Reason', 'What is the discount for? Production reads this to decide.', ph=True, cls='area', req=True)}
<div class="eyebrow" style="margin-top:4px">Your recent requests</div>
<div class="card flat" style="padding:4px 16px;gap:0">''' + ''.join(
    f'<div class="li"><div class="grow col" style="gap:2px"><div class="h3" style="font-size:14px">{a} · {d}</div><div class="xs">{r}</div></div><div class="col" style="align-items:flex-end;gap:4px"><div class="amt">{v}</div>{status(s)}</div></div>'
    for a, d, r, v, s in [('DMD-000278', '11 Oct', 'All discount kiya hai', 'Rs. 400', 'Pending'), ('DMD-000273', '09 Oct', 'Special customers', 'Rs. 1,300', 'Approved')]) + '</div>'
S.append(sheet_screen('B07 Request Discount', title(None, 'Discounts'), rd, 'Request discount', None, btn('Send request', 'primary', 'send', 'full'), 90))

# 08 Cash Deposit (sheet) -----------------------------------------------
cd = f'''<div class="grid2">{field('Date', '12 Oct 2026', icon='calendar')}{field('Branch', 'Committee Chowk')}</div>
{banner('1 deposit already made for this date (<b>CT-000043</b>). Enter only what this deposit adds.', 'info')}
<div class="between"><div class="eyebrow">Payment details</div>{btn('Auto-fill from DSR', 'soft', 'refresh', 'xs')}</div>
<div class="grid3">{field('Cash', '15,350', pre='Rs.')}{field('Easypaisa', '4,100', pre='Rs.')}{field('Bank', '0', pre='Rs.')}</div>
<div class="card tint" style="flex-direction:row;justify-content:space-between;align-items:center"><div class="col" style="gap:2px"><div class="h3">Total amount</div><div class="xs">Cash + Easypaisa + Bank</div></div><div style="font:600 22px Urbanist;color:{T['primary']}">Rs. 19,450</div></div>
{field('Fuel charges', '300', pre='Rs.', help='Delivery charges collected. Booked separately as Fuel income, not part of the total.')}
{photo_picker(True, 'Not needed when only fuel charges are entered.', 'Payment picture')}'''
S.append(sheet_screen('B08 Cash Deposit', title(None, 'Cash transfers'), cd, 'Cash deposit', 'Finance approves it and posts the receipt.', btn('Cancel', 'secondary', None, 'grow') + btn('Save deposit', 'primary', None, 'grow'), 56, 1110))

# 09 Sales ---------------------------------------------------------------
sales_list = ''.join(card(f'''<div class="between" style="align-items:flex-start;gap:12px"><div class="grow col" style="gap:4px"><div class="h3" style="font-size:15px">{prods} <span style="white-space:nowrap">· {q} units</span></div><div class="xs">{i} · {t}{(' · ' + c) if c else ''}</div></div>
<div class="col" style="align-items:flex-end;gap:4px;flex-shrink:0"><div class="amt">{a}</div>{pill(p, 'brand' if p == 'Cash' else 'berry')}</div></div>''', 'flat')
    for c, i, t, a, p, prods, q in [(None, 'MB-104512', '21:40', 'Rs. 1,050', 'Cash', 'Cream Puff ×4, Fudge Pastry ×2', 6),
                                    ('Ayesha Khan', 'MB-104511', '21:12', 'Rs. 2,400', 'Easypaisa', 'Lotus Cake Bento ×2', 2),
                                    (None, 'MB-104510', '20:55', 'Rs. 450', 'Cash', 'Filled Donuts ×3', 3)])
sales = topbar('Sales on 12 Oct · 17 recorded') + f'''<div class="body pb" style="padding-top:8px">{title('Mon 12 Oct 2026', "Today's sales", None, f'<div class="iconbtn">{ic("calendar")}</div>')}
{card(f"""<div class="eyebrow">Total sales · after discount</div><div style="font:600 34px Urbanist;color:{T['cream']}">Rs. 10,450</div>
<div class="row" style="gap:24px"><div class="col" style="gap:2px"><div class="sm">Gross (qty × rate)</div><div style="font:600 15px Urbanist;color:{T['cream']}">Rs. 10,500</div></div><div class="col" style="gap:2px"><div class="sm">Discount</div><div style="font:600 15px Urbanist;color:{T['honey']}">− Rs. 50</div></div></div>""", 'hero')}
<div class="grid3">{kpi('Cash', 'Rs. 8,900')}{kpi('Easypaisa', 'Rs. 1,550')}{kpi('Items', '59', '9 products')}</div>
{chips([('All', 17), ('Cash', 14), ('Easypaisa', 3)], 0)}{sales_list}</div>'''
S.append(screen('B09 Sales', '', TABS, 'Sales', fab='New sale', height=1180).replace('@@BODY@@', sales))

# 10 New Sale (full screen) -----------------------------------------------
items = ''.join(f'''<div class="card flat" style="gap:10px"><div class="between"><div class="h3" style="font-size:15px">{n}</div><div class="iconbtn ghost" style="width:28px;height:28px">{ic('x', 18, T['text3'])}</div></div>
<div class="between">{stepper(q)}<div class="col" style="gap:0;align-items:flex-end"><div class="xs">Rs. {r} each{(' · −Rs. ' + str(d)) if d else ''}</div><div class="amt">Rs. {q*r-d:,}</div></div></div></div>''' for n, q, r, d in [('Cream Puff', 4, 150, 0), ('Fudge Pastry', 2, 180, 50)])
ns = appbar('New sale', '21:44 · Committee Chowk', back=True) + f'''<div class="body" style="padding-top:4px">
<div class="eyebrow">Customer (optional)</div><div class="grid2">{field('Name', 'Walk-in customer', ph=True)}{field('Mobile', '03xx xxxxxxx', ph=True)}</div>
<div class="between"><div class="eyebrow">Items</div>{btn('Add item', 'soft', 'plus', 'xs')}</div>{items}
<div class="eyebrow">Payment method</div>{seg(['Cash', 'Easypaisa', 'Bank'], 0)}
{field('Received cash', '1,500', pre='Rs.', cls='focus')}
<div class="card flat sum"><div class="between">Subtotal<b>Rs. 960</b></div><div class="between">Discount<b>− Rs. 50</b></div><div class="between">Government tax<b>Rs. 0</b></div>
<div class="divider"></div><div class="between" style="font-size:16px;color:{T['text']}"><span style="font-weight:600">Grand total</span><b style="font-size:20px">Rs. 910</b></div><div class="between">Cash returned<b style="color:{T['success']}">Rs. 590</b></div></div></div>'''
S.append(screen('B10 New Sale', '', footer=btn('Save sale', 'secondary', None, 'grow') + btn('Save & print', 'primary', 'printer', 'grow'), height=1100).replace('@@BODY@@', ns))

# 11 Stock ---------------------------------------------------------------
def stock_row(n, i, bal, o, nw, sold, ret, adj, flag=None):
    return card(f'''<div class="between"><div class="col" style="gap:2px"><div class="h3" style="font-size:15px">{n}</div><div class="xs">{i}</div></div>
<div class="col" style="align-items:flex-end;gap:0"><div style="font:600 22px Urbanist;color:{T['danger'] if flag else T['text']}">{bal}</div><div class="xs">balance</div></div></div>
<div class="grid4" style="background:{T['tint']};border-radius:12px;padding:8px 10px;grid-template-columns:repeat(5,1fr)">{mini('Open', o)}{mini('New', nw)}{mini('Sold', sold)}{mini('Ret', ret)}{mini('Adj', adj)}</div>''', 'flat')
stock = topbar('Committee Chowk · 12 Oct') + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Branch stock', None, btn('Stock check', 'soft', 'check', 'sm'))}
<div class="grid2">{kpi('Balance', '120', 'units on hand', icon='stock')}{kpi('Expected', '120', '0 waiting demand', icon='truck')}</div>
<div class="grid4">{kpi('Open', '56')}{kpi('New', '161')}{kpi('Sold', '94')}{kpi('Adj', '−3')}</div>
{banner('Opening carries over from yesterday; new stock lands when you verify a delivery. Products with no stock and no movement are hidden.', 'brand')}
{search('Search products…', ic('filter', 20))}{chips([('All', 35), ('Low', 6), ('Out', 2)], 0)}
{stock_row('Cream Puff', 'STK-000001', 20, 12, 50, 42, 0, 0)}{stock_row('Fudge Pastry', 'STK-000005', 4, 2, 20, 18, 0, 0)}{stock_row('Banana Bread', 'STK-000014', 0, 7, 0, 7, 0, 0, True)}{stock_row('Filled Donuts', 'STK-000012', 9, 4, 20, 15, 0, 0)}</div>'''
S.append(screen('B11 Stock', '', TABS, 'Stock', height=1300).replace('@@BODY@@', stock))

# 12 Stock Check (sheet) ------------------------------------------------
sc_rows = ''.join(f'<div class="tr"><div class="grow">{n}</div><div class="c">{b}</div><div class="c w"><div class="input" style="height:36px;border-radius:10px;padding:0 10px;font-size:14px;justify-content:center{";border-color:" + T["danger"] if d else ""}">{c}</div></div><div class="c">{pill(("+" if d > 0 else "") + str(d), "bad" if d else "ok") if c != "" else ""}</div></div>'
                  for n, b, c, d in [('Cream Puff', 20, 20, 0), ('Fudge Pastry', 4, 3, -1), ('Filled Donuts', 9, 9, 0), ('Plain Donuts', 6, 6, 0), ('Nutella Pastry', 5, '', 0), ('Lotus Pastry', 8, '', 0)])
scb = f'''<div class="p">Count what is on the shelf, then Verify. Nothing here is saved, it only compares your count with the balance.</div>
<div class="card flat" style="padding:8px 16px;gap:0"><div class="tr th"><div class="grow">Product</div><div class="c">Bal</div><div class="c w" style="text-align:center">Count</div><div class="c">Diff</div></div>{sc_rows}</div>
<div class="card tint" style="flex-direction:row;justify-content:space-between">{mini('Counted', '4 of 35')}{mini('Differences', '1', T['danger'])}{mini('Hidden', '8 at zero')}</div>'''
S.append(sheet_screen('B12 Stock Check', title(None, 'Branch stock'), scb, 'Stock check', 'Committee Chowk · 12 Oct 2026', btn('Clear', 'secondary', None, 'grow') + btn('Verify', 'primary', 'check', 'grow'), 90))

# 13 Return Stock --------------------------------------------------------
def ret_card(p, q, d, st, rid, rev=None):
    rv = f' · Reviewed {rev}' if rev else ''
    acts = f'<div class="row" style="gap:8px">{btn("Change", "secondary", "edit", "xs")}{btn("Delete", "danger", "trash", "xs")}</div>' if st == 'Pending' else btn('View', 'secondary', None, 'xs')
    return card(f'''<div class="between"><div class="row" style="gap:12px"><div class="thumb">{ic('return', 20)}</div><div class="col" style="gap:2px"><div class="h3" style="font-size:15px">{p} <span style="color:{T['text3']}">×{q}</span></div><div class="xs">{d}</div></div></div>{status(st)}</div>
<div class="between"><span class="xs">{rid}{rv}</span>{acts}</div>''', 'flat')
rs = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Return stock', 'Stock sent back to Production · last 90 days. Change or delete a return until Production reviews it.')}
<div class="row" style="gap:8px">{search('Search product…')}<div class="iconbtn">{ic('filter')}</div></div>
{chips([('All', 12), ('Pending', 2), ('Approved', 9), ('Rejected', 1)], 0)}
{ret_card('Banana Bread', 2, '12 Oct · 21:44', 'Pending', 'B1C5DBA1')}{ret_card('Lotus 1 Pound Cake', 1, '11 Oct · 20:10', 'Approved', '1967A3DC', '12 Oct')}
{ret_card('Oreo 1 Pound Cake', 1, '10 Oct · 19:02', 'Rejected', '4202432A', '11 Oct')}{ret_card('Chocolate Tart', 2, '09 Oct · 22:30', 'Approved', '04920CCE', '10 Oct')}
{pager(('1', '2', '3'), 0)}</div>'''
S.append(screen('B13 Return Stock', '', TABS, 'Stock', fab='Return items', height=1080).replace('@@BODY@@', rs))

# 14 Discounts -----------------------------------------------------------
def disc_card(dm, d, a, st, r, did, rev=None):
    acts = f'<div class="row" style="gap:8px">{btn("Change", "secondary", "edit", "xs")}{btn("Withdraw", "danger", None, "xs")}</div>' if st == 'Pending' else btn('View', 'secondary', None, 'xs')
    return card(f'''<div class="between"><div class="col" style="gap:2px"><div class="h3" style="font-size:15px">{dm}</div><div class="xs">{d}</div></div><div class="col" style="align-items:flex-end;gap:4px"><div class="amt">{a}</div>{status(st)}</div></div>
<div class="p" style="color:{T['text']}">“{r}”</div><div class="between"><span class="xs">{did}{(' · Reviewed ' + rev) if rev else ''}</span>{acts}</div>''', 'flat')
ds_ = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Discounts', 'Money claimed back against a demand · last 90 days.')}
<div class="grid2">{kpi('Pending', 'Rs. 1,250', '2 claims', T['warning'])}{kpi('Approved', 'Rs. 6,900', '14 claims', T['success'])}</div>
{field('Date range', '13 Jul – 12 Oct 2026', icon='calendar')}{chips([('All', 18), ('Pending', 2), ('Approved', 14), ('Rejected', 2)], 0)}
{disc_card('DMD-000278', '11 Oct · 21:30', 'Rs. 400', 'Pending', 'All discount kiya hai', '3958A363')}
{disc_card('DMD-000276', '10 Oct · 22:05', 'Rs. 850', 'Approved', 'All discount kiya ha', 'D7833791', '11 Oct')}
{disc_card('DMD-000273', '09 Oct · 21:48', 'Rs. 1,300', 'Approved', 'All discount kiya hai', '63051A4F', '10 Oct')}</div>'''
S.append(screen('B14 Discounts', '', TABS, 'More', fab='Request', height=1150).replace('@@BODY@@', ds_))

# 15 Cash Transfers -------------------------------------------------------
def ct_card(cid, d, tot, st, cash, ep, fuel, note, voucher=None):
    v = f'<span class="pill ok">{voucher}</span>' if voucher else '<span class="xs">Waiting for Finance</span>'
    return card(f'''<div class="between"><div class="col" style="gap:2px"><div class="h3">{cid}</div><div class="xs">{d}</div></div><div class="col" style="align-items:flex-end;gap:4px"><div class="amt" style="font-size:17px">{tot}</div>{status(st)}</div></div>
<div class="grid4" style="background:{T['tint']};border-radius:12px;padding:8px 10px">{mini('Cash', cash)}{mini('Easypaisa', ep)}{mini('Bank', '0')}{mini('Fuel', fuel)}</div>
<div class="between"><span class="sm">“{note}”</span>{v}</div>''', 'flat')
ct = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Cash transfers', 'Cash, Easypaisa and bank money handed to the company · last 90 days.')}
<div class="grid2">{kpi('Awaiting Finance', 'Rs. 60,450', '2 transfers', T['warning'], 'clock')}{kpi('Approved', 'Rs. 812,300', '41 transfers', T['success'], 'check')}</div>
{chips([('All', 43), ('Awaiting', 2), ('Approved', 41)], 0)}
{ct_card('CT-000043', '12 Oct · 09:23', 'Rs. 27,900', 'Awaiting Finance', '27,900', '0', '300', 'Ep+1000 cash +35500')}
{ct_card('CT-000039', '11 Oct · 10:53', 'Rs. 32,550', 'Awaiting Finance', '27,600', '4,950', '300', 'Cash+27950 Ep+4950')}
{ct_card('CT-000026', '06 Oct · 13:40', 'Rs. 23,587', 'Approved', '16,687', '6,900', '300', 'Cash+23730+Ep+6900', 'RV-000298')}</div>'''
S.append(screen('B15 Cash Transfers', '', TABS, 'More', fab='Cash deposit', height=1180).replace('@@BODY@@', ct))

# 16 Shop Expenses --------------------------------------------------------
ex_rows = ''.join(f'<div class="li"><div class="thumb">{ic(i, 20)}</div><div class="grow col" style="gap:2px"><div class="h3" style="font-size:14px">{d}</div><div class="xs">{c} · {dt} · {pay}</div></div><div class="amt">{a}</div></div>'
                  for d, c, dt, pay, a, i in [('Gas cylinder refill', 'Utilities', '12 Oct', 'Cash', 'Rs. 300', 'settings'), ('Cleaning supplies', 'Other', '11 Oct', 'Cash', 'Rs. 450', 'box'),
                                              ('Rickshaw for delivery', 'Transport', '10 Oct', 'Cash', 'Rs. 250', 'truck'), ('Shop bulbs', 'Maintenance', '09 Oct', 'Easypaisa', 'Rs. 600', 'settings'),
                                              ('Tissue & bags', 'Packaging', '08 Oct', 'Cash', 'Rs. 380', 'box'), ('Water bottles', 'Other', '07 Oct', 'Cash', 'Rs. 200', 'box')])
se = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Shop expenses', None, f'<div class="iconbtn">{ic("download")}</div>')}
{card(f"""<div class="eyebrow">Since 06 Oct · 15 expenses</div><div style="font:600 32px Urbanist;color:{T['cream']}">Rs. 4,180</div><div class="sm">Paid from the till: Rs. 3,580 · Easypaisa: Rs. 600</div>""", 'hero')}
{field('Date range', '06 Oct – 12 Oct 2026', icon='calendar')}{chips([('All', 15), ('Utilities', 4), ('Transport', 3), ('Other', 8)], 0)}
<div class="card" style="padding:4px 16px;gap:0">{ex_rows}</div></div>'''
S.append(screen('B16 Shop Expenses', '', TABS, 'More', fab='Expense', height=1040).replace('@@BODY@@', se))

# 17 New Shop Expense (sheet) -------------------------------------------
cats = '<div class="row" style="gap:8px;flex-wrap:wrap">' + ''.join(f'<div class="chip{" on" if i == 0 else ""}">{c}</div>' for i, c in enumerate(['Utilities', 'Transport', 'Maintenance', 'Packaging', 'Other'])) + '</div>'
ne = f'''<div class="grid2">{field('Date', '12 Oct 2026', icon='calendar')}{field('Amount', '300', pre='Rs.', cls='focus', req=True)}</div>
<div class="field"><div class="label">Category<span class="req"> *</span></div>{cats}</div>
{field('Description', 'Gas cylinder refill', req=True)}
<div class="field"><div class="label">Payment method</div>{seg(['Cash', 'Easypaisa', 'Bank'], 0)}</div>
{field('Remarks (optional)', 'Any notes…', ph=True, cls='area')}'''
S.append(sheet_screen('B17 New Shop Expense', title(None, 'Shop expenses'), ne, 'New expense', None, btn('Save expense', 'primary', None, 'full'), 150))

# 18 Special Events -------------------------------------------------------
cal = '<div class="grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center">' + ''.join(f'<div class="xs" style="padding:4px 0">{d}</div>' for d in 'MTWTFSS')
for d in range(-2, 31):
    if d < 1:
        cal += '<div></div>'; continue
    ev = d in (16, 24, 31)
    today = d == 12
    st = f'background:{T["primary"]};color:#fff' if ev else (f'border:1.5px solid {T["cocoa"]}' if today else '')
    cal += f'<div style="height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font:600 13px Urbanist;{st}">{d}</div>'
cal += '</div>'
def ev_row(n, d, h, tag, days, due):
    return f'<div class="li"><div class="col" style="width:52px;height:56px;border-radius:16px;background:{T["primarySoft"]};align-items:center;justify-content:center;gap:0;flex-shrink:0"><div style="font:600 20px Urbanist;color:{T["primary"]}">{d.split()[0]}</div><div class="xs" style="color:{T["primary"]}">{d.split()[1].upper()}</div></div><div class="grow col" style="gap:3px"><div class="h3" style="font-size:15px">{n}</div><div class="xs">{h} · estimated</div><div class="row" style="gap:6px">{pill(tag, "neutral")}{pill("Due " + due, "warn")}</div></div><div class="xs">{days}</div></div>'
se_ = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Special events')}
{card(f"""<div class="between"><div class="eyebrow">Next event · in 4 days</div>{ic('event', 20, T['honey'])}</div><div style="font:600 26px Urbanist;color:{T['cream']}">World Food Day</div>
<div class="sm">Fri 16 Oct 2026 · advance demand due today</div>{btn('Add advance demand', 'primary', 'plus', 'sm')}""", 'hero')}
<div class="grid3">{kpi('Upcoming', '14')}{kpi('Due soon', '2', None, T['warning'])}{kpi('Days to next', '4')}</div>
{seg(['List', 'Calendar'], 1)}
{card(f'<div class="between"><div class="h3">October 2026</div><div class="row" style="gap:6px"><div class="iconbtn" style="width:34px;height:34px">{ic("left", 18)}</div><div class="iconbtn" style="width:34px;height:34px">{ic("right", 18)}</div></div></div>{cal}')}
<div class="card" style="padding:4px 16px;gap:0">{ev_row('World Food Day', '16 Oct', '5 Jumada al-Awwal 1448 AH', 'International', 'in 4 days', '12 Oct')}{ev_row('Martyrdom of Lady Fatimah Zahra (S.A.)', '24 Oct', '13 Jumada al-Awwal 1448 AH', 'Ahlul Bayt', 'in 12 days', '20 Oct')}{ev_row('Halloween', '31 Oct', '20 Jumada al-Awwal 1448 AH', 'International', 'in 19 days', '27 Oct')}</div></div>'''
S.append(screen('B18 Special Events', '', TABS, 'More', height=1400).replace('@@BODY@@', se_))

# 19 Event Demand ----------------------------------------------------------
ed_items = ''.join(f'<div class="li"><div class="thumb">{a}</div><div class="grow col" style="gap:2px"><div class="h3" style="font-size:14px">{n}</div><div class="xs">Rs. {r} each</div></div>{stepper(q)}</div>' for a, n, r, q in [('CP', 'Cream Puff', 150, 40), ('RV', 'Red Velvet Pastry', 200, 24), ('LC', 'Lotus Cake Bento', 1200, 6)])
ed = appbar('Advance demand', 'World Food Day', back=True) + f'''<div class="body" style="padding-top:4px">
{card(f'<div class="between"><div class="col" style="gap:2px"><div class="h3">World Food Day</div><div class="xs">Fri 16 Oct 2026 · 5 Jumada al-Awwal 1448 AH</div></div>{pill("in 4 days", "brand")}</div>{banner("Due by <b>12 Oct 2026</b>. Production plans the bake from this.", "warn", "clock")}', 'flat')}
<div class="eyebrow">Products</div>{search('Search products to add…')}
<div class="card" style="padding:4px 16px;gap:0">{ed_items}</div>
{field('Expected customers (optional)', '250', icon='users')}
{field('Notes for Production', 'Anything Production should know…', ph=True, cls='area')}
<div class="card tint" style="flex-direction:row;justify-content:space-between">{mini('Products', '3')}{mini('Units', '70')}{mini('Value', 'Rs. 18,000')}</div></div>'''
S.append(screen('B19 Event Demand', '', footer=btn('Save draft', 'secondary', None, 'grow') + btn('Submit to Production', 'primary', 'send', 'grow'), height=1060).replace('@@BODY@@', ed))

# 20 Branch Closing --------------------------------------------------------
cl_rows = ''.join(f'<div class="tr"><div class="grow">{n}</div><div class="c">{o}</div><div class="c">{r}</div><div class="c">{s}</div><div class="c">0</div><div class="c" style="font-weight:600">{b}</div></div>'
                  for n, o, r, s, b in [('Cream Puff', 12, 50, 42, 20), ('Fudge Pastry', 2, 20, 18, 4), ('Filled Donuts', 4, 20, 15, 9), ('Banana Bread', 7, 0, 7, 0), ('Plain Donuts', 3, 10, 7, 6)])
bc = appbar('Branch closing', BR, back=True, actions=['printer', 'download']) + f'''<div class="body">
{field('Business date', '12 Oct 2026', icon='calendar', help='End-of-day summary. This is a read of the day, not a lock on it.')}
{card(f"""<div class="eyebrow">Net for the day</div><div style="font:600 36px Urbanist;color:{T['cream']}">Rs. 19,450</div>
<div class="grid3" style="gap:12px"><div class="col" style="gap:2px"><div class="sm">Sales</div><div style="font:600 15px Urbanist;color:{T['cream']}">Rs. 19,750</div></div><div class="col" style="gap:2px"><div class="sm">Expenses</div><div style="font:600 15px Urbanist;color:{T['cream']}">Rs. 300</div></div><div class="col" style="gap:2px"><div class="sm">Cash in hand</div><div style="font:600 15px Urbanist;color:{T['honey']}">Rs. 15,350</div></div></div>""", 'hero')}
{section('Takings by payment')}
{card(f"""<div class="li" style="padding-top:0"><div class="thumb">{ic('cash', 20)}</div><div class="grow col" style="gap:2px"><div class="h3" style="font-size:15px">Cash</div><div class="xs">24 orders</div></div><div class="amt">Rs. 15,650</div></div>
<div class="li"><div class="thumb">{ic('phone', 20)}</div><div class="grow col" style="gap:2px"><div class="h3" style="font-size:15px">Easypaisa</div><div class="xs">7 orders</div></div><div class="amt">Rs. 4,100</div></div>
<div class="li" style="padding-bottom:0"><div class="grow sm">Orders / cancelled · Discounts given · Till expenses</div><div class="sm" style="color:{T['text']};font-weight:600">31/0 · Rs. 200 · Rs. 300</div></div>""", '', 'gap:0')}
{section('Closing stock')}
<div class="sm" style="margin-top:-8px">94 sold · 0 returned to Production · 116 left on the shelf</div>
{card(f'<div class="tr th"><div class="grow">Product</div><div class="c">Open</div><div class="c">Recv</div><div class="c">Sold</div><div class="c">Ret</div><div class="c">Bal</div></div>{cl_rows}<div class="tr" style="font-weight:600"><div class="grow">Total · 43 products</div><div class="c">56</div><div class="c">161</div><div class="c">94</div><div class="c">0</div><div class="c">116</div></div>', '', 'gap:0')}
{link('Show all 43 products')}</div>'''
S.append(screen('B20 Branch Closing', '', height=1360).replace('@@BODY@@', bc))

# 21 Daily Sale Record ------------------------------------------------------
def dsr(d, t, src, st, tot, share, cash, ep, exp, cot, diff, dk):
    return card(f'''<div class="between"><div class="col" style="gap:2px"><div class="h3">{d}</div><div class="xs">{t} · {src}</div></div>{status(st)}</div>
<div class="grid3" style="background:{T['tint']};border-radius:12px;padding:10px 12px;row-gap:10px">{mini('Total sale', tot)}{mini('Company share', share)}{mini('Cash', cash)}{mini('Easypaisa', ep)}{mini('Expense', exp)}{mini('On table', cot)}</div>
<div class="between">{pill(diff, dk)}{btn('Open', 'secondary', None, 'xs')}</div>''', 'flat')
dr = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Daily sale record', "The day's takings against what was physically counted.", '')}
<div class="grid2">{btn('Generate today', 'primary', 'refresh', 'sm')}{btn('Manual feed', 'secondary', 'edit', 'sm')}</div>
{card(f"""<div class="eyebrow">Total sale · 01–12 Oct</div><div style="font:600 32px Urbanist;color:{T['cream']}">Rs. 453,480</div>
<div class="grid2"><div class="col" style="gap:2px"><div class="sm">Company share</div><div style="font:600 15px Urbanist;color:{T['cream']}">Rs. 340,110</div></div><div class="col" style="gap:2px"><div class="sm">Cash on table</div><div style="font:600 15px Urbanist;color:{T['cream']}">Rs. 354,100</div></div></div>""", 'hero')}
{banner('This window is out by <b>Rs. 20 (over)</b>. Open each day with a difference and check it against the counted amount. 1 day has nothing counted yet.', 'warn', 'alert')}
{chips([('All', 12), ('Matched', 10), ('Difference', 1), ('Not counted', 1)], 0)}
{dsr('Mon 12 Oct', '23:58', 'Generated', 'Pending', '19,750', '14,812', '15,650', '4,100', '300', '15,350', 'Not counted yet', 'neutral')}
{dsr('Sun 11 Oct', '23:40', 'Generated', 'Matched', '41,200', '30,900', '35,900', '5,300', '0', '35,900', 'No difference', 'ok')}
{dsr('Sat 10 Oct', '23:51', 'Manual', 'Over', '36,100', '27,075', '31,520', '4,580', '0', '31,540', 'Rs. 20 over', 'warn')}</div>'''
S.append(screen('B21 Daily Sale Record', '', TABS, 'More', height=1300).replace('@@BODY@@', dr))

# 22 Manual Feed (sheet) ---------------------------------------------------
mf_rows = ''.join(f'''<div class="field"><div class="between"><div class="label">{l}</div><span class="xs">System: {s}</span></div><div class="input {'ph' if not v else ''}"><span class="pre">Rs.</span><span class="grow">{v or 'Leave blank to keep'}</span>{pill(st, k) if st else ''}</div></div>'''
                  for l, s, v, st, k in [('Cash', 'Rs. 15,650', '15,350', 'Changed', 'berry'), ('Easypaisa', 'Rs. 4,100', '', '', ''), ('Bank', 'Rs. 0', '', '', ''), ('Expense', 'Rs. 300', '', '', ''), ('Cash on table', '—', '15,350', 'New', 'brand')])
mf = f'''<div class="card tint" style="flex-direction:row;justify-content:space-between">{mini('Business date', '12 Oct 2026')}{mini('Total sale', 'Rs. 19,750')}</div>{mf_rows}
<div class="help">Foodpanda is settled by the aggregator and is not counted here.</div>'''
S.append(sheet_screen('B22 Manual Feed', title(None, 'Daily sale record'), mf, 'Manual feed', BR, btn('Cancel', 'secondary', None, 'grow') + btn('Save', 'primary', None, 'grow'), 70))

# 23 Reports ---------------------------------------------------------------
rp = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Reports', None, f'<div class="iconbtn">{ic("download")}</div>')}
{field('Period', '30 Sep – 31 Oct 2026', icon='calendar')}{seg(['Trend', 'Top products', 'Packing'], 0)}
{card(f"""<div class="eyebrow">Revenue · 572 orders</div><div style="font:600 34px Urbanist;color:{T['cream']}">Rs. 453,980</div>
<div class="grid2"><div class="col" style="gap:2px"><div class="sm">Profit (sales − expenses)</div><div style="font:600 15px Urbanist;color:{T['cream']}">Rs. 419,950</div></div><div class="col" style="gap:2px"><div class="sm">Expenses</div><div style="font:600 15px Urbanist;color:{T['cream']}">Rs. 34,030</div></div></div>""", 'hero')}
<div class="grid2">{kpi('Avg order value', 'Rs. 794')}{kpi('Cancelled', '0')}</div>
{card(f"""<div class="between"><div class="h3">Daily sales</div>{pill('Sun 11 · Rs. 41,200', 'brand')}</div>
{line_chart([([22, 28, 25, 31, 27, 35, 30, 33, 29, 38, 34, 41, 20], T['primary'], False), ([18, 20, 21, 22, 20, 24, 23, 24, 22, 25, 24, 27, 16], T['honey'], True)], 318, 130, ['01', '04', '07', '10', '12'])}
{legend([('Revenue', T['primary']), ('Orders ×1k', T['honey'])])}""")}
{card(f"""<div class="h3">Payment methods</div><div class="col" style="gap:10px"><div class="between"><span class="sm">Cash · 479 orders</span><b class="amt">Rs. 388,630</b></div>{progress(85.6)}
<div class="between"><span class="sm">Easypaisa · 93 orders</span><b class="amt">Rs. 65,350</b></div>{progress(14.4, T['honey'])}</div>""")}</div>'''
S.append(screen('B23 Reports', '', TABS, 'More', height=1200).replace('@@BODY@@', rp))

# 24 Help Desk ---------------------------------------------------------------
hd_q = ''.join(card(f'''<div class="between"><div class="col" style="gap:2px"><div class="h3">{r}</div><div class="xs">{m}</div></div>{status(s)}</div><div class="p" style="color:{T['text']}">{i}</div>''', 'flat')
               for r, m, s, i in [('SUP-000515 · DMD-000261', 'Demand · 05 Oct 2026 · 18:57', 'Pending', 'Demand was rejected by mistake — please restore it so we can verify the delivery.'),
                                  ('SUP-000498 · MB-103877', 'Sale · 02 Oct 2026 · 20:14', 'Resolved', 'Sale entered twice at the till. Please delete the duplicate.')])
hd = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Help desk', 'Spotted a problem with a record? Forward it to admin. It stays here until resolved.')}
{chips([('Open', 1), ('Resolved', 1)], 0)}{hd_q}
{card(f'<div class="row" style="gap:12px"><div class="thumb" style="background:{T["primarySoft"]};color:{T["primary"]}">{ic("help", 22)}</div><div class="grow col" style="gap:2px"><div class="h3" style="font-size:15px">Need to report something?</div><div class="xs">Sales, demands, expenses, stock or deposits.</div></div></div>', 'tint')}</div>'''
S.append(screen('B24 Help Desk', '', TABS, 'More', fab='New query').replace('@@BODY@@', hd))

# 25 New Query (sheet) --------------------------------------------------------
nq = f'''<div class="p">Search a sale (MB-…), demand (DMD-…), expense (EXP-…), stock (STK-…) or cash deposit (CT-…) ID. Its details load automatically.</div>
<div class="row" style="gap:8px;align-items:flex-end"><div class="grow">{field('Reference ID', 'DMD-000261', cls='focus')}</div>{btn('Find', 'dark', 'search')}</div>
{card(f'<div class="between"><div class="col" style="gap:2px"><div class="h3">Demand DMD-000261</div><div class="xs">Committee Chowk · 05 Oct 2026 · 18:57</div></div>{status("Rejected")}</div><div class="grid3">{mini("Products", "1")}{mini("Requested", "3")}{mini("Approved", "—")}</div>', 'tint')}
{field('Describe the issue', 'What looks wrong with this record?', ph=True, cls='area', req=True)}'''
S.append(sheet_screen('B25 New Query', title(None, 'Help desk'), nq, 'New query', None, btn('Cancel', 'secondary', None, 'grow') + btn('Submit to admin', 'primary', 'send', 'grow'), 110))

# 26 More (drawer) -----------------------------------------------------------
nav = [('Dashboard', 'home'), ('New orders', 'orders'), ('Sales', 'sales'), ('Stock', 'stock'), ('Return stock', 'return'), ('Discounts', 'tag'), ('Cash deposits', 'wallet'),
       ('Shop expenses', 'cash'), ('Events', 'event'), ('Branch closing', 'lock'), ('Daily sale record', 'book'), ('Reports', 'chart'), ('Help desk', 'help')]
navh = ''.join(f'<div class="navi{" on" if i == 0 else ""}">{ic(icn, 21)}{n}</div>' for i, (n, icn) in enumerate(nav))
S.append(f'''<div class="screen" data-name="B26 More">{statusbar()}<div class="body" style="opacity:.9">{title("Mon 12 Oct 2026", "Today's overview")}</div><div class="scrim"></div>
<div class="drawer"><div style="height:47px"></div><div class="col" style="padding:12px 20px 16px;gap:14px"><div class="row" style="gap:12px"><div class="logo"></div><div class="col" style="gap:1px"><div class="h3">Mountain Bakes</div><div class="xs">Branch Manager</div></div></div>
<div class="card tint" style="padding:10px 12px;flex-direction:row;align-items:center;gap:10px">{ic('home', 18, T['primary'])}<div class="grow h3" style="font-size:14px">{BR}</div></div></div>
<div class="col" style="gap:2px;padding:0 10px;flex:1">{navh}</div>
<div class="row" style="gap:12px;padding:16px 20px 34px;border-top:1px solid {T['border']}"><div class="avatar">MH</div><div class="grow col" style="gap:1px"><div class="h3" style="font-size:14px">Muhammad Hussain</div><div class="xs">ahmed@mountainbakes.com</div></div><div class="iconbtn" style="color:{T['danger']}">{ic('logout')}</div></div></div></div>''')

if __name__ == '__main__':
    import sys
    open(sys.argv[1], 'w').write(page(S, 'Branch'))
    print(len(S))
