from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
import sys
upm=1000
def rect(w, top, bot, x0=0):
    p=TTGlyphPen(None); p.moveTo((x0,bot)); p.lineTo((x0,top)); p.lineTo((w-x0,top)); p.lineTo((w-x0,bot)); p.closePath(); return p.glyph()
glyphs={'.notdef':TTGlyphPen(None).glyph(),'pill':rect(3000,875,-125,0),'square':rect(1000,875,-125,0),'bar':rect(400,1000,-250,0)}
adv={'.notdef':500,'pill':3000,'square':1000,'bar':400}
fb=FontBuilder(upm,isTTF=True); fb.setupGlyphOrder(list(glyphs)); fb.setupCharacterMap({0xE000:'pill',0xE001:'square',0xE002:'bar'})
fb.setupGlyf(glyphs); fb.setupHorizontalMetrics({k:(v,0) for k,v in adv.items()}); fb.setupHorizontalHeader(ascent=875,descent=-125)
fb.setupNameTable({'familyName':'ToucanIcons','styleName':'Regular'}); fb.setupOS2(); fb.setupPost()
fb.font.flavor='woff'; fb.save(sys.argv[1])
