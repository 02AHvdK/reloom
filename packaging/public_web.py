"""Build a public Web ZIP from tracked source and the current Vite build."""
from pathlib import Path
import hashlib
import json
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
output = root / 'releases' / version
output.mkdir(parents=True, exist_ok=True)
name = f'RELOOM-{version}-web-ui'
target = output / f'{name}.zip'
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
files = [root / p for p in tracked if p and not p.startswith(('.github/', 'tests/'))]
files += [p for p in (root / 'dist').rglob('*') if p.is_file() and not p.name.startswith('Futura-')]
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, f'{name}/{path.relative_to(root).as_posix()}')
(output / 'SHA256SUMS.txt').write_text(hashlib.sha256(target.read_bytes()).hexdigest() + '  ' + target.name + '\n')
print(target)
