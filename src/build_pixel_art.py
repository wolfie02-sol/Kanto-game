from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import struct,json,functools
root=Path(__file__).parent/'art';out=root.parent.parent/'dist/assets/scenery';out.mkdir(parents=True,exist_ok=True)
def pal(path):
 lines=path.read_text().splitlines();return [tuple(map(int,l.split()))+(255,) for l in lines[3:]]
def words(path):
 b=path.read_bytes();return struct.unpack('<'+'H'*(len(b)//2),b)
def tiles_png(path):
 im=Image.open(path);return [im.crop((x,y,x+8,y+8)) for y in range(0,im.height,8) for x in range(0,im.width,8)]
for region in ['grass','longgrass','cave','pond','mountain','sand','building']:
 p=root/'graphics/battle_terrain'/region;tiles=tiles_png(p/'terrain.png');colors=pal(p/'terrain.pal');mp=words(p/'terrain.bin');im=Image.new('RGBA',(256,len(mp)//32*8))
 for i,v in enumerate(mp):
  idx=v&1023
  if idx>=len(tiles):continue
  src=tiles[idx];bank=(v>>12)*16
  tile=Image.new('RGBA',(8,8));tile.putdata([(0,0,0,0) if n==0 else colors[(bank+n)%len(colors)] for n in src.getdata()])
  if v&1024:tile=tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
  if v&2048:tile=tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
  im.paste(tile,(i%32*8,i//32*8))
 im.crop((0,0,240,112)).save(out/f'battle-{region}.png')
 print(region,len(mp),im.size)
primary=root/'data/tilesets/primary/general';secondary=root/'data/tilesets/secondary/pallet_town'
tiles=tiles_png(primary/'tiles.png')+tiles_png(secondary/'tiles.png')
pmet=words(primary/'metatiles.bin');smet=words(secondary/'metatiles.bin');print('primary metatiles',len(pmet)//8,'secondary',len(smet)//8,'tiles',len(tiles))
# FR uses 640 primary tiles and 640 primary metatiles. Secondary palettes begin at slot 7.
metas=[pmet[i:i+8] for i in range(0,len(pmet),8)]+[smet[i:i+8] for i in range(0,len(smet),8)]
palettes=[pal((primary if i<7 else secondary)/f'palettes/{i:02}.pal') for i in range(13)]
@functools.lru_cache(None)
def meta(index):
 im=Image.new('RGBA',(16,16))
 if index>=len(metas):return im
 for i,v in enumerate(metas[index]):
  idx=v&1023;bank=v>>12
  if idx>=len(tiles) or bank>=len(palettes):continue
  colors=palettes[bank];tile=Image.new('RGBA',(8,8));tile.putdata([(0,0,0,0) if i>=4 and n==0 else colors[n%len(colors)] for n in tiles[idx].getdata()])
  if v&1024:tile=tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
  if v&2048:tile=tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
  im.alpha_composite(tile,((i%4)%2*8,(i%4)//2*8))
 return im
layouts=json.loads((root/'data/layouts/layouts.json').read_text());layout=next(l for l in layouts['layouts'] if l.get('name')=='PalletTown_Layout');print(layout)
w,h=layout['width'],layout['height'];mp=words(root/'data/layouts/PalletTown/map.bin');im=Image.new('RGBA',(w*16,h*16))
for i,v in enumerate(mp):im.alpha_composite(meta(v&1023),(i%w*16,i//w*16))
im.save(out/'pallet-source.png')
# Labeled sheets are build-time references only.
for start,end,name in [(0,128,'terrain-atlas'),(640,len(metas),'pallet-atlas')]:
 sheet=Image.new('RGB',(16*32,((end-start+15)//16)*32),'#333333');d=ImageDraw.Draw(sheet)
 for i in range(start,end):
  x=(i-start)%16*32;y=(i-start)//16*32;sheet.paste(meta(i),(x,y),meta(i));d.text((x,y+18),str(i),fill='white')
 sheet.save(root/(name+'.png'))
# Compact atlas for the renderer to use; rows are actual metatile IDs.
atlas=Image.new('RGBA',(16*16,((len(metas)+15)//16)*16))
for i in range(len(metas)):atlas.alpha_composite(meta(i),(i%16*16,i//16*16))
atlas.save(out/'kanto-tiles.png')
# Assemble game-native metatiles into reusable assets matched to this world's collision footprints.
def compose(grid,name):
 im=Image.new('RGBA',(len(grid[0])*16,len(grid)*16))
 for y,row in enumerate(grid):
  for x,i in enumerate(row):im.alpha_composite(meta(i),(x*16,y*16))
 im.save(out/name);return im
house=compose([[641,642,642,642,642,643],[649,650,650,650,650,651],[657,659,658,658,658,660],[664,666,666,665,667,668],[672,674,674,675,673,676]],'house-red.png')
import colorsys
for name,hue in [('blue',.57),('gold',.12)]:
 im=house.copy()
 for y in range(32):
  for x in range(im.width):
   r,g,b,a=im.getpixel((x,y));h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
   if a and s>.16:
    rr,gg,bb=colorsys.hsv_to_rgb(hue,s*.65,v*.94);im.putpixel((x,y),(int(rr*255),int(gg*255),int(bb*255),a))
 im.save(out/f'house-{name}.png')
compose([[680,681,681,681,701,693],[688,689,689,689,691,692],[696,697,697,697,699,700],[704,705,706,720,707,709],[712,713,715,728,716,717]],'laboratory.png')
compose([[20,21],[28,29]],'tree.png')
# The water and foliage samples retain the source's native pixel textures.
for name,i in [('grass',17),('flowers',4),('fence',644),('ground',8),('path',686),('water',mp[18*24+7]&1023)]:meta(i).save(out/(name+'.png'));print(name,i)
# Original illustrated battle terrain, drawn at a fixed pixel grid for crisp integer-scaled rendering.
import random,math
rng=random.Random(151)
im=Image.new('RGB',(320,160));d=ImageDraw.Draw(im)
for y in range(83):
 c=(int(116+y*.55),int(185+y*.4),int(224+y*.15));d.line((0,y,319,y),fill=c)
for cx,cy,w in [(20,14,67),(150,8,76),(265,29,61)]:
 d.rectangle((cx,cy+10,cx+w,cy+22),fill='#d8eef3');d.rectangle((cx+12,cy+5,cx+w-8,cy+21),fill='#eaf7f7');d.rectangle((cx+24,cy,cx+w-20,cy+20),fill='#f4faf4');d.rectangle((cx+3,cy+12,cx+w-1,cy+18),fill='#f4faf4')
d.polygon([(0,78),(0,63),(16,52),(34,51),(47,60),(66,46),(83,45),(101,55),(117,43),(133,47),(147,62),(170,48),(190,52),(208,59),(228,47),(244,47),(267,60),(284,49),(303,55),(319,51),(319,90)],fill='#63985e')
d.polygon([(0,84),(0,73),(19,60),(36,59),(45,66),(58,58),(76,58),(88,68),(109,53),(129,58),(143,73),(160,60),(175,62),(189,70),(207,57),(226,58),(240,70),(254,60),(273,63),(287,73),(307,60),(319,64),(319,90)],fill='#77ad68')
for x in range(0,320,21):d.polygon([(x,84),(x+10,65+rng.randrange(8)),(x+23,63+rng.randrange(8)),(x+8,84)],fill='#8bbc75')
for y in range(82,160):
 d.line((0,y,319,y),fill=('#80bc64' if y<100 else '#87c76d' if y<129 else '#8fce73'))
for i in range(1200):
 x=rng.randrange(320);y=rng.randrange(83,160);color=rng.choice(['#9fd97c','#83bd62','#72b257','#b1de83']);d.line((x,y,x+rng.randrange(1,4),y),fill=color)
for cx,cy,w,h in [(242,99,111,22),(76,150,143,26)]:
 d.ellipse((cx-w//2,cy-h//2+3,cx+w//2,cy+h//2+3),fill='#4e8744');d.ellipse((cx-w//2,cy-h//2,cx+w//2,cy+h//2),fill='#69a44f');d.ellipse((cx-w//2+4,cy-h//2,cx+w//2-4,cy+h//2-5),fill='#83ba5c')
 for i in range(250):
  x=rng.randrange(cx-w//2,cx+w//2);y=rng.randrange(cy-h//2,cy+h//2-4)
  if ((x-cx)/(w*.49))**2+((y-cy+2)/(h*.42))**2<1:d.point((x,y),fill=rng.choice(['#afd378','#a1cc70','#6fa64e']))
im.save(out/'battle-meadow.png')
# Strip source-map margins from free-standing sprites and shift foliage to a warmer Kanto palette.
from collections import deque
for name in ['house-red','house-blue','house-gold','laboratory','tree','grass','flowers','fence','ground']:
 path=out/(name+'.png');im=Image.open(path).convert('RGBA')
 if name.startswith('house') or name=='laboratory':
  for y in range(im.height):
   for x in range(im.width):
    r,g,b,a=im.getpixel((x,y));h,ss,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
    if .30<h<.50 and g>r*1.04 and g>b*1.02:im.putpixel((x,y),(r,g,b,0))
 if name=='tree':
  color=im.getpixel((0,0));seen=set();q=deque([(0,0),(31,0),(0,31),(31,31)])
  while q:
   x,y=q.popleft()
   if (x,y) in seen or x<0 or y<0 or x>=im.width or y>=im.height:continue
   seen.add((x,y))
   if im.getpixel((x,y))!=color:continue
   im.putpixel((x,y),(0,0,0,0));q.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
 for y in range(im.height):
  for x in range(im.width):
   r,g,b,a=im.getpixel((x,y));h,ss,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
   if .32<h<.50 and a:
    rr,gg,bb=colorsys.hsv_to_rgb(h-.10,ss,v*.98);im.putpixel((x,y),(int(rr*255),int(gg*255),int(bb*255),a))
 im.save(path)
meta(299).save(out/'water.png')
