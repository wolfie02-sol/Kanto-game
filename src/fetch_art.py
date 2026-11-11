import urllib.request,pathlib,concurrent.futures
root=pathlib.Path(__file__).parent/'art';root.mkdir(exist_ok=True)
paths=[]
for part in ['primary/general','secondary/pallet_town']:
 for file in ['tiles.png','metatiles.bin','metatile_attributes.bin']+[f'palettes/{i:02}.pal' for i in range(13)]:paths.append('data/tilesets/'+part+'/'+file)
for region in ['grass','longgrass','cave','pond','mountain','sand','building']:
 for file in ['terrain.png','terrain.bin','terrain.pal']:paths.append(f'graphics/battle_terrain/{region}/{file}')
paths+=['data/layouts/layouts.json','data/layouts/PalletTown/map.bin']
def get(path):
 dest=root/path;dest.parent.mkdir(parents=True,exist_ok=True)
 try:
  if not dest.exists():dest.write_bytes(urllib.request.urlopen('https://raw.githubusercontent.com/pret/pokefirered/master/'+path,timeout=20).read())
  return path,None
 except Exception as e:return path,str(e)
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
 errors=[(p,e) for p,e in ex.map(get,paths) if e]
print('Art files',len(paths)-len(errors),'Errors',errors)
from PIL import Image
for path in ['data/tilesets/primary/general/tiles.png','data/tilesets/secondary/pallet_town/tiles.png','graphics/battle_terrain/grass/terrain.png']:
 im=Image.open(root/path);print(path,im.size,im.mode)
print((root/'graphics/battle_terrain/grass/terrain.pal').read_text()[:300])
