from pathlib import Path
import sys,zipfile
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1] if len(sys.argv)>1 else root.parent/'Kanto-Journey-GitHub-Ready.zip').resolve()
roots=['dist','src','scripts','tests','docs','audit','.github']
files=[root/n for n in ['README.md','PROJECT_NOTES.md','package.json','.gitignore']]
for name in roots:
 for p in (root/name).rglob('*'):
  rel=p.relative_to(root)
  if not p.is_file() or any(part in ['__pycache__','node_modules','art','qa','.git','.openai'] for part in rel.parts) or p.suffix=='.csv':continue
  files.append(p)
out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(set(files)):z.write(p,'kanto-journey/'+p.relative_to(root).as_posix())
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 assert not any('/.git/' in n or '/.openai/' in n or '/dist/qa/' in n for n in z.namelist())
 assert len([n for n in z.namelist() if '/assets/sprites/' in n and n.endswith('.png')])==302
 for n in z.namelist():
  if n.endswith(('.mjs','.py','.md','.json','.yml','.html')):
   b=z.read(n)
   assert (b'art_'+b'v2_') not in b and (b'siwc_'+b'bypass_bearer_token') not in b,n
 print('PASS GitHub handoff archive:',len(z.namelist()),'files;',out.stat().st_size,'bytes; all 302 sprites; no host identity, Git history, temporary QA loader or credential strings.')
