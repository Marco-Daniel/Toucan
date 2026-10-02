import math
R=1.5   # corner softening: width of the round stroke join
def ngon(cx,cy,r,n=14,rot=0):
    return " ".join(f"{cx+r*math.sin(2*math.pi*i/n+rot):.2f},{cy-r*math.cos(2*math.pi*i/n+rot):.2f}" for i in range(n))
def star(cx,cy,ro,ri):
    return " ".join(f"{cx+(ro if i%2==0 else ri)*math.sin(math.pi*i/5):.2f},{cy-(ro if i%2==0 else ri)*math.cos(math.pi*i/5):.2f}" for i in range(10))
# name -> (width, [filled polygons], [hole polygons])
G={
 "square":(16,["1.2,1.2 14.8,1.2 14.8,14.8 1.2,14.8"],[]),
 "bar":(6,["1.2,0.4 4.8,0.4 4.8,15.6 1.2,15.6"],[]),
 "pill":(44,["7,1.2 37,1.2 42.8,4 42.8,12 37,14.8 7,14.8 1.2,12 1.2,4"],[]),
 "circle":(16,[ngon(8,8,6.8)],[]),
 "double-circle":(16,[ngon(8,8,6.8)],[ngon(8,8,4.6)]),
 "check-circle":(16,[ngon(8,8,6.8)],["4.3,8.1 5.4,7 6.9,8.5 10.6,4.8 11.7,5.9 6.9,10.7"]),
 # after the app icon, drawn for 16px: big head, long beak hooking down, chest, short tail
 "toucan":(18,["4.6,1.2 7.4,1.3 7.8,5.2 10.6,7.6 11,10.4 8.8,13.2 6.4,15.3 4.4,15.3 4.4,13 1.6,11 1.8,6 3,2.8",
              "7.9,1.4 11.6,0.9 14.8,2 16.8,4.2 17.1,7.4 14.6,5.2 8.3,5.3"],["7.35,0.9 7.75,0.9 8.05,5.7 7.65,5.7", ngon(5.2,3.6,0.9,8)]),
 "leaf":(16,["1.5,14.5 3,10 6,5 10.5,2 14.5,1.5 14,6 11,11 6,13.5"],[]),
 "flame":(16,["8,0.8 11,4 13.3,8 12.8,12 10.4,14.9 5.6,14.9 3.2,12 3,8.5 5,5.2 6,8 7.4,4.6"],[]),
 "moon":(16,None,None),
 "drop":(16,["8,0.8 12.4,7.5 12.9,11 11,14.4 8,15.3 5,14.4 3.1,11 3.6,7.5"],[]),
 "cactus":(16,["6,15 6,11 1.2,10.5 1.2,4.6 3,4.6 3,8 6,8 6,2 8,1 10,2 10,6 13,6 13,3 14.8,3 14.8,9.5 10,9.5 10,15"],[]),
 "alien":(16,["8,1 12.5,3 14.6,7 12,12 8,15 4,12 1.4,7 3.5,3"],["3.8,6.6 7.1,8.2 6.6,10.2 4.5,9.4","12.2,6.6 8.9,8.2 9.4,10.2 11.5,9.4"]),
 "ghost":(16,["8,1 12.5,3 14,7 14,15 11.5,13 9.5,15 8,13 6.5,15 4.5,13 2,15 2,7 3.5,3"],["4.8,6.2 7,6.2 7,9.4 4.8,9.4","9,6.2 11.2,6.2 11.2,9.4 9,9.4"]),
 "robot":(16,["2,4.4 7,4.4 7,1.2 9,1.2 9,4.4 14,4.4 14,14.6 2,14.6"],["4.3,7 6.7,7 6.7,9.6 4.3,9.6","9.3,7 11.7,7 11.7,9.6 9.3,9.6","5,11.2 11,11.2 11,12.6 5,12.6"]),
 "cat":(16,["2,15 1.5,6 2.6,1.2 6,4 10,4 13.4,1.2 14.5,6 14,15"],["4.3,7.8 6.6,7.8 6.6,10.2 4.3,10.2","9.4,7.8 11.7,7.8 11.7,10.2 9.4,10.2"]),
 "paw":(16,["4,11 6,8.5 10,8.5 12,11 11,14.6 5,14.6","1.5,6 3.5,5 4.5,8 2.5,9","5,2 7,1.5 7.5,5 5.5,5.5","9,1.5 11,2 10.5,5.5 8.5,5","12.5,5 14.5,6 13.5,9 11.5,8"],[]),
 "bolt":(16,["10,0.8 3,9 7.5,9 6,15.2 13,6 8.5,6"],[]),
 "heart":(16,["8,14.4 1.5,8 1.5,4.6 4,2 6.5,2 8,3.8 9.5,2 12,2 14.5,4.6 14.5,8"],[]),
 "star":(16,[star(8,8.6,7.4,3.3)],[]),
 "rocket":(16,["8,0.8 10.5,3.5 11,9 13.5,12 13.5,14.6 10.5,13 9.5,15 6.5,15 5.5,13 2.5,14.6 2.5,12 5,9 5.5,3.5"],[ngon(8,6.6,1.3,8)]),
 "crown":(16,["1.2,4 4.5,8 8,2 11.5,8 14.8,4 14,14 2,14"],[]),
 "gem":(16,["4,2 12,2 15,6 8,15 1,6"],[]),
}

def spiky_sun(cx=8,cy=8,rays=10,ro=7.6,ri=4.4,twist=0.42):
    # a disc with curved, flame-like rays: each ray leans sideways (twist), like a pinwheel
    pts=[]
    for i in range(rays):
        a=2*math.pi*i/rays
        pts.append((cx+ri*math.sin(a), cy-ri*math.cos(a)))                     # valley
        b=a+math.pi/rays*(1+twist)
        pts.append((cx+ro*math.sin(b), cy-ro*math.cos(b)))                     # tip, leaning
    return " ".join(f"{x:.2f},{y:.2f}" for x,y in pts)
G["sun"]=(16,[spiky_sun()],[])
G["sun-8"]=(16,[spiky_sun(rays=8,ro=7.6,ri=4.0,twist=0.5)],[])
G["sun-12"]=(16,[spiky_sun(rays=12,ro=7.6,ri=4.8,twist=0.35)],[])

def curl_sun(cx=8,cy=8,rays=9,ro=7.7,ri=4.3):
    # each ray curls: valley -> bulge out along one side -> tip swept back -> valley
    pts=[]; st=2*math.pi/rays
    for i in range(rays):
        a=st*i
        for f,r in [(0.0,ri),(0.25,ri+1.6),(0.55,ro-0.9),(0.95,ro),(0.8,ri+1.3)]:
            pts.append((cx+r*math.sin(a+f*st), cy-r*math.cos(a+f*st)))
    return " ".join(f"{x:.2f},{y:.2f}" for x,y in pts)
G["sun-curl"]=(16,[curl_sun()],[])
G["sun-curl-7"]=(16,[curl_sun(rays=7,ro=7.7,ri=4.0)],[])

def ray_sun(cx=8,cy=8,rays=7,disc=2.5,r_in=5.0,ro=7.2):
    # a disc, then a ring of separate curling rays with open space in between
    st=2*math.pi/rays; polys=[ngon(cx,cy,disc,12)]
    for i in range(rays):
        a=st*i
        pts=[(r_in,0.0),(r_in,0.55),(r_in+1.3,0.72),(ro,0.98),(r_in+1.0,0.38)]
        polys.append(" ".join(f"{cx+r*math.sin(a+f*st):.2f},{cy-r*math.cos(a+f*st):.2f}" for r,f in pts))
    return polys
G["sun-rays-7"]=(16,ray_sun(),[])
G["sun-rays-9"]=(16,ray_sun(rays=9,r_in=5.0,ro=7.2),[])

def pin_sun(cx=8,cy=8,rays=8,disc=2.6,r_in=5.0,ro=7.4,half=0.32):
    # a disc and a ring of separate straight pins pointing outward (wide base, tapered tip)
    st=2*math.pi/rays; polys=[ngon(cx,cy,disc,12)]
    for i in range(rays):
        a=st*i
        pts=[(r_in,-half),(r_in,half),(ro,0.0)]
        polys.append(" ".join(f"{cx+r*math.sin(a+f*st/1):.2f},{cy-r*math.cos(a+f*st/1):.2f}" for r,f in [(r,f*st/ (2*math.pi/rays)) for r,f in pts]))
    return polys
G["sun-pins-8"]=(16,pin_sun(half=0.2,r_in=5.0,ro=7.9,disc=2.8),[])
G["sun-pins-8b"]=(16,pin_sun(half=0.26,r_in=4.8,ro=7.9,disc=2.7),[])
G["sun-pins-9"]=(16,pin_sun(rays=9,half=0.24,r_in=4.8,ro=7.9,disc=2.7),[])
G["sun-pins-10"]=(16,pin_sun(rays=10,half=0.15,r_in=5.2,disc=2.8),[])
GROUPS=[("Shapes",["square","bar","pill","circle"]),
        ("Toucan's world",["toucan","sun-pins-8","leaf","moon"]),
        ("Characters",["alien","ghost","robot","cat"]),
        ("Fun &amp; dev",["bolt","heart","star","rocket"])]
COLOR="#faa404"; INK="#101316"
def glyph(name,x,y,s,color,mid):
    w,fills,holes=G[name]
    if name=="moon":
        fills=[ngon(8,8,6.8)]; holes=[ngon(11.4,5.4,5.8)]
    rr=0.7 if name.startswith("sun-pins") else R
    poly=lambda pts,col: f'<polygon points="{pts}" fill="{col}" stroke="{col}" stroke-width="{rr}" stroke-linejoin="round"/>'
    m=f'<mask id="m{mid}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="{w+8}" height="24">'+"".join(poly(p,"#fff") for p in fills)+"".join(f'<polygon points="{h}" fill="#000" stroke="#000" stroke-width="{R*0.45}" stroke-linejoin="round"/>' for h in holes)+'</mask>'
    return f'<g transform="translate({x} {y}) scale({s})">{m}<rect x="-4" y="-4" width="{w+8}" height="24" fill="{color}" mask="url(#m{mid})"/></g>'
out=[]; y=20; mid=0
for title,names in GROUPS:
    out.append(f'<text x="20" y="{y+14}" font-family="-apple-system,Helvetica" font-size="16" font-weight="600" fill="#222">{title}</text>')
    y+=26; x=20
    for n in names:
        w=G[n][0]; cell=max(110, w*2.2+30)
        out.append(f'<rect x="{x}" y="{y}" width="{cell-10}" height="64" rx="8" fill="#f3f1ec"/>')
        out.append(glyph(n, x+(cell-10-w*2.4)/2, y+12.8, 2.4, INK, mid)); mid+=1
        for k,(bg,fg) in enumerate([("#181818","#cccccc"),("#f8f8f8","#3b3b3b")]):
            by=y+70+k*26
            out.append(f'<rect x="{x}" y="{by}" width="{cell-10}" height="22" fill="{bg}"/>')
            out.append(glyph(n, x+6, by+3, 1, "#e0620b" if k else COLOR, mid)); mid+=1
            out.append(f'<text x="{x+12+w}" y="{by+15}" font-family="-apple-system,Helvetica" font-size="11" fill="{fg}">repo</text>')
        out.append(f'<text x="{x+(cell-10)/2}" y="{y+140}" font-family="-apple-system,Helvetica" font-size="12" text-anchor="middle" fill="#333">{n}</text>')
        x+=cell
    y+=160
W=780; H=max(W,y+10)
open("glyph-sheet.svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W*2}" height="{H*2}"><rect width="{W}" height="{H}" fill="#fff"/>{"".join(out)}</svg>')
