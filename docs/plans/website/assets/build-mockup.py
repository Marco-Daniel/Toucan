# Builds the Toucan website landing-page mockup: python3 build.py <toucan checkout>
import re, sys, pathlib

root = pathlib.Path(sys.argv[1])
here = pathlib.Path(__file__).parent
icon = (root / "apps/extension/media/toucan-icon.svg").read_text()
logo = (root / "apps/extension/media/toucan-logo.svg").read_text()
logo = re.sub(r'width="512" height="512"', 'class="logo"', logo)
# The hero is the icon's own sunset scene without its green tile: the sun sinking behind
# the horizon line, the bird in front, all on the page's jungle green.
scene = icon.replace('<rect width="128" height="128" rx="28" fill="#56915e"/>', "")
scene = scene.replace('id="beak"', 'id="hero-beak"').replace("url(#beak)", "url(#hero-beak)")
scene = scene.replace('id="sky"', 'id="hero-sky"').replace("url(#sky)", "url(#hero-sky)")
scene = scene.replace('fill="#56915e"/></g>', 'fill="#56915e"/><rect x="0" y="78" width="128" height="1.6" fill="#56915e"/></g>')
icon = re.sub(r'width="512" height="512"', 'class="hero-icon" viewBox="0 0 128 128"', scene, count=1)
icon = icon.replace('viewBox="0 0 128 128" class="hero-icon" viewBox="0 0 128 128"', 'viewBox="0 0 128 128" class="hero-icon"')

def glyph(name, color):
    svg = (root / f"apps/extension/media/icons/{name}.svg").read_text()
    svg = svg.replace('fill="#000000"', f'fill="{color}"')
    return re.sub(r'width="(\d+)" height="16"', r'class="g"', svg)

groups = [("Shapes", ["square", "bar", "pill", "circle"]),
          ("Toucan's world", ["toucan", "sun", "leaf", "drop", "moon"]),
          ("Characters", ["alien", "ghost", "robot", "cat"]),
          ("Fun &amp; dev", ["bolt", "heart", "star", "rocket"])]
presets = [("Beak Red", "#f92824"), ("Berry Red", "#a3161a"), ("Beak Orange", "#e0620b"),
           ("Bill Amber", "#faa404"), ("Beak Yellow", "#fde246"), ("Bill Lime", "#8a9c05"),
           ("Jungle Green", "#56915e"), ("Canopy Teal", "#14939c"), ("Slate Blue", "#2c4a51"),
           ("Orchid Purple", "#6241bd"), ("Lilac", "#b59ae0"), ("Plum", "#70486c"),
           ("Tropical Pink", "#e8579b"), ("Blossom Pink", "#f5a3c7"), ("Silver", "#a7a8b3"),
           ("Plumage Black", "#101316")]
cycle = ["#e0620b", "#14939c", "#e8579b", "#56915e", "#6241bd", "#faa404"]

glyph_html = "".join(
    f'<div class="ggroup"><h4>{label}</h4><div class="grow">'
    + "".join(f'<span class="gchip" style="--c:{cycle[i % 6]}">{glyph(n, "currentColor")}<em>{n}</em></span>'
              for i, n in enumerate(names))
    + "</div></div>" for label, names in groups)
swatches = "".join(
    f'<li style="--c:{h}"><span></span><b>{n}</b><code>{h}</code></li>' for n, h in presets)
bars = "".join(
    f'<div class="sbar" style="color:{c}"><span class="sg">{glyph(g, "currentColor")}</span>{r}</div>'
    for g, c, r in [("heart", "#e8579b", "webshop"), ("rocket", "#14939c", "payments-api"), ("leaf", "#faa404", "docs-site")])

html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Toucan Site Mockup</title>
<style>
:root{{--ink:#101316;--cream:#f6efdc;--paper:#fbf7ec;--amber:#faa404;--orange:#e0620b;--jungle:#56915e;--teal:#14939c;--muted:#5b5e57;--line:#e4dcc6}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 ui-sans-serif,-apple-system,"Segoe UI",Inter,sans-serif}}
a{{color:inherit}}
.wrap{{max-width:1120px;margin:0 auto;padding:0 24px}}
.beak{{height:10px;background:linear-gradient(105deg,var(--cream) 0 70%,var(--amber) 70% 80%,var(--orange) 80% 90%,var(--ink) 90%)}}
nav{{position:sticky;top:0;z-index:5;background:rgba(251,247,236,.92);backdrop-filter:blur(8px)}}
nav::after{{content:"";display:block;height:4px;background:linear-gradient(105deg,var(--cream) 0 70%,var(--amber) 70% 80%,var(--orange) 80% 90%,var(--ink) 90%)}}
nav .wrap{{display:flex;align-items:center;gap:28px;height:64px}}
.brand{{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px;letter-spacing:-.02em;text-decoration:none}}
.logo{{width:34px;height:34px}}
nav .links{{display:flex;gap:22px;margin-left:auto;font-weight:600;font-size:15px}}
nav .links a{{text-decoration:none;opacity:.8}} nav .links a:hover{{opacity:1}}
.btn{{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:10px;font-weight:700;text-decoration:none;border:2px solid var(--ink);font-size:15px}}
.btn.primary{{background:var(--ink);color:var(--cream)}}
.btn.ghost{{background:transparent}}
.btn.sm{{padding:7px 13px;font-size:14px}}
.hero{{position:relative;overflow:hidden;background:var(--jungle);color:var(--cream)}}
.hero .wrap{{position:relative;z-index:1;display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center;padding-top:72px;padding-bottom:64px}}
.eyebrow{{display:inline-block;font-weight:700;font-size:13px;letter-spacing:.08em;text-transform:uppercase;background:rgba(16,19,22,.25);padding:5px 10px;border-radius:6px}}
h1{{font-size:64px;line-height:1.02;letter-spacing:-.035em;margin:18px 0 18px;font-weight:850}}
h1 em{{font-style:normal;color:var(--amber)}}
.lede{{font-size:19px;max-width:30em;opacity:.95;margin:0 0 28px}}
.hero .btn.primary{{background:var(--cream);color:var(--ink);border-color:var(--cream)}}
.hero .btn.ghost{{color:var(--cream);border-color:var(--cream)}}
.ctas{{display:flex;gap:12px;flex-wrap:wrap}}
.meta{{margin-top:18px;font-size:14px;opacity:.85}}
.hero-art{{position:relative;display:flex;flex-direction:column;align-items:center}}
.hero-icon{{width:100%;max-width:440px;height:auto;display:block;margin-bottom:-36px}}
.stack{{position:relative;width:min(100%,400px);background:#181818;border-radius:12px;padding:10px;box-shadow:0 20px 40px rgba(0,0,0,.3)}}
.sbar{{display:flex;align-items:center;gap:8px;height:30px;padding:0 12px;color:#ccc;font:13px ui-monospace,Menlo,monospace;border-bottom:1px solid #2a2a2a}}
.sbar:last-child{{border:0}} .sg .g{{width:16px;height:16px;display:block}}
section{{padding:88px 0}}
h2::before{{content:"";display:block;width:84px;height:8px;margin-bottom:18px;border-radius:2px;background:linear-gradient(105deg,var(--cream) 0 38%,var(--amber) 38% 58%,var(--orange) 58% 78%,var(--ink) 78%);box-shadow:inset 0 0 0 1px rgba(16,19,22,.12)}}
.dark h2::before{{box-shadow:none}}
h2{{font-size:40px;letter-spacing:-.03em;line-height:1.1;margin:0 0 14px;font-weight:850}}
.sub{{color:var(--muted);font-size:18px;max-width:36em;margin:0 0 40px}}
.gif{{border-radius:14px;border:2px solid var(--ink);display:block;width:100%;background:#181818;box-shadow:8px 8px 0 var(--amber)}}
.caption{{font-size:14px;color:var(--muted);margin-top:14px}}
.features{{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}}
.card{{background:#fff;border:2px solid var(--ink);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}}
.card img{{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;object-position:top left;border-bottom:2px solid var(--ink)}}

.strip{{aspect-ratio:16/10;background:#181818;border-bottom:2px solid var(--ink);display:flex;align-items:center;overflow:hidden}}
.card .strip img{{width:270%;max-width:none;margin-left:-82%;aspect-ratio:auto;border:0;object-fit:fill}}
.hero .wrap>*,.features>*,.install>*,.glyphs>*{{min-width:0}}
html,body{{overflow-x:clip}}
.card .body{{padding:18px 20px 22px}}
.card h3{{margin:0 0 6px;font-size:20px;letter-spacing:-.01em}}
.card p{{margin:0;color:var(--muted);font-size:15px}}
.tag{{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:8px;vertical-align:-1px}}
.dark{{background:var(--ink);color:var(--cream)}}
.dark .sub{{color:#b9b4a6}}
.glyphs{{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}}
.ggroup h4{{margin:0 0 10px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b9b4a6}}
.grow{{display:flex;flex-wrap:wrap;gap:8px}}
.gchip{{display:flex;flex-direction:column;align-items:center;gap:6px;width:72px;padding:12px 0 8px;border-radius:12px;background:#1c2024;color:var(--c)}}
.gchip .g{{height:28px;width:auto}} .gchip em{{font-style:normal;font-size:12px;color:#d8d2c2}}
.palette{{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(8,1fr);gap:12px}}
.palette li{{display:flex;flex-direction:column;gap:4px;font-size:12px}}
.palette span{{display:block;aspect-ratio:1;border-radius:12px;background:var(--c);border:2px solid var(--ink)}}
.palette b{{font-size:13px}} .palette code{{color:var(--muted);font-size:12px}}
.install{{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}}
.install .card{{padding:24px}}
.install code{{display:block;margin-top:12px;background:var(--ink);color:var(--cream);padding:10px 12px;border-radius:8px;font-size:13px;overflow-x:auto}}
footer{{border-top:1px solid var(--line);padding:36px 0 48px;color:var(--muted);font-size:14px}}
footer .wrap{{display:flex;gap:20px;align-items:center;flex-wrap:wrap}}
.note{{position:fixed;right:16px;bottom:16px;z-index:9;max-width:300px;background:#fff;border:2px solid var(--ink);border-radius:12px;padding:12px 14px;font-size:13px;box-shadow:4px 4px 0 var(--amber)}}
@media (max-width:860px){{
 .hero .wrap{{grid-template-columns:1fr}} h1{{font-size:44px}} .features,.install{{grid-template-columns:1fr}}
 .glyphs{{grid-template-columns:repeat(2,1fr)}} .palette{{grid-template-columns:repeat(4,1fr)}} nav .links{{display:none}} .note{{display:none}}}}
</style></head><body>
<nav><div class="wrap"><a class="brand" href="#">{logo}Toucan</a>
<div class="links"><a href="#features">Features</a><a href="#glyphs">Glyphs</a><a href="#">Docs</a><a href="#">Changelog</a><a href="#">GitHub</a></div>
<a class="btn primary sm" href="#install">Install</a></div></nav>

<header class="hero"><div class="wrap">
<div><span class="eyebrow">VS Code extension</span>
<h1>Every repo gets its <em>own color</em>.</h1>
<p class="lede">Toucan tints the Command Center, marks the status bar with a glyph and can fill the sidebar, so you always know which window you're typing in.</p>
<div class="ctas"><a class="btn primary" href="#install">Install for VS Code</a><a class="btn ghost" href="#features">See how it works</a></div>
<p class="meta">Free and open source · Works with Cursor and VSCodium via Open VSX</p></div>
<div class="hero-art">{icon}<div class="stack">{bars}</div></div>
</div></header>

<section><div class="wrap">
<h2>Three windows, three colors.</h2>
<p class="sub">Open your repos side by side and tell them apart at a glance. The Command Center follows the focused window; the status bar always shows each window's own color.</p>
<img class="gif" src="img/hero.gif" alt="Three VS Code windows, each with its own Toucan color and glyph">
</div></section>

<section id="features" style="padding-top:0"><div class="wrap">
<h2>What Toucan colors</h2><p class="sub">Pick a color once per repo. Toucan stores it in your settings and repaints every window that opens it.</p>
<div class="features">
<div class="card"><div class="strip"><img src="img/command-center.png" alt=""></div><div class="body"><h3><span class="tag" style="background:#e8579b"></span>Command Center</h3><p>The search bar at the top takes the repo's color, with a readable text color worked out for you.</p></div></div>
<div class="card"><img src="img/status-bar.png" alt=""><div class="body"><h3><span class="tag" style="background:#14939c"></span>Status bar glyph</h3><p>A small glyph in the repo's color, from 17 hand-drawn shapes, sits next to the repo name.</p></div></div>
<div class="card"><img src="img/sidebar-block.png" alt=""><div class="body"><h3><span class="tag" style="background:#faa404"></span>Sidebar block</h3><p>Optionally fill the secondary sidebar with the color, full or muted. Toucan only closes a bar it opened.</p></div></div>
<div class="card"><img src="img/preset-color.png" alt=""><div class="body"><h3><span class="tag" style="background:#56915e"></span>16 presets</h3><p>A toucan-themed palette with a live preview, and a warning when a color is hard to see on the status bar.</p></div></div>
<div class="card"><img src="img/set-glyph.png" alt=""><div class="body"><h3><span class="tag" style="background:#6241bd"></span>Glyph picker</h3><p>Shapes, Toucan's world, characters and fun &amp; dev glyphs, previewed as you move through them.</p></div></div>
<div class="card"><div class="strip"><img src="img/search-emoji.png" alt=""></div><div class="body"><h3><span class="tag" style="background:#e0620b"></span>Search emoji</h3><p>Experimental: an emoji in the window title, so the repo shows in the Command Center even when it's not focused.</p></div></div>
</div></div></section>

<section id="glyphs" class="dark"><div class="wrap">
<h2>17 glyphs, drawn for 16 pixels.</h2><p class="sub">Every glyph is drawn in Toucan's own font, sized for the status bar and readable on dark and light themes.</p>
<div class="glyphs">{glyph_html}</div></div></section>

<section><div class="wrap">
<h2>A palette from the toucan.</h2><p class="sub">Sixteen presets taken from the bird's beak, plumage and jungle. Or type any CSS color.</p>
<ul class="palette">{swatches}</ul></div></section>

<section id="install" style="background:var(--cream)"><div class="wrap">
<h2>Install</h2><p class="sub">Pick your editor. Then run <b>Toucan: Set Color</b> from the Command Palette.</p>
<div class="install">
<div class="card"><h3>Visual Studio Marketplace</h3><p>For VS Code.</p><code>code --install-extension marco-daniel.toucan</code></div>
<div class="card"><h3>Open VSX</h3><p>For Cursor, VSCodium and Windsurf.</p><code>ext install marco-daniel.toucan</code></div>
<div class="card"><h3>GitHub release</h3><p>Download the .vsix, check its sha256, install from file.</p><code>code --install-extension toucan-0.0.4.vsix</code></div>
</div></div></section>

<footer><div class="wrap">{logo.replace('class="logo"', 'class="logo" style="width:26px;height:26px"')}<span>Toucan · MIT licensed</span><a href="#">Docs</a><a href="#">Changelog</a><a href="#">GitHub</a><span style="margin-left:auto">Built with React Router and Tailwind</span></div></footer>
<div class="note"><b>Mockup</b> for sign-off: layout, colors and tone only. Copy, the extension ID and store links are placeholders. Docs and changelog pages use the same nav, beak band and cream background.</div>
</body></html>'''
(here / "index.html").write_text(html)
print("wrote", here / "index.html")
