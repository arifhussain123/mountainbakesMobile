"""Shared design system for the Mountain Bakes mobile redesign (warm bakery light)."""
import html as _h

def e(s):
    return _h.escape(str(s))

# ---------------------------------------------------------------- tokens
T = dict(
    bg='#F4F5FB', surface='#FFFFFF', tint='#EEF0F8', tint2='#FFEDE5', border='#E4E7F1',
    text='#171A35', text2='#5B6080', text3='#9599B3',
    primary='#F2542D', primaryPress='#D9431F', primarySoft='#FFEDE5',
    cocoa='#12142B', cocoa2='#2A2E5C', cream='#FFFFFF', honey='#FFD36E',
    success='#12A26B', successSoft='#E1F7EE', warning='#C27A0A', warningSoft='#FFF3DC',
    danger='#E5484D', dangerSoft='#FDE8E8', info='#3D7BFA', infoSoft='#E7EFFF',
    berry='#6C5CE7', berrySoft='#EEEBFD',
)

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{background:#E9E1D5;font-family:Urbanist,sans-serif;color:%(text)s;-webkit-font-smoothing:antialiased;padding:40px;display:flex;flex-wrap:wrap;gap:48px;align-items:flex-start}
.screen{width:390px;min-height:844px;background:%(bg)s;position:relative;overflow:hidden;display:flex;flex-direction:column;border-radius:0}
.sb{height:47px;display:flex;align-items:center;justify-content:space-between;padding:0 28px 0 32px;font:600 15px Urbanist;color:%(text)s;flex-shrink:0}
.sb .ic{display:flex;gap:6px;align-items:center}
.body{padding:4px 20px 28px;display:flex;flex-direction:column;gap:16px;flex:1}
.body.pb{padding-bottom:112px}
.serif{font-family:Urbanist}
.h1{font:600 30px/36px Urbanist;letter-spacing:-.5px;color:%(text)s}
.h2{font:600 20px/26px Urbanist;color:%(text)s}
.h3{font:600 16px/22px Urbanist;color:%(text)s}
.eyebrow{font:600 11px/14px Urbanist;letter-spacing:1.2px;text-transform:uppercase;color:%(text3)s}
.p{font:400 14px/20px Urbanist;color:%(text2)s}
.sm{font:400 12px/17px Urbanist;color:%(text2)s}
.xs{font:500 11px/15px Urbanist;color:%(text3)s}
.num{font-variant-numeric:tabular-nums}
.row{display:flex;align-items:center;gap:10px}
.col{display:flex;flex-direction:column;gap:6px}
.between{display:flex;align-items:center;justify-content:space-between;gap:10px}
.grow{flex:1;min-width:0}
.card{background:%(surface)s;border:1px solid %(border)s;border-radius:20px;padding:16px;display:flex;flex-direction:column;gap:12px;box-shadow:0 1px 2px rgba(23,26,53,.04),0 6px 16px rgba(23,26,53,.05)}
.card.flat{box-shadow:none}
.card.tint{background:%(tint)s;border-color:%(tint)s;box-shadow:none}
.card.hero{background:%(cocoa)s;border-color:%(cocoa)s;color:%(cream)s}
.hero .eyebrow{color:rgba(255,255,255,.6)}.hero .p,.hero .sm{color:rgba(255,255,255,.75)}
.divider{height:1px;background:%(border)s;width:100%%}
.appbar{display:flex;align-items:center;gap:12px;padding:6px 20px 8px;min-height:56px;flex-shrink:0}
.iconbtn{width:42px;height:42px;border-radius:14px;background:%(surface)s;border:1px solid %(border)s;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.iconbtn.ghost{background:transparent;border-color:transparent}
.avatar{width:42px;height:42px;border-radius:21px;background:%(primarySoft)s;color:%(primary)s;font:600 14px Urbanist;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.logo{width:42px;height:42px;border-radius:14px;background:%(cocoa)s;color:%(cream)s;font:600 16px Urbanist;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.btn{height:52px;border-radius:16px;padding:0 20px;display:flex;align-items:center;justify-content:center;gap:8px;font:600 15px Urbanist;white-space:nowrap}
.btn.primary{background:%(primary)s;color:#fff}
.btn.dark{background:%(cocoa)s;color:%(cream)s}
.btn.secondary{background:%(surface)s;color:%(text)s;border:1.5px solid %(border)s}
.btn.soft{background:%(primarySoft)s;color:%(primary)s}
.btn.danger{background:%(dangerSoft)s;color:%(danger)s}
.btn.sm{height:38px;border-radius:12px;padding:0 14px;font-size:13px}
.btn.xs{height:32px;border-radius:10px;padding:0 12px;font-size:12px}
.btn.full{width:100%%}
.chip{height:36px;border-radius:18px;padding:0 14px;display:flex;align-items:center;gap:6px;font:600 13px Urbanist;background:%(surface)s;border:1px solid %(border)s;color:%(text2)s;white-space:nowrap;flex-shrink:0}
.chip.on{background:%(cocoa)s;border-color:%(cocoa)s;color:%(cream)s}
.chip .n{font:600 11px Urbanist;padding:2px 7px;border-radius:9px;background:%(tint)s;color:%(text2)s}
.chip.on .n{background:rgba(255,255,255,.18);color:%(cream)s}
.chips{display:flex;gap:8px;overflow:hidden}
.seg{display:flex;background:%(tint)s;border-radius:14px;padding:4px;gap:4px}
.seg div{flex:1;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;font:600 13px Urbanist;color:%(text2)s}
.seg .on{background:%(surface)s;color:%(text)s;box-shadow:0 1px 3px rgba(23,26,53,.12)}
.pill{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 10px;border-radius:12px;font:600 11px Urbanist;white-space:nowrap;flex-shrink:0}
.pill.ok{background:%(successSoft)s;color:%(success)s}
.pill.warn{background:%(warningSoft)s;color:%(warning)s}
.pill.bad{background:%(dangerSoft)s;color:%(danger)s}
.pill.info{background:%(infoSoft)s;color:%(info)s}
.pill.neutral{background:%(tint)s;color:%(text2)s}
.pill.brand{background:%(primarySoft)s;color:%(primary)s}
.pill.berry{background:%(berrySoft)s;color:%(berry)s}
.dot{width:7px;height:7px;border-radius:4px;background:currentColor}
.field{display:flex;flex-direction:column;gap:7px}
.label{font:600 13px Urbanist;color:%(text)s}
.label .req{color:%(primary)s}
.input{height:52px;border-radius:14px;background:%(surface)s;border:1.5px solid %(border)s;padding:0 16px;display:flex;align-items:center;gap:10px;font:500 15px Urbanist;color:%(text)s}
.input.ph{color:%(text3)s}
.input.focus{border-color:%(primary)s;box-shadow:0 0 0 4px rgba(242,84,45,.12)}
.input.area{height:96px;align-items:flex-start;padding-top:14px}
.input .pre{color:%(text3)s;font-weight:600}
.help{font:400 12px/17px Urbanist;color:%(text3)s}
.kpi{background:%(surface)s;border:1px solid %(border)s;border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
.kpi .v{font:600 20px/26px Urbanist;color:%(text)s;font-variant-numeric:tabular-nums;white-space:nowrap}
.kpi .k{font:600 12px/16px Urbanist;color:%(text2)s}
.kpi .s{font:500 11px/15px Urbanist;color:%(text3)s}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px}
.li{display:flex;align-items:center;gap:12px;padding:12px 0}
.li+.li{border-top:1px solid %(border)s}
.thumb{width:44px;height:44px;border-radius:14px;background:%(tint)s;display:flex;align-items:center;justify-content:center;flex-shrink:0;font:600 14px Urbanist;color:%(cocoa2)s}
.amt{font:600 15px Urbanist;color:%(text)s;font-variant-numeric:tabular-nums;white-space:nowrap}
.amt.pos{color:%(success)s}.amt.neg{color:%(danger)s}
.mini{display:flex;flex-direction:column;gap:2px}
.mini .k{font:600 10px/13px Urbanist;letter-spacing:.8px;text-transform:uppercase;color:%(text3)s}
.mini .v{font:600 14px/18px Urbanist;color:%(text)s;font-variant-numeric:tabular-nums}
.tabbar{position:absolute;left:0;right:0;bottom:0;height:88px;background:rgba(255,255,255,.96);border-top:1px solid %(border)s;display:flex;padding:10px 8px 0}
.tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;font:600 11px Urbanist;color:%(text3)s}
.tab.on{color:%(primary)s}
.tab .ti{width:52px;height:30px;border-radius:15px;display:flex;align-items:center;justify-content:center}
.tab.on .ti{background:%(primarySoft)s}
.fab{position:absolute;right:20px;bottom:104px;height:56px;border-radius:18px;background:%(primary)s;color:#fff;display:flex;align-items:center;gap:8px;padding:0 20px;font:600 15px Urbanist;box-shadow:0 10px 24px rgba(242,84,45,.35)}
.bar-track{height:8px;border-radius:4px;background:%(tint)s;overflow:hidden;width:100%%}
.bar-fill{height:8px;border-radius:4px;background:%(primary)s}
.chart{display:flex;align-items:flex-end;gap:8px;height:120px}
.chart .b{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;justify-content:flex-end;height:100%%}
.chart .b i{display:block;width:100%%;border-radius:8px 8px 4px 4px;background:%(primarySoft)s}
.chart .b.on i{background:%(primary)s}
.chart .b span{font:600 10px Urbanist;color:%(text3)s}
.table{display:flex;flex-direction:column}
.tr{display:flex;align-items:center;padding:10px 0;gap:8px;font:500 13px Urbanist;color:%(text)s;font-variant-numeric:tabular-nums}
.tr+.tr{border-top:1px solid %(border)s}
.tr.th{font:600 10px Urbanist;letter-spacing:.8px;text-transform:uppercase;color:%(text3)s;padding:6px 0}
.tr .c{width:44px;text-align:right;flex-shrink:0}
.tr .c.w{width:64px}
.stepper{display:flex;align-items:center;gap:0;border:1.5px solid %(border)s;border-radius:12px;height:38px;background:%(surface)s;flex-shrink:0}
.stepper div{width:34px;height:100%%;display:flex;align-items:center;justify-content:center;font:600 16px Urbanist;color:%(text2)s}
.stepper .q{width:36px;color:%(text)s;font-size:14px;border-left:1px solid %(border)s;border-right:1px solid %(border)s}
.banner{border-radius:16px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start;font:500 13px/18px Urbanist}
.banner.info{background:%(infoSoft)s;color:%(info)s}
.banner.warn{background:%(warningSoft)s;color:%(warning)s}
.banner.bad{background:%(dangerSoft)s;color:%(danger)s}
.banner.ok{background:%(successSoft)s;color:%(success)s}
.banner.brand{background:%(primarySoft)s;color:%(primaryPress)s}
.scrim{position:absolute;inset:0;background:rgba(18,20,43,.45)}
.sheet{position:absolute;left:0;right:0;bottom:0;background:%(bg)s;border-radius:28px 28px 0 0;display:flex;flex-direction:column;box-shadow:0 -10px 40px rgba(18,20,43,.18)}
.grab{width:40px;height:5px;border-radius:3px;background:%(border)s;margin:10px auto 2px}
.sheet .sbody{padding:8px 20px 20px;display:flex;flex-direction:column;gap:14px}
.footer{padding:12px 20px 30px;background:%(surface)s;border-top:1px solid %(border)s;display:flex;gap:10px;flex-shrink:0}
.sum{display:flex;flex-direction:column;gap:8px}
.sum .between{font:500 14px Urbanist;color:%(text2)s}
.sum .between b{color:%(text)s;font-weight:600;font-variant-numeric:tabular-nums}
.toggle{width:46px;height:28px;border-radius:14px;background:%(border)s;position:relative;flex-shrink:0}
.toggle i{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:11px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.toggle.on{background:%(primary)s}.toggle.on i{left:21px}
.check{width:22px;height:22px;border-radius:7px;border:2px solid %(border)s;background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.check.on{background:%(primary)s;border-color:%(primary)s}
.photo{height:96px;border-radius:16px;border:1.5px dashed #CDD2E4;background:%(surface)s;display:flex;align-items:center;justify-content:center;gap:12px}
.search{height:46px;border-radius:14px;background:%(surface)s;border:1.5px solid %(border)s;display:flex;align-items:center;gap:10px;padding:0 14px;font:500 14px Urbanist;color:%(text3)s}
.pager{display:flex;align-items:center;justify-content:center;gap:6px}
.pager div{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;font:600 13px Urbanist;color:%(text2)s;background:%(surface)s;border:1px solid %(border)s}
.pager .on{background:%(cocoa)s;color:%(cream)s;border-color:%(cocoa)s}
.empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:32px 16px;text-align:center}
.empty .ei{width:64px;height:64px;border-radius:22px;background:%(tint)s;display:flex;align-items:center;justify-content:center}
.legend{display:flex;gap:14px;flex-wrap:wrap}
.legend span{display:flex;align-items:center;gap:6px;font:600 11px Urbanist;color:%(text2)s}
.legend i{width:10px;height:10px;border-radius:3px;display:block}
.drawer{position:absolute;left:0;top:0;bottom:0;width:316px;background:%(surface)s;display:flex;flex-direction:column;box-shadow:12px 0 40px rgba(18,20,43,.2)}
.navi{display:flex;align-items:center;gap:14px;height:48px;padding:0 14px;border-radius:14px;font:600 15px Urbanist;color:%(text)s}
.navi.on{background:%(primarySoft)s;color:%(primary)s}
.heat{display:grid;gap:4px}
.heat div{height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font:600 11px Urbanist}

/* ===== v2 Midnight & Saffron overrides ===== */
.h1{font:700 30px/36px Urbanist;letter-spacing:-.9px}
.h2{font:700 19px/25px Urbanist;letter-spacing:-.3px}
.h3{letter-spacing:-.2px}
.card{border-radius:24px;border:1px solid #E9EBF4;box-shadow:0 1px 2px rgba(23,26,53,.04),0 10px 28px rgba(23,26,53,.06)}
.card.hero{background:radial-gradient(120%% 90%% at 100%% 0%%,rgba(108,92,231,.55) 0%%,rgba(108,92,231,0) 60%%),radial-gradient(90%% 80%% at 0%% 100%%,rgba(255,138,61,.30) 0%%,rgba(255,138,61,0) 60%%),#12142B;border:none;box-shadow:0 16px 36px rgba(18,20,43,.28)}
.card.tint{background:#EEF0F8;border-color:#EEF0F8}
.hero .eyebrow{color:rgba(255,255,255,.62)}.hero .p,.hero .sm{color:rgba(255,255,255,.72)}
.kpi{border-radius:20px;border:1px solid #E9EBF4;box-shadow:0 6px 18px rgba(23,26,53,.05)}
.kpi .v{font-weight:700;letter-spacing:-.4px}
.amt{font-weight:700}
.btn{border-radius:18px;font-weight:600;letter-spacing:-.1px}
.btn.primary{background:linear-gradient(135deg,#FF8A3D 0%%,#F2542D 100%%);color:#fff;box-shadow:0 10px 22px rgba(242,84,45,.38),inset 0 1px 0 rgba(255,255,255,.35)}
.btn.dark{background:linear-gradient(135deg,#2A2E5C 0%%,#12142B 100%%);color:#fff;box-shadow:0 10px 22px rgba(18,20,43,.30),inset 0 1px 0 rgba(255,255,255,.12)}
.btn.secondary{background:#fff;border:1.5px solid #E4E7F1;box-shadow:0 4px 12px rgba(23,26,53,.06)}
.btn.soft{background:linear-gradient(135deg,#FFF1E8 0%%,#FFE3D8 100%%);color:#E2471F;box-shadow:inset 0 0 0 1px rgba(242,84,45,.15)}
.btn.danger{background:linear-gradient(135deg,#FFF0F0 0%%,#FDE0E0 100%%);color:#E5484D;box-shadow:inset 0 0 0 1px rgba(229,72,77,.15)}
.btn .go{width:30px;height:30px;border-radius:15px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;margin-right:-8px;margin-left:4px}
.btn.sm{border-radius:14px}.btn.xs{border-radius:11px}
.chip{border-color:#E4E7F1}
.chip.on{background:linear-gradient(135deg,#2A2E5C 0%%,#12142B 100%%);border-color:#12142B;color:#fff;box-shadow:0 6px 14px rgba(18,20,43,.22)}
.chip.on .n{background:linear-gradient(135deg,#FF8A3D 0%%,#F2542D 100%%);color:#fff}
.seg{background:#E9EBF4;border-radius:16px}
.seg .on{box-shadow:0 4px 10px rgba(23,26,53,.10)}
.input{border-color:#E4E7F1;border-radius:16px}
.input.focus{border-color:#F2542D;box-shadow:0 0 0 4px rgba(242,84,45,.12)}
.search{border-color:#E4E7F1;border-radius:16px;box-shadow:0 4px 12px rgba(23,26,53,.04)}
.thumb{background:linear-gradient(135deg,#FFEDE5 0%%,#EEEBFD 100%%);color:#2A2E5C;border-radius:15px}
.avatar{background:linear-gradient(135deg,#8B7CF6 0%%,#6C5CE7 100%%);color:#fff}
.logo{background:linear-gradient(135deg,#FF8A3D 0%%,#F2542D 100%%);color:#fff;font:700 15px Urbanist;box-shadow:0 8px 18px rgba(242,84,45,.35)}
.iconbtn{border-color:#E9EBF4;box-shadow:0 4px 12px rgba(23,26,53,.05);border-radius:15px}
.tabbar{left:16px;right:16px;bottom:22px;height:70px;border-radius:26px;background:#12142B;border:none;padding:9px 8px;box-shadow:0 16px 36px rgba(18,20,43,.35);align-items:center}
.tab{color:rgba(255,255,255,.55);gap:3px}
.tab.on{color:#fff}
.tab .ti{width:46px;height:30px;border-radius:12px}
.tab.on .ti{background:linear-gradient(135deg,#FF8A3D 0%%,#F2542D 100%%);box-shadow:0 6px 14px rgba(242,84,45,.45)}
.fab{background:linear-gradient(135deg,#FF8A3D 0%%,#F2542D 100%%);border-radius:20px;bottom:108px;box-shadow:0 14px 28px rgba(242,84,45,.42),inset 0 1px 0 rgba(255,255,255,.35)}
.bar-fill{background:linear-gradient(135deg,#FF8A3D 0%%,#F2542D 100%%)}
.chart .b i{background:#E4E1FB;border-radius:10px 10px 6px 6px}
.chart .b.on i{background:linear-gradient(180deg,#FF8A3D 0%%,#F2542D 100%%);box-shadow:0 8px 16px rgba(242,84,45,.35)}
.toggle.on{background:linear-gradient(135deg,#FF8A3D 0%%,#F2542D 100%%)}
.check.on{background:linear-gradient(135deg,#FF8A3D 0%%,#F2542D 100%%);border-color:#F2542D}
.pager .on{background:#12142B;border-color:#12142B}
.scrim{background:rgba(18,20,43,.55)}
.sheet{border-radius:30px 30px 0 0;box-shadow:0 -12px 40px rgba(18,20,43,.25)}
.navi.on{background:linear-gradient(135deg,#FFF1E8 0%%,#FFE6DC 100%%);color:#E2471F}
.photo{border-color:#CDD2E4;background:#FAFBFE}
.stepper{border-color:#E4E7F1;border-radius:13px}
.stepper div:last-child{color:#F2542D}
.pill.brand{background:#FFEDE5;color:#E2471F}
.footer{border-top:none;box-shadow:0 -8px 24px rgba(23,26,53,.06)}

/* ===== v3 bottom navigation: white floating bar, duotone icons, gradient active pill ===== */
.tabbar{left:14px;right:14px;bottom:20px;height:74px;border-radius:28px;background:#FFFFFF;border:1px solid #E6E8F2;padding:0 10px;display:flex;align-items:center;justify-content:space-between;gap:2px;box-shadow:0 18px 40px rgba(18,20,43,.18),0 2px 6px rgba(18,20,43,.06)}
.tab{flex:0 0 auto;width:54px;height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font:600 10.5px Urbanist;color:#3B4066;position:relative;border-radius:18px}
.tab .ti{width:auto;height:auto;border-radius:0;background:none;box-shadow:none;display:flex}
.tab.on{flex:0 0 auto;width:auto;height:50px;padding:0 18px 0 14px;flex-direction:row;gap:8px;border-radius:25px;color:#FFFFFF;font:700 13.5px Urbanist;background:linear-gradient(135deg,#FF8A3D 0%%,#F2542D 100%%);box-shadow:0 10px 22px rgba(242,84,45,.45),inset 0 1px 0 rgba(255,255,255,.35)}
.tab.on .ti{background:none;box-shadow:none}
.tab .badge{position:absolute;top:4px;right:6px;min-width:18px;height:18px;border-radius:9px;padding:0 5px;background:#6C5CE7;color:#fff;font:700 10px Urbanist;display:flex;align-items:center;justify-content:center;border:2px solid #fff}
.fab{bottom:110px}

/* ===== v4 type: Urbanist, soft geometric, lighter weights, tight display tracking ===== */
.h1{font:600 32px/38px Urbanist;letter-spacing:-1px}
.h2{font:600 21px/27px Urbanist;letter-spacing:-.4px}
.h3{font:600 17px/22px Urbanist;letter-spacing:-.2px}
.p{font:400 15px/21px Urbanist}
.sm{font:400 13px/18px Urbanist}
.xs{font:500 12px/16px Urbanist}
.eyebrow{font:600 12px/15px Urbanist;letter-spacing:.6px;text-transform:none}
.kpi .v{font:700 22px/28px Urbanist;letter-spacing:-.6px}
.label{font:600 14px Urbanist}
.input{font:500 16px Urbanist}
.btn{font:600 16px Urbanist;letter-spacing:0}
.amt{font:700 16px Urbanist;letter-spacing:-.2px}
.sb{font:600 16px Urbanist}

/* ===== v5 colour: lavender canvas, pastel 3D cards, violet hero with 3D shapes ===== */
body{background:#E3DDFB}
.screen{background:radial-gradient(70%% 28%% at 100%% 0%%,rgba(169,145,255,.30) 0%%,rgba(169,145,255,0) 100%%),radial-gradient(60%% 22%% at 0%% 6%%,rgba(255,195,107,.22) 0%%,rgba(255,195,107,0) 100%%),#F5F3FE}
.card{background:linear-gradient(180deg,#FFFFFF 0%%,#FBFAFF 100%%);border:1px solid #ECE8FB;border-radius:26px;box-shadow:inset 0 1px 0 #FFFFFF,0 2px 4px rgba(76,60,170,.04),0 14px 30px rgba(76,60,170,.08)}
.card.tint{background:linear-gradient(145deg,#EFEBFF 0%%,#E2DBFF 100%%);border-color:#E2DBFF;box-shadow:inset 0 1px 0 rgba(255,255,255,.7)}
.card.hero{border:none;border-radius:28px;color:#fff;position:relative;overflow:hidden;background:linear-gradient(145deg,#A594FF 0%%,#7F6BF2 48%%,#5B48D8 100%%);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 -10px 24px rgba(40,20,140,.25),0 18px 36px rgba(91,72,216,.35)}
.card.hero>*:not(.d3){position:relative}
.d3{position:absolute;border-radius:50%%;pointer-events:none}
.hero .eyebrow{color:rgba(255,255,255,.80)}.hero .p,.hero .sm{color:rgba(255,255,255,.84)}
.kpi{border:none;border-radius:24px;box-shadow:inset 0 1px 0 rgba(255,255,255,.7),inset 0 -6px 14px rgba(0,0,0,.04),0 12px 24px rgba(76,60,170,.10)}
.kpi .k,.kpi .s{color:rgba(23,26,53,.62)}
.kpi:nth-child(5n+1){background:linear-gradient(150deg,#C9F4DA 0%%,#9FE3BC 100%%)}
.kpi:nth-child(5n+2){background:linear-gradient(150deg,#C6F4F7 0%%,#9EE6EE 100%%)}
.kpi:nth-child(5n+3){background:linear-gradient(150deg,#FFDDA0 0%%,#FFC266 100%%)}
.kpi:nth-child(5n+4){background:linear-gradient(150deg,#DCD3FF 0%%,#BCAEFF 100%%)}
.kpi:nth-child(5n+5){background:linear-gradient(150deg,#FBD3F6 0%%,#F3A9EC 100%%)}
.thumb{box-shadow:inset 0 1px 0 rgba(255,255,255,.8),inset 0 -4px 8px rgba(0,0,0,.05),0 6px 12px rgba(76,60,170,.10);color:#2A2466}
.li:nth-child(5n+1) .thumb{background:linear-gradient(150deg,#FFE2B8,#FFC57A)}
.li:nth-child(5n+2) .thumb{background:linear-gradient(150deg,#E2DAFF,#C2B4FF)}
.li:nth-child(5n+3) .thumb{background:linear-gradient(150deg,#CFF5E0,#A5E6C2)}
.li:nth-child(5n+4) .thumb{background:linear-gradient(150deg,#CDF2F6,#A2E3EC)}
.li:nth-child(5n+5) .thumb{background:linear-gradient(150deg,#FCDDF7,#F4B5EE)}
.iconbtn{background:#FFFFFF;border:none;border-radius:50%%;box-shadow:0 6px 16px rgba(76,60,170,.12)}
.chip{background:#FFFFFF;border-color:#E6E1FA}
.chip.on{background:linear-gradient(145deg,#2E2A5C 0%%,#141233 100%%)}
.seg{background:#E9E4FD}
.input,.search{background:#FFFFFF;border-color:#E6E1FA}
.sheet{background:#F7F5FF}
.footer{background:rgba(255,255,255,.92)}
.navi.on{background:linear-gradient(145deg,#EFEBFF 0%%,#E2DBFF 100%%);color:#5B48D8}
.pill.brand{background:#EFEBFF;color:#5B48D8}
.logo{border-radius:50%%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35),0 8px 18px rgba(242,84,45,.35)}

/* ===== v6 bottom navigation: full-width white bar, raised orange circle for the active tab ===== */
.tabbar{left:0;right:0;bottom:0;height:96px;border-radius:30px 30px 0 0;background:#FFFFFF;border:none;padding:0 6px 22px;display:flex;align-items:stretch;justify-content:space-between;gap:0;overflow:visible;box-shadow:0 -6px 24px rgba(60,40,30,.08)}
.tab{flex:1 1 0;width:auto;height:auto;padding-top:14px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:7px;font:500 13.5px Urbanist;color:#7A685C;position:relative;border-radius:0;background:none;box-shadow:none}
.tab .ti{position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center;background:none;box-shadow:none;border-radius:0}
.tab.on{flex:1 1 0;width:auto;height:auto;padding:0;flex-direction:column;gap:9px;color:#F2542D;font:700 14px Urbanist;background:none;box-shadow:none;border-radius:0}
.tab.on .ti{width:68px;height:68px;margin-top:-30px;border-radius:50%%;background:linear-gradient(145deg,#FF8A3D 0%%,#F2542D 100%%);border:5px solid #FFFFFF;box-shadow:0 10px 20px rgba(242,84,45,.35),inset 0 1px 0 rgba(255,255,255,.35);box-sizing:border-box}
.tab .badge{position:absolute;top:-6px;right:-10px;min-width:18px;height:18px;border-radius:9px;padding:0 5px;background:#6C5CE7;color:#fff;font:700 10px Urbanist;display:flex;align-items:center;justify-content:center;border:2px solid #fff}
.fab{bottom:112px}
""" % T

# ---- real Mountain Bakes logo (round red badge), embedded once so Figma import keeps it
import base64 as _b64, os as _os
_LOGO = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), '..', 'assets', 'mb-logo.png')
LOGO_URI = 'data:image/png;base64,' + _b64.b64encode(open(_LOGO, 'rb').read()).decode()
CSS += ('.logo,.logo-lg{background:url(%s) center/100%% 100%% no-repeat !important;border-radius:50%%;color:transparent !important;font-size:0 !important;'
        'box-shadow:0 0 0 2px #FFFFFF,0 8px 18px rgba(190,30,30,.30) !important}'
        '.logo-lg{box-shadow:0 0 0 5px rgba(255,255,255,.95),0 22px 44px rgba(60,30,160,.35) !important}') % LOGO_URI

FONTS = "<link href=\"https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap\" rel=\"stylesheet\">"

# ---------------------------------------------------------------- icons (lucide-style, 24 viewBox)
P = {
 'home': '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
 'orders': '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/>',
 'sales': '<path d="M4 3h16v18l-3-2-3 2-2-2-2 2-3-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
 'stock': '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
 'menu': '<path d="M4 6h16M4 12h16M4 18h16"/>',
 'plus': '<path d="M12 5v14M5 12h14"/>',
 'minus': '<path d="M5 12h14"/>',
 'search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 'right': '<path d="m9 6 6 6-6 6"/>',
 'left': '<path d="m15 6-6 6 6 6"/>',
 'down': '<path d="m6 9 6 6 6-6"/>',
 'refresh': '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
 'calendar': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 'filter': '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
 'camera': '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
 'image': '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
 'download': '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
 'printer': '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
 'bell': '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
 'wallet': '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
 'truck': '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
 'tag': '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
 'return': '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
 'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 'users': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
 'logout': '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h11"/>',
 'help': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>',
 'chart': '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
 'x': '<path d="M6 6l12 12M18 6 6 18"/>',
 'check': '<path d="m5 12 5 5 9-10"/>',
 'settings': '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
 'book': '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-4a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h4z"/>',
 'file': '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
 'cash': '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>',
 'phone': '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
 'bank': '<path d="M3 9 12 4l9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
 'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'event': '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>',
 'lock': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 'mail': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
 'eye': '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 'edit': '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
 'trash': '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
 'alert': '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.01"/>',
 'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
 'ledger': '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M11 8h6M11 12h6M11 16h4"/>',
 'transfer': '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
 'payroll': '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 16.5a3.5 3.5 0 0 1 7 0M15 10h3M15 14h3"/>',
 'shield': '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
 'chef': '<path d="M7 14a4 4 0 0 1-.8-7.9A5 5 0 0 1 16 5a4 4 0 0 1 1 8.9V20H7z"/><path d="M7 17h10"/>',
 'cake': '<path d="M4 21V12h16v9M4 16c2 1 4 1 6 0s4-1 6 0 3 1 4 0M12 12V8"/><path d="M12 8a1.5 1.5 0 0 1-1.5-1.5C10.5 5 12 3 12 3s1.5 2 1.5 3.5A1.5 1.5 0 0 1 12 8z"/>',
 'more': '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
 'excel': '<path d="M6 3h8l5 5v13H6z"/><path d="m9 12 4 5M13 12l-4 5"/>',
 'grid': '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 'up': '<path d="m6 15 6-6 6 6"/>',
 'arrowup': '<path d="M12 19V5M6 11l6-6 6 6"/>',
 'arrowdown': '<path d="M12 5v14M6 13l6 6 6-6"/>',
 'send': '<path d="M21 3 3 10l7 3 3 7z"/><path d="m10 13 4-4"/>',
 'box': '<path d="M3 7h18v13H3zM2 3h20v4H2z"/><path d="M10 11h4"/>',
}

def ic(name, size=22, color='currentColor', sw=1.9):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{P[name]}</svg>')

# ---------------------------------------------------------------- building blocks
def statusbar(dark=False):
    c = T['cream'] if dark else T['text']
    bat = (f'<svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="{c}" opacity=".4"/>'
           f'<rect x="2" y="2" width="20" height="9" rx="2" fill="{c}"/><rect x="24.5" y="4" width="2" height="5" rx="1" fill="{c}" opacity=".4"/></svg>')
    sig = (f'<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="{c}"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="{c}"/>'
           f'<rect x="10" y="3" width="3" height="9" rx="1" fill="{c}"/><rect x="15" y="0" width="3" height="12" rx="1" fill="{c}"/></svg>')
    return f'<div class="sb" style="color:{c}"><span>9:41</span><div class="ic">{sig}{bat}</div></div>'

def appbar(title=None, sub=None, back=False, actions=(), lead=None, close=False):
    left = ''
    if back:
        left = f'<div class="iconbtn">{ic("left")}</div>'
    elif close:
        left = f'<div class="iconbtn">{ic("x")}</div>'
    elif lead:
        left = lead
    mid = ''
    if title or sub:
        mid = '<div class="grow col" style="gap:1px">'
        if title: mid += f'<div class="h3" style="font-size:17px">{e(title)}</div>'
        if sub: mid += f'<div class="xs">{e(sub)}</div>'
        mid += '</div>'
    else:
        mid = '<div class="grow"></div>'
    acts = ''.join(a if a.startswith('<') else f'<div class="iconbtn">{ic(a)}</div>' for a in actions)
    return f'<div class="appbar">{left}{mid}{acts}</div>'

def title(eyebrow, h, sub=None, right=''):
    s = '<div class="between" style="align-items:flex-end"><div class="col" style="gap:4px">'
    if eyebrow: s += f'<div class="eyebrow">{e(eyebrow)}</div>'
    s += f'<div class="h1">{h}</div></div>{right}</div>'
    if sub: s += f'<div class="p" style="margin-top:-6px">{e(sub)}</div>'
    return s

def pill(text, kind='neutral', dot=False):
    d = '<span class="dot"></span>' if dot else ''
    return f'<span class="pill {kind}">{d}{e(text)}</span>'

STATUS = {
    'Pending': 'warn', 'Awaiting Review': 'warn', 'Awaiting Finance': 'warn', 'Pending Approval': 'warn', 'Open': 'warn',
    'Awaiting approval': 'warn', 'In Review': 'info', 'Draft': 'neutral', 'Approved': 'ok', 'Posted': 'ok', 'Matched': 'ok',
    'Delivered': 'ok', 'Verified': 'ok', 'Completed': 'ok', 'Resolved': 'ok', 'Rejected': 'bad', 'Not received': 'bad',
    'Discrepancy': 'bad', 'Cancelled': 'bad', 'Shortage': 'warn', 'Out': 'bad', 'Prepared': 'info', 'Submitted': 'info',
    'Outstanding': 'warn', 'Active': 'ok', 'Inactive': 'neutral', 'System': 'info', 'Upcoming': 'brand', 'Changed': 'berry',
    'Waiting': 'warn', 'Final': 'neutral', 'Read-only': 'neutral', 'Created': 'info', 'Paid': 'ok', 'Short': 'bad', 'Over': 'warn',
}
def status(text):
    return pill(text, STATUS.get(text, 'neutral'), dot=True)

def btn(text, kind='primary', icon=None, cls=''):
    i = ic(icon, 18) if icon else ''
    go = ''
    if kind in ('primary', 'dark') and not icon and 'sm' not in cls and 'xs' not in cls:
        go = f'<span class="go">{ic("right", 16, "#fff", 2.4)}</span>'
    return f'<div class="btn {kind} {cls}">{i}{e(text)}{go}</div>'

def chips(items, on=0):
    out = '<div class="chips">'
    for i, it in enumerate(items):
        if isinstance(it, tuple):
            lab, n = it
            out += f'<div class="chip{" on" if i == on else ""}">{e(lab)}<span class="n">{e(n)}</span></div>'
        else:
            out += f'<div class="chip{" on" if i == on else ""}">{e(it)}</div>'
    return out + '</div>'

def seg(items, on=0):
    return '<div class="seg">' + ''.join(f'<div class="{"on" if i == on else ""}">{e(t)}</div>' for i, t in enumerate(items)) + '</div>'

def field(label, value='', ph=False, req=False, icon=None, pre=None, help=None, cls='', right=None):
    r = '<span class="req"> *</span>' if req else ''
    i = ic(icon, 20, T['text3']) if icon else ''
    p = f'<span class="pre">{e(pre)}</span>' if pre else ''
    rt = right or ''
    h = f'<div class="help">{e(help)}</div>' if help else ''
    return (f'<div class="field"><div class="label">{e(label)}{r}</div>'
            f'<div class="input {"ph" if ph else ""} {cls}">{p}{i}<span class="grow">{e(value)}</span>{rt}</div>{h}</div>')

def select(label, value, ph=False, req=False, help=None):
    return field(label, value, ph=ph, req=req, help=help, right=ic('down', 20, T['text3']))

def kpi(k, v, s=None, color=None, icon=None):
    c = f' style="color:{color}"' if color else ''
    i = f'<div style="color:{T["text3"]}">{ic(icon, 18)}</div>' if icon else ''
    top = f'<div class="between"><div class="k">{e(k)}</div>{i}</div>' if icon else f'<div class="k">{e(k)}</div>'
    return f'<div class="kpi">{top}<div class="v"{c}>{e(v)}</div>' + (f'<div class="s">{e(s)}</div>' if s else '') + '</div>'

def mini(k, v, color=None):
    c = f' style="color:{color}"' if color else ''
    return f'<div class="mini"><div class="k">{e(k)}</div><div class="v"{c}>{e(v)}</div></div>'

def d3(kind, x, y, size, side='right', vside='top'):
    """A real 3D-looking shape (sphere / glossy ball / ring) as its own round layer."""
    fill = {
        'sphere': 'radial-gradient(circle at 34% 30%,#FFE9C2 0%,#FFAD4D 26%,#F2542D 68%,#B8321A 100%);box-shadow:0 14px 28px rgba(184,50,26,.30)',
        'ball': 'radial-gradient(circle at 34% 30%,#FFFFFF 0%,#D6CCFF 30%,#8E7CFF 70%,#5B48D8 100%);box-shadow:0 10px 20px rgba(60,40,180,.30)',
        'ring': 'radial-gradient(closest-side,rgba(255,201,46,0) 50%,#FFF0A8 54%,#FFC92E 72%,#D99A00 96%,rgba(217,154,0,0) 100%)',
        'mint': 'radial-gradient(circle at 34% 30%,#F2FFF7 0%,#A8EBC4 35%,#3FBF7F 100%);box-shadow:0 10px 20px rgba(30,140,90,.25)',
    }[kind]
    return f'<div class="d3" style="{side}:{x}px;{vside}:{y}px;width:{size}px;height:{size}px;background:{fill}"></div>'

def card(inner, cls='', style=''):
    if 'hero' in cls.split():
        inner = d3('sphere', -34, -40, 112) + d3('ball', -10, -12, 40, 'right', 'bottom') + inner
    return f'<div class="card {cls}" style="{style}">{inner}</div>'

def section(head, right=''):
    return f'<div class="between" style="margin-top:4px"><div class="h2">{e(head)}</div>{right}</div>'

def link(text):
    return f'<div style="font:600 13px Urbanist;color:{T["primary"]}">{e(text)}</div>'

def search(ph, right=''):
    return f'<div class="search">{ic("search", 20)}<span class="grow">{e(ph)}</span>{right}</div>'

def pager(pages=('1', '2', '3'), on=0):
    return ('<div class="pager">' + f'<div>{ic("left", 18)}</div>' +
            ''.join(f'<div class="{"on" if i == on else ""}">{p}</div>' for i, p in enumerate(pages)) +
            f'<div>{ic("right", 18)}</div></div>')

def banner(text, kind='info', icon='info'):
    return f'<div class="banner {kind}"><div style="flex-shrink:0;margin-top:1px">{ic(icon, 18)}</div><div>{text}</div></div>'

def bars(vals, labels, on=None, color=None, h=120):
    m = max(vals) or 1
    out = f'<div class="chart" style="height:{h}px">'
    for i, (v, l) in enumerate(zip(vals, labels)):
        style = f'height:{max(4, int(v / m * (h - 22)))}px'
        out += f'<div class="b{" on" if i == on else ""}"><i style="{style}"></i><span>{e(l)}</span></div>'
    return out + '</div>'

def progress(pct, color=None):
    c = color or T['primary']
    return f'<div class="bar-track"><div class="bar-fill" style="width:{pct}%;background:{c}"></div></div>'

def donut(parts, size=120, w=16, center=''):
    """parts: list of (pct, color)."""
    r = (size - w) / 2
    C = 2 * 3.14159265 * r
    off = 0
    segs = f'<circle cx="{size/2}" cy="{size/2}" r="{r}" fill="none" stroke="{T["tint"]}" stroke-width="{w}"/>'
    for pct, col in parts:
        L = C * pct / 100
        segs += (f'<circle cx="{size/2}" cy="{size/2}" r="{r}" fill="none" stroke="{col}" stroke-width="{w}" '
                 f'stroke-dasharray="{L:.2f} {C:.2f}" stroke-dashoffset="{-off:.2f}" transform="rotate(-90 {size/2} {size/2})"/>')
        off += L
    return (f'<div style="position:relative;width:{size}px;height:{size}px;flex-shrink:0"><svg width="{size}" height="{size}" viewBox="0 0 {size} {size}">{segs}</svg>'
            f'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">{center}</div></div>')

def line_chart(series, w=318, h=120, labels=None):
    """series: list of (values, color, dashed)."""
    allv = [v for s in series for v in s[0]]
    mx, mn = max(allv), min(min(allv), 0)
    out = f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
    for gy in (0.25, 0.5, 0.75):
        out += f'<line x1="0" x2="{w}" y1="{h*gy}" y2="{h*gy}" stroke="{T["border"]}" stroke-dasharray="3 4"/>'
    for vals, col, dash in series:
        n = len(vals)
        pts = ' '.join(f'{i*(w-8)/(n-1)+4:.1f},{h-6-(v-mn)/(mx-mn or 1)*(h-16):.1f}' for i, v in enumerate(vals))
        d = ' stroke-dasharray="5 5"' if dash else ''
        out += f'<polyline points="{pts}" fill="none" stroke="{col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"{d}/>'
    out += '</svg>'
    if labels:
        out += '<div class="between">' + ''.join(f'<span class="xs">{e(l)}</span>' for l in labels) + '</div>'
    return out

def legend(items):
    return '<div class="legend">' + ''.join(f'<span><i style="background:{c}"></i>{e(t)}</span>' for t, c in items) + '</div>'

def stepper(q):
    return f'<div class="stepper"><div>−</div><div class="q">{e(q)}</div><div>+</div></div>'

def photo_picker(req=True, help=None, label='Photo'):
    r = '<span class="req"> *</span>' if req else ''
    h = f'<div class="help">{e(help)}</div>' if help else ''
    return (f'<div class="field"><div class="label">{e(label)}{r}</div><div class="photo">'
            f'{btn("Camera", "soft", "camera", "sm")}{btn("Gallery", "secondary", "image", "sm")}</div>{h}</div>')

# duotone nav icons: (fill-layer, stroke-layer)
DUO = {
 'home': ('<path d="M4.5 10.2 12 4l7.5 6.2V19a1.5 1.5 0 0 1-1.5 1.5h-3.5v-5.5h-5V20.5H6A1.5 1.5 0 0 1 4.5 19z"/>', '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V9.5"/><path d="M9.5 20.5v-5.5h5v5.5"/>'),
 'orders': ('<rect x="5" y="4" width="14" height="17" rx="2.5"/>', '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 3h6v3H9z"/><path d="M8.5 11h7M8.5 15h4.5"/>'),
 'sales': ('<path d="M5 3h14v18l-2.3-1.6L14.4 21 12 19.4 9.6 21l-2.3-1.6L5 21z"/>', '<path d="M5 3h14v18l-2.3-1.6L14.4 21 12 19.4 9.6 21l-2.3-1.6L5 21z"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>'),
 'stock': ('<path d="M12 3 21 8l-9 5-9-5z"/>', '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
 'more': ('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>', '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'),
 'cart': ('<path d="M6 6h15l-1.6 7.2a2 2 0 0 1-2 1.6H9.1a2 2 0 0 1-2-1.6L5 3H2.5"/>', '<path d="M2.5 3H5l2.1 10.2a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.6L21 6H6"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>'),
 'return': ('<circle cx="12" cy="12" r="9"/>', '<circle cx="12" cy="12" r="9"/><path d="M10 9 7.5 11.5 10 14"/><path d="M7.5 11.5H14a2.5 2.5 0 0 1 0 5h-1"/>'),
 'ledger': ('<path d="M6 3h11a2 2 0 0 1 2 2v16H6.5A2.5 2.5 0 0 1 4 18.5V5a2 2 0 0 1 2-2z"/>', '<path d="M6 3h11a2 2 0 0 1 2 2v16H6.5A2.5 2.5 0 0 1 4 18.5V5a2 2 0 0 1 2-2z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H19"/><path d="M8.5 7.5h6M8.5 11h4"/>'),
 'transfer': ('<circle cx="12" cy="12" r="9"/>', '<circle cx="12" cy="12" r="9"/><path d="M7.5 10h9l-2.5-2.5M16.5 14h-9l2.5 2.5"/>'),
 'payroll': ('<rect x="3" y="5" width="18" height="14" rx="3"/>', '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16a3.4 3.4 0 0 1 6.4 0M14.5 10h3.5M14.5 13.5h3.5"/>'),
}

def duo(name, size=26, fill='#FFD9C7', stroke='#3B4066'):
    f, st = DUO[name]
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none">'
            f'<g fill="{fill}" stroke="none">{f}</g>'
            f'<g stroke="{stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">{st}</g></svg>')

NAV_FILL = {'home': '#FFD9C7', 'orders': '#DCD7FD', 'sales': '#FFE7B8', 'stock': '#CDEFE0', 'more': '#DCE6FF',
            'return': '#FFE7B8', 'ledger': '#DCD7FD', 'transfer': '#CDEFE0', 'payroll': '#FFE7B8'}
NAV_BADGE = {'Orders': '1', 'Transfers': '18', 'Returns': '2'}

NAV_INK = '#7A685C'   # warm taupe, as in the reference bar

def tabbar(tabs, active):
    """v6 nav: full-width white bar, rounded top; active tab = raised orange circle with a white ring + orange label."""
    out = '<div class="tabbar">'
    for name, icon in tabs:
        if name == active:
            out += f'<div class="tab on"><div class="ti">{duo(icon, 28, "none", "#FFFFFF")}</div><span class="tl">{e(name)}</span></div>'
        else:
            b = f'<span class="badge">{NAV_BADGE[name]}</span>' if name in NAV_BADGE else ''
            out += f'<div class="tab"><div class="ti">{duo(icon, 26, "none", NAV_INK)}{b}</div><span class="tl">{e(name)}</span></div>'
    return out + '</div>'

def toggle(on=True):
    return f'<div class="toggle{" on" if on else ""}"><i></i></div>'

def checkbox(on=False):
    return f'<div class="check{" on" if on else ""}">{ic("check", 14, "#fff", 3) if on else ""}</div>'

def empty(icon, h, p):
    return (f'<div class="empty"><div class="ei">{ic(icon, 28, T["text3"])}</div>'
            f'<div class="h3">{e(h)}</div><div class="p" style="max-width:260px">{e(p)}</div></div>')

def screen(name, body, tabs=None, active=None, fab=None, extra='', height=None, footer=None, dark_status=False, bg=None, bodycls='', pre=''):
    st = []
    if height: st.append(f'min-height:{height}px')
    if bg: st.append(f'background:{bg}')
    pb = ' pb' if tabs else ''
    f = f'<div class="fab">{ic("plus", 20)}{e(fab)}</div>' if fab else ''
    tb = tabbar(tabs, active) if tabs else ''
    ft = f'<div class="footer">{footer}</div>' if footer else ''
    return (f'<div class="screen" data-name="{e(name)}" style="{";".join(st)}">{statusbar(dark_status)}{pre}'
            + (f'<div class="body{pb} {bodycls}">{body}</div>' if body else '@@BODY@@') + f'{ft}{f}{tb}{extra}</div>')

def sheet_screen(name, behind, sheet_body, title_txt, sub=None, footer=None, top=110, height=None):
    """A form presented as a bottom sheet over a dimmed screen."""
    s = sub and f'<div class="p">{e(sub)}</div>' or ''
    ft = f'<div class="footer" style="background:{T["surface"]}">{footer}</div>' if footer else ''
    hs = f' style="min-height:{height}px"' if height else ''
    return (f'<div class="screen" data-name="{e(name)}"{hs}>{statusbar()}<div class="body" style="opacity:.9">{behind}</div>'
            f'<div class="scrim"></div><div class="sheet" style="top:{top}px"><div class="grab"></div>'
            f'<div class="between" style="padding:8px 20px 4px"><div class="col" style="gap:2px"><div class="h2" style="font-size:22px">{title_txt}</div>{s}</div>'
            f'<div class="iconbtn">{ic("x")}</div></div>'
            f'<div class="sbody" style="flex:1">{sheet_body}</div>{ft}</div></div>')

def page(screens, title='Mountain Bakes'):
    return (f'<!doctype html><html><head><meta charset="utf-8"><title>{e(title)}</title>{FONTS}<style>{CSS}</style></head>'
            f'<body>{"".join(screens)}</body></html>')

BRANCH_TABS = [('Home', 'home'), ('Orders', 'orders'), ('Sales', 'cart'), ('Stock', 'stock'), ('More', 'more')]
PROD_TABS = [('Dashboard', 'home'), ('Orders', 'orders'), ('Stock', 'stock'), ('Returns', 'return'), ('More', 'more')]
FIN_TABS = [('Home', 'home'), ('Ledger', 'ledger'), ('Transfers', 'transfer'), ('Payroll', 'payroll'), ('More', 'more')]
