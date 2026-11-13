"""Rewrite cairo 'compositing-group' feImage/feComposite filters (which Figma ignores -> black rect)
into plain stacked <use> of destination then source group."""
import re, sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
filters = {}
for m in re.finditer(r'<filter id="(filter-\d+)"[^>]*>(.*?)</filter>', s, re.S):
    hrefs = re.findall(r'<feImage xlink:href="#([^"]+)" result="(source|destination)"', m.group(2))
    if hrefs and 'feComposite' in m.group(2):
        filters[m.group(1)] = dict((r, h) for h, r in hrefs)
n = 0
def repl(m):
    global n
    fid, attrs = m.group(1), m.group(2)
    if fid not in filters: return m.group(0)
    f = filters[fid]; n += 1
    return f'<g{attrs}><use xlink:href="#{f["destination"]}"/><use xlink:href="#{f["source"]}"/></g>'
s = re.sub(r'<g filter="url\(#(filter-\d+)\)"([^>]*)>\s*<rect [^>]*/>\s*</g>', repl, s)
# destination groups: drop their (inverted) masks so nothing is lost
for f in filters.values():
    s = re.sub(r'(<g id="%s") mask="url\(#[^)]+\)"' % re.escape(f['destination']), r'\1', s)
# source groups: if mask is a white rect clipped by a clipPath, turn it into that clip-path
for f in filters.values():
    m = re.search(r'<g id="%s" mask="url\(#([^)]+)\)">\s*<g transform="([^"]*)">' % re.escape(f['source']), s)
    if not m: continue
    mk = re.search(r'<mask id="%s">\s*<use xlink:href="#([^"]+)"/>\s*</mask>' % re.escape(m.group(1)), s)
    if not mk: continue
    grp = re.search(r'<g id="%s" transform="([^"]*)">(.*?)</g>\s*</g>' % re.escape(mk.group(1)), s, re.S)
    clip = grp and re.search(r'<clipPath id="([^"]+)">', grp.group(2))
    if clip and grp.group(1) == m.group(2) and grp.group(2).count('fill-opacity="1"') == 1:
        s = s[:m.start()] + f'<g id="{f["source"]}"><g transform="{m.group(2)}" clip-path="url(#{clip.group(1)})">' + s[m.end():]
open(dst, 'w').write(s)
print(n, 'filters rewritten', sys.argv[1].split('/')[-1])
