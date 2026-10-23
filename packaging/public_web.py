"""Build a public Web ZIP from explicit inputs without changing published ZIPs."""
from pathlib import Path
from datetime import datetime
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
output = root / 'releases' / version / 'candidates' / datetime.now().strftime('%Y%m%d-%H%M%S-%f')
output.mkdir(parents=True, exist_ok=True)
name = f'RELOOM-{version}-web-ui'
target = output / f'{name}.zip'
if not (root / 'dist/index.html').is_file():
    raise SystemExit('Run npm run build before packaging.')
# Explicit inputs keep local archives and working documents out of public ZIPs.
files = [root / p for p in ['README.md', 'package.json', 'package-lock.json',
         'vite.config.js', 'index.html', 'start.cmd', 'releases.json']]
for folder in ['src', 'server', 'public', 'dist', 'docs', 'tests', 'packaging']:
    files += [p for p in (root / folder).rglob('*') if p.is_file()
              and not p.name.startswith('Futura-') and p.suffix not in ['.pyc']
              and '__pycache__' not in p.parts and p.name != 'designer-context.md']
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, f'{name}/{path.relative_to(root).as_posix()}')
(output / 'SHA256SUMS.txt').write_text(hashlib.sha256(target.read_bytes()).hexdigest() + '  ' + target.name + '\n')
print(target)
