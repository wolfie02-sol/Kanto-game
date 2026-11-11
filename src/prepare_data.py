import csv,json,pathlib,urllib.request,concurrent.futures
root=pathlib.Path(__file__).parent
out=root.parent/'dist/assets'
out.mkdir(parents=True,exist_ok=True)
for name in ['pokemon','pokemon_stats','pokemon_stats_past','pokemon_types','pokemon_types_past','pokemon_moves','moves','move_changelog','move_names','types','pokemon_species','pokemon_evolution','experience','move_meta','move_meta_stat_changes']:
 if not (root/(name+'.csv')).exists():urllib.request.urlretrieve('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/'+name+'.csv',root/(name+'.csv'))
def rows(n):return list(csv.DictReader((root/(n+'.csv')).open()))
def num(v):return int(v) if v else None
species={int(r['id']):r for r in rows('pokemon_species') if int(r['id'])<=151}
stats={i:{} for i in species}
for r in rows('pokemon_stats'):
 i=int(r['pokemon_id'])
 if i in stats:stats[i][int(r['stat_id'])]=int(r['base_stat'])
for r in rows('pokemon_stats_past'):
 i=int(r['pokemon_id'])
 if i in stats and r['generation_id']=='1':stats[i][int(r['stat_id'])]=int(r['base_stat'])
types={int(r['id']):r['identifier'] for r in rows('types')}
pt={i:[] for i in species}
for r in rows('pokemon_types'):
 i=int(r['pokemon_id'])
 if i in pt:pt[i].append(types[int(r['type_id'])])
past={}
for r in rows('pokemon_types_past'):
 i=int(r['pokemon_id'])
 if i in pt:past.setdefault(i,[]).append(r)
for i,rs in past.items():
 g=min(int(r['generation_id']) for r in rs)
 pt[i]=[types[int(r['type_id'])] for r in rs if int(r['generation_id'])==g]
learn={i:[] for i in species}
for r in rows('pokemon_moves'):
 i=int(r['pokemon_id'])
 if i in learn and r['version_group_id']=='1' and r['pokemon_move_method_id']=='1':learn[i].append([int(r['level']),int(r['move_id'])])
meta={int(r['move_id']):{k:num(v) for k,v in r.items() if k!='move_id'} for r in rows('move_meta')}
changes={}
for r in rows('move_meta_stat_changes'):changes.setdefault(int(r['move_id']),[]).append([int(r['stat_id']),int(r['change'])])
move={}
for r in rows('moves'):
 i=int(r['id'])
 if int(r['generation_id'])!=1:continue
 move[i]={'name':r['identifier'].replace('-',' ').title(),'type':types[int(r['type_id'])],**{k:num(r[k]) for k in ['power','pp','accuracy','priority','target_id','effect_id','effect_chance']},'meta':meta.get(i,{}),'stages':changes.get(i,[])}
# Changelogs hold the value before the specified version group. Earliest historical change restores Red/Blue.
for i,m in move.items():
 for key in ['type_id','power','pp','accuracy','priority','target_id','effect_id','effect_chance']:
  rs=[r for r in rows('move_changelog') if int(r['move_id'])==i and r[key] and int(r['changed_in_version_group_id'])>1]
  if rs:
   r=min(rs,key=lambda r:int(r['changed_in_version_group_id']))
   if key=='type_id':m['type']=types[int(r[key])]
   else:m[key]=int(r[key])
# Red/Blue pre-type split.
for i in [2,16,28,44]:
 if i in [2,16]:move[i]['type']='normal'
evos={}
for r in rows('pokemon_evolution'):
 i=int(r['evolved_species_id'])
 if i<=151 and species[i]['evolves_from_species_id'] and r['is_default']=='1':
  prev=int(species[i]['evolves_from_species_id'])
  entry={'id':i,'level':num(r['minimum_level']),'trigger':int(r['evolution_trigger_id']),'item':num(r['trigger_item_id'])}
  if entry not in evos.setdefault(prev,[]):evos[prev].append(entry)
base={int(r['id']):int(r['base_experience']) for r in rows('pokemon') if int(r['id'])<=151}
mons={i:{'id':i,'name':r['identifier'].replace('-f','♀').replace('-m','♂').replace('-',' ').title(),'types':pt[i],'base':[stats[i][1],stats[i][2],stats[i][3],stats[i].get(9,stats[i][4]),stats[i][6]],'capture':int(r['capture_rate']),'growth':int(r['growth_rate_id']),'exp':base[i],'learn':sorted(learn[i]),'evolve':evos.get(i,[])} for i,r in species.items()}
(out/'data.json').write_text(json.dumps({'pokemon':mons,'moves':move,'experience':{g:{r['level']:int(r['experience']) for r in rows('experience') if int(r['growth_rate_id'])==g} for g in range(1,7)}},separators=(',',':')))
(out/'sprites').mkdir(exist_ok=True)
def download(x):
 i,back=x;p=out/'sprites'/f'{i}{"b" if back else ""}.png'
 url=f'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/firered-leafgreen/{"back/" if back else ""}{i}.png'
 for attempt in range(3):
  try:
   if not p.exists():urllib.request.urlretrieve(url,p)
   return None
  except Exception as e:
   if attempt==2:return [i,back,str(e)]
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
 errors=[r for r in ex.map(download,[(i,b) for i in range(1,152) for b in [False,True]]) if r]
print(json.dumps({'pokemon':len(mons),'moves':len(move),'sprites':len(list((out/'sprites').glob('*.png'))),'errors':errors}))
