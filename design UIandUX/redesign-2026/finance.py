from common import *

TABS = FIN_TABS
S = []

def topbar(sub='Finance Admin'):
    return (f'<div class="appbar"><div class="logo"></div><div class="grow col" style="gap:1px"><div class="h3" style="font-size:15px">Mountain Bakes</div>'
            f'<div class="xs">{e(sub)}</div></div><div class="iconbtn" style="position:relative">{ic("bell")}'
            f'<span style="position:absolute;top:6px;right:6px;min-width:18px;height:18px;border-radius:9px;background:{T["primary"]};color:#fff;font:600 10px Urbanist;display:flex;align-items:center;justify-content:center">6</span></div>'
            f'<div class="avatar">FA</div></div>')

def put(name, body, active, fab=None, height=None):
    S.append(screen(name, '', TABS, active, fab=fab, height=height).replace('@@BODY@@', body))

def full(name, body, footer, height=None):
    S.append(screen(name, '', footer=footer, height=height).replace('@@BODY@@', body))

def hero(eyebrow, big, rows):
    r = ''.join(f'<div class="col" style="gap:2px"><div class="sm">{k}</div><div style="font:600 15px Urbanist;color:{c or T["cream"]}">{v}</div></div>' for k, v, c in rows)
    cols = len(rows)
    return card(f'<div class="eyebrow">{eyebrow}</div><div style="font:600 32px Urbanist;color:{T["cream"]};white-space:nowrap">{big}</div><div style="display:grid;grid-template-columns:repeat({cols},1fr);gap:10px">{r}</div>', 'hero')

def approve_acts():
    return f'<div class="row" style="gap:6px">{btn("View", "secondary", None, "xs")}{btn("Reject", "danger", None, "xs")}{btn("Approve", "primary", "check", "xs")}</div>'

def tx(head, desc, amt, meta, st=None, acts=None, neg=True):
    a = f'<div class="amt {"neg" if neg else "pos"}">{"− " if neg else "+ "}{amt}</div>'
    bottom = f'<div class="between"><span class="xs">{meta}</span>{status(st) if st else ""}</div>'
    if acts: bottom += f'<div class="row" style="justify-content:flex-end">{acts}</div>'
    return card(f'<div class="between" style="align-items:flex-start"><div class="col" style="gap:2px"><div class="h3" style="font-size:15px">{head}</div><div class="sm">{desc}</div></div>{a}</div>{bottom}', 'flat')

def ledger_row(head, desc, amt, meta, bal, neg=True):
    return (f'<div class="li" style="align-items:flex-start"><div class="thumb" style="width:36px;height:36px;border-radius:12px;background:{T["dangerSoft"] if neg else T["successSoft"]};color:{T["danger"] if neg else T["success"]}">{ic("arrowup" if neg else "arrowdown", 18)}</div>'
            f'<div class="grow col" style="gap:2px"><div class="h3" style="font-size:14px">{head}</div><div class="sm">{desc}</div><div class="xs">{meta}</div></div>'
            f'<div class="col" style="align-items:flex-end;gap:2px"><div class="amt {"neg" if neg else "pos"}" style="font-size:14px">{"−" if neg else "+"} {amt}</div><div class="xs">Bal. {bal}</div></div></div>')

# 01 Dashboard ----------------------------------------------------------------
fd = topbar() + f'''<div class="body pb" style="padding-top:8px">{title('October 2026 · All branches', 'Finance dashboard', None, f'<div class="iconbtn">{ic("filter")}</div>')}
{hero('Today · company-wide · cash in hand', 'Rs. 227,068.99', [('Bank', 'Rs. 0.00', None), ('Pending approvals', '28 · Rs. 100,438', T['honey'])])}
{seg(['Income', 'Expenses', 'Balance'], 0)}
<div class="grid2">{kpi('Company share', 'Rs. 648,283', 'Oct to date')}{kpi('Received', 'Rs. 319,166', '49% of share', T['success'])}{kpi('Balance', 'Rs. 329,117', 'not yet received', T['warning'])}{kpi('Last month', 'Rs. 428,980', 'Sep balance')}</div>
{card(f"""<div class="between"><div class="h3">Company share vs received</div>{pill('Daily', 'neutral')}</div>
{line_chart([([12, 18, 22, 19, 25, 21, 28, 24, 30, 26, 29, 33], T['honey'], False), ([8, 10, 15, 12, 16, 11, 19, 14, 20, 15, 17, 12], T['primary'], False)], 318, 120, ['01', '08', '15', '22', '31'])}
{legend([('Company share', T['honey']), ('Received', T['primary'])])}""")}
{card(f"""<div class="h3">Balance reconciliation</div><div class="row" style="gap:16px">{donut([(49, T['success'])], 104, 14, '<div class="h3">49%</div><div class="xs">received</div>')}
<div class="col grow sum" style="gap:8px"><div class="between">Company share<b>648,282.50</b></div><div class="between">− Received<b>319,165.50</b></div><div class="divider"></div><div class="between">Balance<b style="color:{T['warning']}">329,117.00</b></div></div></div>
<div class="help">Shown side by side, not added: no carry-forward rule is defined for this balance.</div>""")}
{section('By branch')}
{card(''.join(f'<div class="col" style="gap:6px;padding:8px 0"><div class="between"><span class="h3" style="font-size:14px">{b}</span><span class="amt" style="font-size:14px">Rs. {v}</span></div>{progress(p)}<span class="xs">Received {r}%</span></div>' for b, v, p, r in [('Committee Chowk', '241,350', 52, 52), ('Alabad', '168,900', 41, 41), ('Commercial Market', '96,420', 63, 63), ('G 10 Markaz', '84,110', 38, 38)]), '', 'gap:0')}</div>'''
put('F01 Finance Dashboard', fd, 'Home', height=1640)

# 02 Daily Ledger ----------------------------------------------------------------
pend = ''.join(f'<div class="li"><div class="grow col" style="gap:2px"><div class="h3" style="font-size:14px">{b}</div><div class="xs">{m}</div></div><div class="col" style="align-items:flex-end;gap:6px"><div class="amt">{a}</div><div class="row" style="gap:6px">{btn("Reject", "danger", None, "xs")}{btn("Approve", "primary", None, "xs")}</div></div></div>'
               for b, m, a in [('Commercial Market', 'CT-000028 · Cash · 07 Oct', 'Rs. 4,600'), ('Alabad', 'CT-000029 · Cash · 07 Oct · +Fuel 300', 'Rs. 16,800')])
dl = topbar('Finance Admin') + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Daily ledger', 'Every posted voucher, in posting order. Balances run down the page like a cash book.', f'<div class="iconbtn">{ic("download")}</div>')}
{hero('Balance', 'Rs. 227,068.99', [('Opening', '44,228.49', None), ('Received', '+319,165.50', '#9FD8B4'), ('Expense', '−136,325.00', '#F2A39C')])}
{card(f'<div class="between"><div class="h3">Transfers awaiting approval</div>{pill("18", "warn")}</div>{pend}<div class="xs" style="text-align:center">Showing the oldest 2 of 18 · {link("Open all")}</div>', '', 'gap:4px')}
{card(f'<div class="between"><div class="col" style="gap:2px"><div class="h3">Pending approval</div><div class="xs">Not in the ledger yet</div></div><div class="col" style="align-items:flex-end;gap:2px"><div class="amt">Rs. 100,438</div>{pill("28 entries", "warn")}</div></div>', 'tint')}
<div class="row" style="gap:8px">{search('Voucher, description, head…')}<div class="iconbtn">{ic('calendar')}</div></div>
{chips(['05 Oct → 12 Oct', 'All branches', 'All heads'], 0)}
{card(f'<div class="between" style="padding:6px 0"><span class="eyebrow">Opening balance b/f</span><b class="amt">Rs. 66,667.49</b></div>' + ledger_row('Fuel', 'Suzuki fuel (FTX-000775)', '2,500.00', '05 Oct · PV-000521', '64,167.49') + ledger_row('Travelling and PR', 'Bykea for branch visit', '1,990.00', '05 Oct · PV-000522', '62,177.49') + ledger_row('Company share', 'Payment received · Committee Chowk', '24,262.50', '05 Oct · RV-000292', '86,439.99', False) + ledger_row('Raw materials', 'Choco bliss from Islamuddin + bykea', '4,950.00', '05 Oct · PV-000523', '81,489.99'), '', 'gap:0')}</div>'''
put('F02 Daily Ledger', dl, 'Ledger', height=1640)

# 03 Cash Transfers ------------------------------------------------------------------
def ft(cid, st, br, a, d, cash, ep, fuel, note, sub, v=None):
    acts = approve_acts() if st == 'Awaiting Finance' else ''
    vv = f'<div class="row" style="gap:6px">{"".join(pill(x, "ok") for x in v)}</div>' if v else ''
    return card(f'''<div class="between"><div class="col" style="gap:2px"><div class="h3">{cid} · {br}</div><div class="xs">{d} · submitted {sub}</div></div>{status(st)}</div>
<div class="between"><div class="grid4 grow" style="background:{T['tint']};border-radius:12px;padding:8px 10px">{mini('Cash', cash)}{mini('Easypaisa', ep)}{mini('Bank', '0')}{mini('Fuel', fuel)}</div></div>
<div class="between"><span class="sm">Note: {note}</span><b class="amt" style="font-size:17px">{a}</b></div>{vv}{f'<div class="row" style="justify-content:flex-end">{acts}</div>' if acts else ''}''', 'flat')
ctr = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Cash transfers', 'Money branches handed to the company, with a photo of each slip. Approving posts an RV- receipt.')}
{search('Transfer ID, voucher, branch or note…')}{chips([('All', 45), ('Pending', 18), ('Approved', 26), ('Rejected', 1)], 1)}
{chips(['All branches', 'All channels', '06 → 12 Oct'], -1)}
{ft('CT-000045', 'Awaiting Finance', 'Alabad', 'Rs. 15,100', '12 Oct', '15,100', '0', '0', '—', '13 Oct 00:02')}
{ft('CT-000043', 'Awaiting Finance', 'Committee Chowk', 'Rs. 27,900', '12 Oct', '27,900', '0', '300', 'Ep+1000 cash +35500', '12 Oct 09:23')}
{ft('CT-000027', 'Approved', 'Alabad', 'Rs. 16,800', '07 Oct', '16,800', '0', '300', '—', '07 Oct 14:04', ['RV-000304', 'RV-000305'])}</div>'''
put('F03 Cash Transfers', ctr, 'Transfers', height=1260)

# 04 Income & Expense ------------------------------------------------------------------
ie = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Income & expense', 'Manual documents. Nothing here reaches the ledger until it is approved.')}
<div class="row" style="gap:8px">{search('Search entries…')}<div class="iconbtn">{ic('filter')}</div></div>
{chips([('All', 714), ('Pending', 5), ('Posted', 702), ('Draft', 4), ('Rejected', 3)], 1)}
{tx('Raw Materials', 'Oil, egg', 'Rs. 12,800', 'FTX-000807 · 12 Oct · Company · Cash', 'Pending Approval', approve_acts())}
{tx('Raw Materials', 'Maida, oil, sugar and egg', 'Rs. 25,300', 'FTX-000806 · 12 Oct · Company · Cash', 'Pending Approval', approve_acts())}
{tx('Fuel', 'Bike petrol', 'Rs. 500', 'FTX-000804 · 12 Oct · Company · Cash', 'Pending Approval', approve_acts())}
{tx('Dairy Product', 'Doodh dahi', 'Rs. 9,280', 'FTX-000768 · 04 Oct · Company · Cash', 'Posted')}</div>'''
put('F04 Income & Expense', ie, 'Ledger', fab='New entry', height=1220)

# 05 New Entry ---------------------------------------------------------------------------
ne = appbar('New entry', None, close=True) + f'''<div class="body" style="padding-top:4px">
<div class="field"><div class="label">Type</div>{seg(['Income', 'Expense'], 1)}</div>
{select('Ledger head', 'Raw Materials · EXP-RAW-MATERIALS', req=True)}
<div class="grid2">{field('Business date', '12 Oct 2026', icon='calendar', req=True)}{field('Amount', '12,800.00', pre='Rs.', cls='focus', req=True)}</div>
{field('Description', 'e.g. October office rent', ph=True, req=True)}
<div class="field"><div class="label">Account</div>{seg(['Cash in hand', 'Bank'], 0)}</div>
<div class="grid2">{select('Payment method', 'Cash')}{select('Branch (optional)', 'None', ph=True)}</div>
{field('Reference (optional)', 'Cheque, invoice or transfer ref', ph=True)}
{field('Notes (optional)', 'Anything an approver should know', ph=True, cls='area')}
{photo_picker(True, 'Photograph the receipt, bill or transfer slip that backs this entry.', 'Receipt photo')}</div>'''
full('F05 New Entry', ne, btn('Save as draft', 'secondary', None, 'grow') + btn('Submit for approval', 'primary', None, 'grow'), 1280)

# 06 Payroll -----------------------------------------------------------------------------
def pay(n, a, role, meta, st='Posted', extra=None):
    ex = f'<span class="pill berry">{extra}</span>' if extra else ''
    return f'<div class="li" style="align-items:flex-start"><div class="avatar" style="width:38px;height:38px;font-size:13px">{"".join(w[0] for w in n.split()[:2]).upper()}</div><div class="grow col" style="gap:2px"><div class="h3" style="font-size:14px">{n}</div><div class="xs">{role}</div><div class="xs">{meta}</div>{ex}</div><div class="col" style="align-items:flex-end;gap:4px"><div class="amt" style="font-size:14px">{a}</div>{status(st)}</div></div>'
pr = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Payroll', 'Payslips, advances and the payroll master. Approving a payslip posts it under Salaries.')}
{seg(['Payslips', 'Advances', 'Employees'], 0)}
{hero('Net for this selection', 'Rs. 128,180.50', [('Payslips', '14', None), ('Employees', '10', None), ('Advances due', 'Rs. 47,000', T['honey'])])}
{search('Search by employee…')}
{card(pay('Ahmad Sha', 'Rs. 13,000.00', 'Production', 'SAL-000020 · Sep 2026 · paid 18 Sep') + pay('Dilber Khaplu', 'Rs. 3,000.00', 'Helper', 'SAL-000021 · Sep 2026 · paid 20 Sep') + pay('Muhammad Yasin', 'Rs. 6,500.50', 'Production · dish washer', 'SAL-000015 · Sep 2026 · paid 04 Sep', extra='Bonus Rs. 6,500') + pay('Mustafa Azeemi', 'Rs. 5,000.00', 'Cake · Asst chef', 'SAL-000017 · Sep 2026 · paid 09 Sep') + pay('Kosar Meer', 'Rs. 65,000.00', 'Cake · Chef', 'SAL-000012 · Aug 2026 · paid 24 Aug'), '', 'gap:0;padding:4px 16px')}
<div class="xs" style="text-align:center">Showing 5 of 14</div></div>'''
put('F06 Payroll', pr, 'Payroll', fab='New payslip', height=1260)

# 07 New Payslip ------------------------------------------------------------------------
np_ = appbar('New payslip', None, close=True) + f'''<div class="body" style="padding-top:4px">
{select('Employee', 'Mustafa Azeemi · EMP-000005', req=True)}
<div class="grid2">{field('Salary month', 'October 2026', icon='calendar')}{field('Payment date', '12 Oct 2026', icon='calendar')}</div>
<div class="grid3">{field('Salary', '9,000', pre='Rs.')}{field('Bonus', '0', pre='Rs.')}{field('Deduction', '5,000', pre='Rs.')}</div>
<div class="card tint" style="flex-direction:row;justify-content:space-between;align-items:center"><div class="col" style="gap:2px"><div class="h3">Net salary</div><div class="xs">Salary + bonus − deduction</div></div><div style="font:600 22px Urbanist;color:{T['primary']}">Rs. 4,000.00</div></div>
{banner('Rs. 5,000 outstanding advance (ADV-000005) is deducted here.', 'info')}
<div class="field"><div class="label">Paid from</div>{seg(['Cash in hand', 'Bank'], 0)}</div>{select('Payment method', 'Cash')}
{field('Notes (optional)', 'e.g. Eid bonus included', ph=True)}
{photo_picker(True, 'Photograph the signed payslip or the cash handover.', 'Payslip photo')}</div>'''
full('F07 New Payslip', np_, btn('Save as draft', 'secondary', None, 'grow') + btn('Submit for approval', 'primary', None, 'grow'), 1250)

# 08 New Advance (sheet) -------------------------------------------------------------------
na = f'''{select('Employee', 'Select an employee', ph=True, req=True)}{field('Date', '12 Oct 2026', icon='calendar')}
<div class="grid3">{field('Advance', '5,000', pre='Rs.', cls='focus')}{field('Bonus', '0', pre='Rs.')}{field('Loan', '0', pre='Rs.')}</div>
<div class="card tint" style="flex-direction:row;justify-content:space-between;align-items:center"><div class="h3">Paid now</div><div style="font:600 22px Urbanist;color:{T['primary']}">Rs. 5,000.00</div></div>
<div class="help">The whole of this is deducted from the employee’s next payslip. The bonus part is added back there as Bonus.</div>
<div class="field"><div class="label">Paid from</div>{seg(['Cash in hand', 'Bank'], 0)}</div>
{photo_picker(True, 'Photograph the cash handover or the transfer slip.', 'Handover photo')}'''
S.append(sheet_screen('F08 New Advance', title(None, 'Payroll'), na, 'New advance', None, btn('Save as draft', 'secondary', None, 'grow') + btn('Submit for approval', 'primary', None, 'grow'), 60, 1000))

# 09 Add Employee (sheet) -------------------------------------------------------------------
ae = f'''{field('Name', 'Full name', ph=True, req=True, icon='user')}<div class="grid2">{field('Department', 'e.g. Production', ph=True)}{field('Designation', 'e.g. Baker', ph=True)}</div>
<div class="grid2">{field('Base salary', '0', pre='Rs.', req=True)}{field('Joined on', 'dd/mm/yyyy', ph=True, icon='calendar')}</div>
<div class="grid2">{select('Branch (optional)', 'None', ph=True)}{field('Phone (optional)', '03xx xxxxxxx', ph=True)}</div>'''
S.append(sheet_screen('F09 Add Employee', title(None, 'Payroll'), ae, 'Add employee', None, btn('Add employee', 'primary', 'plus', 'full'), 250))

# 10 Resignation ------------------------------------------------------------------------------
rs = appbar('Employee resignation', None, back=True) + f'''<div class="body" style="padding-top:4px">
<div class="p">Salary history is kept. Ordinary salary closes after the resignation month.</div>
{card(f'<div class="between"><div class="row" style="gap:12px"><div class="avatar">KM</div><div class="col" style="gap:2px"><div class="h3">Kosar Meer</div><div class="xs">EMP-000010</div></div></div>{btn("Change", "secondary", None, "xs")}</div><div class="grid3" style="row-gap:10px">{mini("Department", "Cake")}{mini("Designation", "Chef")}{mini("Branch", "Head office")}{mini("Joined", "02 Nov 2025")}{mini("Status", "Active", T["success"])}{mini("Salary rate", "Rs. 35,000")}</div><div class="banner info" style="padding:8px 12px">Last approved salary: August 2026 · Rs. 65,000.00</div>', 'flat')}
<div class="grid2">{field('Resignation date', '13 Oct 2026', icon='calendar', req=True)}{field('Time (PKT)', '12:48 AM', icon='clock')}</div>
{select('Reason', 'Select a reason', ph=True, req=True)}{field('Remarks (optional)', 'Anything to note', ph=True, cls='area')}
{banner('Salary records up to October 2026 stay as they are. October can still take an approved salary; later months close for ordinary salary.', 'warn', 'alert')}
<div class="row" style="gap:12px;align-items:flex-start">{checkbox(True)}<div class="sm" style="color:{T['text']}">I confirm Kosar Meer has resigned on the date above. The server time and my user account will be recorded.</div></div></div>'''
full('F10 Resignation', rs, btn('Cancel', 'secondary', None, 'grow') + btn('Submit resignation', 'danger', None, 'grow'), 1220)

# 11 Salary Ledger --------------------------------------------------------------------------------
months = 'JFMAMJJASOND'
def mcell(v):
    if v == '—': return f'<div style="height:30px;border-radius:7px;background:{T["tint"]};display:flex;align-items:center;justify-content:center;font:600 10px Urbanist;color:{T["text3"]}">—</div>'
    return f'<div style="height:30px;border-radius:7px;background:{T["successSoft"]};display:flex;align-items:center;justify-content:center;font:600 10px Urbanist;color:{T["success"]}">{v}</div>'
def emp(n, meta, tot, vals):
    return card(f'<div class="between"><div class="col" style="gap:2px"><div class="h3" style="font-size:14px">{n}</div><div class="xs">{meta}</div></div><b class="amt" style="font-size:14px">{tot}</b></div>'
                f'<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:3px">' + ''.join(f'<div class="xs" style="text-align:center">{m}</div>' for m in months) + ''.join(mcell(v) for v in vals) + '</div>', 'flat')
sl = appbar('Salary ledger · 2026', 'Read-only', back=True, actions=['printer']) + f'''<div class="body">
<div class="p">Approved salary per employee and month, read from approved payslips.</div>
<div class="grid2">{kpi('Total approved', 'Rs. 128,180', '14 payments')}{kpi('On ledger', '10', '10 active · 0 resigned')}{kpi('Unpaid months', '32', 'eligible, no salary', T['warning'])}{kpi('Flagged', '0', 'no conflicts', T['success'])}</div>
<div class="row" style="gap:8px">{search('Code or name…')}<div class="chip">{ic('left', 16)}2026{ic('right', 16)}</div></div>
{legend([('Approved', T['success']), ('No record', T['border'])])}
{emp('Muhammad Yasin', 'EMP-000004 · Production · dish washer', '8,500.50', ['—'] * 7 + ['2k', '6.5k', '—', '—', '—'])}
{emp('Mustafa Azeemi', 'EMP-000005 · Cake · Asst chef', '9,000', ['—'] * 5 + ['100', '3k', '900', '5k', '—', '—', '—'])}
{emp('Ahmad Sha', 'EMP-000007 · Production', '20,000', ['—'] * 7 + ['7k', '13k', '—', '—', '—'])}
{emp('Kosar Meer', 'EMP-000010 · Cake · Chef', '65,000', ['—'] * 7 + ['65k', '—', '—', '—', '—'])}</div>'''
full('F11 Salary Ledger', sl, None, 1240) if False else S.append(screen('F11 Salary Ledger', '', height=1240).replace('@@BODY@@', sl))

# 12 Partner Transactions -----------------------------------------------------------------------
def partner(n, bal, adv, draw, pos):
    return card(f'<div class="between"><div class="row" style="gap:12px"><div class="avatar">{"".join(w[0] for w in n.split()[:2])}</div><div class="col" style="gap:2px"><div class="h3" style="font-size:15px">{n}</div><div class="xs">25% share · 56,767.25</div></div></div><b class="amt {"pos" if pos else "neg"}">{bal}</b></div>'
                f'<div class="grid2" style="background:{T["tint"]};border-radius:12px;padding:8px 10px">{mini("Advance", adv)}{mini("Draw", draw)}</div>', 'flat')
pt = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Partner transactions', 'Partner advances and draws, and the profit-share reconciliation.')}
{seg(['Advances', 'Draws', 'Profit share', 'Partners'], 2)}
{hero('Balance to share', 'Rs. 227,068.99', [('Advances', '204,420', None), ('Draws', '2,950', None), ('Net', 'Rs. 19,699', T['honey'])])}
{partner('Mohsin Abbas', 'Rs. 29,767.25', '27,000.00', '—', True)}{partner('Muhammad Saleem', '− Rs. 20,482.75', '74,750.00', '2,500.00', False)}
{partner('Muhammad Shahid', '− Rs. 8,982.75', '65,750.00', '—', False)}{partner('Salqlain Hussain', 'Rs. 19,397.25', '36,920.00', '450.00', True)}</div>'''
put('F12 Partner Transactions', pt, 'More', fab='New advance', height=1260)

# 13 New Partner Advance (sheet) ---------------------------------------------------------------
pa = f'''{seg(['Advance', 'Draw'], 0)}{select('Partner', 'Salqlain Hussain · PT-000004', req=True)}
<div class="grid2">{field('Date', '12 Oct 2026', icon='calendar')}{field('Amount', '100.00', pre='Rs.', cls='focus', req=True)}</div>
<div class="field"><div class="label">Paid from</div>{seg(['Cash in hand', 'Bank'], 0)}</div>{select('Payment method', 'Cash')}
{field('Note (optional)', 'Anything an approver should know', ph=True)}
{photo_picker(True, 'Photograph the cash handover or the transfer slip.', 'Handover photo')}'''
S.append(sheet_screen('F13 New Partner Advance', title(None, 'Partner transactions'), pa, 'New partner advance', None, btn('Save as draft', 'secondary', None, 'grow') + btn('Submit for approval', 'primary', None, 'grow'), 60, 1000))

# 14 Partner Detail --------------------------------------------------------------------------
pdt = appbar('Partner detail', None, back=True) + f'''<div class="body" style="padding-top:4px">
{card(f'<div class="row" style="gap:12px"><div class="avatar" style="width:52px;height:52px;border-radius:26px;font-size:16px">MS</div><div class="grow col" style="gap:2px"><div class="h3">Muhammad Shahid</div><div class="xs">PT-000003 · 25% share</div></div>{ic("down", 20, T["text3"])}</div>', 'flat')}
{field('Name', 'Muhammad Shahid', req=True)}{field('Father name', "Father's full name", ph=True)}
<div class="grid2">{select('Partner type', 'None', ph=True)}{field('Date of birth', 'dd/mm/yyyy', ph=True, icon='calendar')}</div>
{field('Date of joining', 'dd/mm/yyyy', ph=True, icon='calendar')}{field('Address', 'Residential address', ph=True, cls='area')}
<div class="grid2">{field('Contact number', '03xx xxxxxxx', ph=True)}{field('Emergency number', '03xx xxxxxxx', ph=True)}</div></div>'''
full('F14 Partner Detail', pdt, btn('Save details', 'primary', None, 'full'), 1100)

# 15 Company Transaction Details ----------------------------------------------------------------
ctd = appbar('Company transactions · 2026', 'Read-only', back=True, actions=['printer']) + f'''<div class="body">
<div class="p">Approved partner transactions per month, summed from source records.</div>
{hero('Year total · approved partner tx', 'Rs. 207,370.00', [('Approved', '41', None), ('Partners', '4', None), ('Top month', 'Sep · 122,920', T['honey'])])}
{card(f"""<div class="between"><div class="h3">Monthly total</div>{pill('Aug 84,450 · Sep 122,920', 'neutral')}</div>{bars([0, 0, 0, 0, 0, 0, 0, 84450, 122920, 100, 0, 0], list('JFMAMJJASOND'), on=8, h=110)}""")}
{emp('Mohsin Abbas', 'PT-000001 · share 25%', '27,000', ['—'] * 7 + ['5k', '22k', '—', '—', '—'])}
{emp('Muhammad Saleem', 'PT-000002 · share 25%', '77,250', ['—'] * 7 + ['18.3k', '59k', '—', '—', '—'])}
{emp('Muhammad Shahid', 'PT-000003 · share 25%', '65,750', ['—'] * 7 + ['50.8k', '15k', '—', '—', '—'])}
{emp('Salqlain Hussain', 'PT-000004 · share 25%', '37,370', ['—'] * 7 + ['10.5k', '26.9k', '—', '—', '—'])}
<div class="help">Counted: approved partner advances and draws, in the month their voucher is dated. Pending, draft and rejected transactions are excluded.</div></div>'''
S.append(screen('F15 Company Transaction Details', '', height=1400).replace('@@BODY@@', ctd))

# 16 Ledger Heads -------------------------------------------------------------------------------
def head(n, code, tags=()):
    t = ''.join(status(x) for x in tags)
    return f'<div class="li" style="padding:10px 0"><div class="grow col" style="gap:2px"><div class="h3" style="font-size:14px">{n}</div><div class="xs">{code}</div></div><div class="row" style="gap:6px">{t}</div>{ic("right", 18, T["text3"])}</div>'
def group(g, rows):
    return card(f'<div class="eyebrow">{g}</div>' + ''.join(head(*r) for r in rows), '', 'gap:0;padding:12px 16px 4px')
lh = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Ledger heads', 'The chart of accounts. Heads are deactivated, never deleted.')}
{seg(['Income · 11', 'Expense · 20'], 1)}{search('Search heads…')}
{group('Payroll', [('Salaries', 'EXP-SALARIES', ['System'])])}
{group('Partners', [('Partner withdrawals', 'EXP-PARTNER', ['System']), ('Branch share payout', 'EXP-BRANCH-SHARE-PAYOUT', ['System', 'Inactive'])])}
{group('Utilities', [('Electricity', 'EXP-ELECTRICITY'), ('Gas', 'EXP-GAS'), ('Internet', 'EXP-INTERNET')])}
{group('Operations', [('Maintenance', 'EXP-MAINTENANCE'), ('Packaging materials', 'EXP-PACKAGING'), ('Raw materials', 'EXP-RAW-MATERIALS'), ('Production expense', 'EXP-PRODUCTION', ['System'])])}</div>'''
put('F16 Ledger Heads', lh, 'More', fab='New head', height=1300)

# 17 New Ledger Head (sheet) -----------------------------------------------------------------
nh = f'''<div class="p">Same form for income (INC-) and expense (EXP-) heads.</div>{seg(['Income', 'Expense'], 1)}
{field('Code', 'EXP-SECURITY', cls='focus', req=True, help='Letters, numbers and dashes. Used by reports and exports; it cannot be changed later.')}
{field('Name', 'e.g. Security services', ph=True, req=True)}<div class="grid2">{field('Group (optional)', 'e.g. Utilities', ph=True)}{field('Sort order', '0')}</div>
{field('Description (optional)', 'What belongs under this head', ph=True, cls='area')}'''
S.append(sheet_screen('F17 New Ledger Head', title(None, 'Ledger heads'), nh, 'New ledger head', None, btn('Create head', 'primary', 'plus', 'full'), 130))

# 18 Daily Closing -----------------------------------------------------------------------------
def dc(d, br, st, tot, share, rec, cash, ep, disc, diff, dk, note):
    return card(f'''<div class="between"><div class="col" style="gap:2px"><div class="h3" style="font-size:15px">{br}</div><div class="xs">{d}</div></div>{status(st)}</div>
<div class="grid3" style="background:{T['tint']};border-radius:12px;padding:10px 12px;row-gap:10px">{mini('Total sale', tot)}{mini('Company share', share)}{mini('Received', rec)}{mini('Cash', cash)}{mini('Easypaisa', ep)}{mini('Discount', disc)}</div>
<div class="between">{pill(diff, dk)}<span class="xs">{note}</span></div>''', 'flat')
dcl = topbar() + f'''<div class="body pb" style="padding-top:8px">{title('Updated 00:56', 'Daily closing', 'Each branch’s recorded sales against the money received. For checking only: posts nothing.')}
{chips(['30 Sep → 12 Oct', 'All branches', 'Today', 'Last 30 days'], 0)}
{hero('Total sale', 'Rs. 628,050', [('Company share', '473,300', None), ('Received', '293,072', '#9FD8B4'), ('Not received', '180,229', '#F2A39C')])}
<div class="grid3">{kpi('Cash', '552,850')}{kpi('Easypaisa', '75,200')}{kpi('Awaiting', '290,270', None, T['warning'])}</div>
{banner('<b>Out by Rs. 20 (over).</b> 19 days have nothing counted yet. 18 branch days have a deposit awaiting approval (Rs. 290,270), counted once approved.', 'warn', 'alert')}
{dc('12 Oct 2026', 'Alabad Branch', 'Awaiting approval', '12,700', '9,525', 'Rs. 0', '12,200', '500', '400', 'Rs. 9,525 short', 'bad', 'Rs. 15,100 awaiting approval')}
{dc('12 Oct 2026', 'Committee Chowk Branch', 'Not received', '22,700', '17,025', 'Rs. 0', '18,600', '4,100', '250', 'Rs. 17,025 short', 'bad', 'day still open')}
{dc('06 Oct 2026', 'Committee Chowk Branch', 'Matched', '31,450', '23,587', '23,587', '24,550', '6,900', '300', 'Matched', 'ok', 'RV-000298')}</div>'''
put('F18 Daily Closing', dcl, 'More', height=1560)

# 19 Finance Reports ------------------------------------------------------------------------------
frp = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Finance reports', 'The same figures on screen and on paper.', f'<div class="iconbtn">{ic("download")}</div>')}
<div class="grid2">{select('Report', 'Daily cash book')}{field('Period', '01 → 12 Oct', icon='calendar')}</div>
{card(f'<div class="col" style="gap:2px"><div class="h2">Daily cash book</div><div class="xs">01 – 12 Oct 2026 · generated 13/10/2026 00:59 by finance@</div></div><div class="grid2" style="row-gap:12px">{mini("Opening balance", "Rs. 44,228.49")}{mini("Total receipts", "Rs. 319,165.50", T["success"])}{mini("Total payments", "Rs. 136,325.00", T["danger"])}{mini("Closing balance", "Rs. 227,068.99")}</div>', 'tint')}
{card(ledger_row('Company share', 'Payment received · Committee Chowk', '24,262.50', '01 Oct · RV-000275', '45,940.99', False) + ledger_row('Fuel', 'Daily delivery charges · Committee Chowk', '300.00', '01 Oct · RV-000276', '46,240.99', False) + ledger_row('Raw materials', 'Dobala cream (FTX-000751)', '1,600.00', '01 Oct · PV-000484', '71,270.99') + ledger_row('Kitchen expenses', 'Sabzi (FTX-000749)', '750.00', '01 Oct · PV-000485', '70,520.99') + ledger_row('Raw materials', 'Choco bliss and mocha chocolate', '12,500.00', '01 Oct · PV-000489', '56,570.99'), '', 'gap:0')}
<div class="between"><span class="xs">Showing 5 of 66</span>{pager(('1', '2', '…'), 0)}</div>
<div class="grid3">{btn('PDF', 'secondary', 'file', 'sm')}{btn('Excel', 'secondary', 'excel', 'sm')}{btn('CSV', 'secondary', 'download', 'sm')}</div></div>'''
put('F19 Finance Reports', frp, 'More', height=1380)

# 20 Audit Trail ----------------------------------------------------------------------------------
at_rows = ''.join(f'<div class="li" style="align-items:flex-start"><div class="thumb" style="width:36px;height:36px;border-radius:12px;background:{T["infoSoft"]};color:{T["info"]}">{ic("plus", 18)}</div><div class="grow col" style="gap:2px"><div class="row" style="gap:6px"><span class="h3" style="font-size:14px">{r}</span>{pill("Created", "info")}</div><div class="sm">Income / expense entry</div><div class="xs">hussain@mountainbakes.com · accountant · {t}</div></div></div>'
                  for r, t in [('FTX-000807', '12/10 23:29:54'), ('FTX-000806', '12/10 23:29:14'), ('FTX-000805', '12/10 23:27:11'), ('FTX-000804', '12/10 23:26:18'), ('FTX-000803', '12/10 23:25:12'), ('FTX-000802', '11/10 22:36:55'), ('FTX-000801', '11/10 22:36:03')])
atr = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Audit trail', 'Every finance action, who did it, from where and what changed. Append-only.')}
<div class="row" style="gap:8px">{select('', 'All record types').replace('<div class="label"></div>', '')}<div class="iconbtn">{ic('filter')}</div></div>
{banner('Nothing here can be edited or removed.', 'info', 'shield')}
{card(at_rows, '', 'gap:0;padding:4px 16px')}<div class="xs" style="text-align:center">Showing 7 of 2,603</div></div>'''
put('F20 Audit Trail', atr, 'More', height=1100)

# 21 Finance Help Desk -----------------------------------------------------------------------------
fh = topbar() + f'''<div class="body pb" style="padding-top:8px">{title(None, 'Help desk', 'Report an incorrect transaction, a calculation problem or a data discrepancy to the admin.')}
<div class="grid3">{kpi('Pending', '0')}{kpi('In review', '0')}{kpi('High priority', '0')}{kpi('Waiting', '0')}{kpi('Resolved', '0')}{kpi('My drafts', '0')}</div>
{seg(['Queue', 'My drafts'], 0)}{search('Query ID, reference, subject…')}
{empty('help', 'No queries here', 'Raise one with “New query”. Save a draft, submit when ready and follow the response here.')}</div>'''
put('F21 Finance Help Desk', fh, 'More', fab='New query', height=960)

# 22 Finance New Query (sheet) ----------------------------------------------------------------------
fq = f'''<div class="p">Search a ledger voucher (RV-/PV-/FV-), branch income (INC-), transaction (FTX-), salary (SAL-), advance (ADV-), partner expense (PEX-), branch share (BSP-), sale (MB-) or cash transfer (CT-) ID.</div>
<div class="row" style="gap:8px;align-items:flex-end"><div class="grow">{field('Reference ID', 'PV-000521', cls='focus')}</div>{btn('Find', 'dark', 'search')}</div>
{card(f'<div class="between"><div class="col" style="gap:2px"><div class="h3">PV-000521 · Fuel</div><div class="xs">Suzuki fuel (FTX-000775) · 05 Oct 2026</div></div>{status("Posted")}</div><div class="grid3">{mini("Amount", "Rs. 2,500")}{mini("Account", "Cash")}{mini("By", "hussain@")}</div>', 'tint')}
<div class="grid2">{select('Priority', 'Normal')}{select('Category', 'Wrong amount')}</div>
{field('Describe the issue', 'What looks wrong with this record?', ph=True, cls='area', req=True)}'''
S.append(sheet_screen('F22 Finance New Query', title(None, 'Help desk'), fq, 'New query', None, btn('Save draft', 'secondary', None, 'grow') + btn('Submit to admin', 'primary', 'send', 'grow'), 60, 960))

# 23 Finance Settings --------------------------------------------------------------------------------
fs = appbar('Finance settings', None, back=True) + f'''<div class="body" style="padding-top:4px">
<div class="p">Share percentages, opening balances and the workflow switches for the whole module.</div>
{card(f"""<div class="col" style="gap:2px"><div class="h3">Default company & branch share</div><div class="sm">Applied to every branch income approval from now on, except branches on their own rate.</div></div>
<div class="grid2">{field('Company share', '75', right='<b>%</b>')}{field('Branch share', '25', right='<b>%</b>', help='Always 100% minus company share.')}</div>
<div class="field"><div class="label">Struck on</div>{seg(['Gross collection', 'Net of expenses'], 0)}</div>
<div class="card tint" style="flex-direction:row;justify-content:space-between;padding:12px">{mini('On Rs. 10,000', 'Company')}<b class="amt">Rs. 7,500</b><b class="amt">Rs. 2,500</b></div>
<div class="eyebrow">5 branches on their own rate</div>""" + ''.join(f'<div class="between"><span class="sm" style="color:{T["text"]}">{b}</span>{pill(r, "neutral")}</div>' for b, r in [('Committee Chowk', '75 / 25'), ('Laziza Desert Co', '70 / 30'), ('Commercial Market', '80 / 20')]) + btn('Save share settings', 'primary', None, 'full'))}
{card(f"""<div class="col" style="gap:2px"><div class="h3">Opening balances</div><div class="sm">Changing these posts a real voucher for the difference. It shows in the audit trail.</div></div>
<div class="grid2">{field('Opening cash', '0', pre='Rs.')}{field('Opening bank', '0', pre='Rs.')}</div>{field('As at', '01 Sep 2026', icon='calendar')}{btn('Save opening balances', 'secondary', None, 'full')}""")}
{card(''.join(f'<div class="row" style="gap:12px;align-items:flex-start;padding:6px 0"><div class="grow col" style="gap:2px"><div class="h3" style="font-size:14px">{h}</div><div class="sm">{d}</div></div>{toggle(o)}</div>' for h, d, o in [
    ('Import branch income automatically', 'Pull approved branch closings into the pending list without anyone pressing Import.', True),
    ('Require admin verification', 'Insert the admin-verifies step between import and Finance approval.', True),
    ('Allow Super Admin to modify finance records', 'Off by default: separation of duties is the point of a finance module.', False)]) + '<div class="xs">Last updated 15/09/2026 05:25 by finance@mountainbakes.com</div>')}</div>'''
S.append(screen('F23 Finance Settings', '', height=1400).replace('@@BODY@@', fs))

# 24 More drawer -----------------------------------------------------------------------------------
nav = [('Dashboard', 'home'), ('Daily ledger', 'ledger'), ('Cash transfers', 'transfer'), ('Income & expense', 'cash'), ('Payroll', 'payroll'), ('Partner transactions', 'users'), ('Ledger heads', 'book'),
       ('Daily closing', 'lock'), ('Reports', 'chart'), ('Audit trail', 'shield'), ('Help desk', 'help'), ('Settings', 'settings')]
navh = ''.join(f'<div class="navi{" on" if i == 0 else ""}">{ic(icn, 21)}{n}</div>' for i, (n, icn) in enumerate(nav))
S.append(f'''<div class="screen" data-name="F24 Drawer">{statusbar()}<div class="body" style="opacity:.9">{title(None, 'Finance dashboard')}</div><div class="scrim"></div>
<div class="drawer"><div style="height:47px"></div><div class="col" style="padding:12px 20px 16px;gap:14px"><div class="row" style="gap:12px"><div class="logo"></div><div class="col" style="gap:1px"><div class="h3">Mountain Bakes</div><div class="xs">Finance Admin</div></div></div>
<div class="card tint" style="padding:10px 12px;flex-direction:row;align-items:center;gap:10px">{ic('wallet', 18, T['primary'])}<div class="grow h3" style="font-size:14px">Cash in hand · Rs. 227,069</div></div></div>
<div class="col" style="gap:2px;padding:0 10px;flex:1">{navh}</div>
<div class="row" style="gap:12px;padding:16px 20px 34px;border-top:1px solid {T['border']}"><div class="avatar">FA</div><div class="grow col" style="gap:1px"><div class="h3" style="font-size:14px">Finance</div><div class="xs">finance@mountainbakes.com</div></div><div class="iconbtn" style="color:{T['danger']}">{ic('logout')}</div></div></div></div>''')

if __name__ == '__main__':
    import sys
    open(sys.argv[1], 'w').write(page(S, 'Finance'))
    print(len(S))
