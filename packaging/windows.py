"""Package the production UI with a Windows tray launcher and Node."""
from pathlib import Path
from datetime import datetime
import json, shutil, subprocess, urllib.request, hashlib, zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text(encoding='utf-8-sig'))['version']
out = root / 'releases' / version / 'candidates' / datetime.now().strftime('%Y%m%d-%H%M%S-%f')
name = f'RELOOM-{version}-windows-x64'
desktop = out / name
(desktop / 'runtime').mkdir(parents=True)
node = Path(shutil.which('node'))
shutil.copy2(node, desktop / 'runtime/node.exe')
node_version = subprocess.check_output([str(node), '--version'], text=True).strip()
with urllib.request.urlopen(f'https://raw.githubusercontent.com/nodejs/node/{node_version}/LICENSE') as response:
    (desktop / 'runtime/NODE-LICENSE.txt').write_bytes(response.read())
web = desktop / 'web'
web.mkdir()
for folder in ['dist', 'server', 'src']:
    shutil.copytree(root / folder, web / folder, ignore=shutil.ignore_patterns('Futura-*'))
for file in ['package.json', 'package-lock.json', 'releases.json']:
    shutil.copy2(root / file, web / file)
subprocess.run([shutil.which('npm.cmd'), 'ci', '--omit=dev', '--no-audit', '--no-fund'], cwd=web, check=True, shell=True)
csc = Path('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe')
subprocess.run([str(csc), '/nologo', '/target:winexe', '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll', f'/out:{desktop / "RELOOM.exe"}', str(root / 'packaging/Launcher.cs')], check=True)
(desktop / '使用说明.txt').write_text(f'''RELOOM {version}

完整解压后双击 RELOOM.exe。内置 Node.js {node_version}，无需另行安装。
默认浏览器访问 http://127.0.0.1:4318。托盘右键可打开界面或退出并停止服务。
关闭网页不会停止服务，请勿单独移动 EXE；保留 runtime 和 web。
文档保存在当前浏览器与端口的本地存储中。迁移前先导出备份。
此构建未代码签名。包内不含个人文档或模型密钥。
''', encoding='utf-8-sig')
subprocess.run([str(desktop / 'RELOOM.exe'), '--smoke-test'], cwd=desktop, check=True, timeout=30)
target = out / (name + '.zip')
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for p in desktop.rglob('*'):
        if p.is_file():
            archive.write(p, p.relative_to(out).as_posix())
(out / 'SHA256SUMS.txt').write_text(hashlib.sha256(target.read_bytes()).hexdigest() + '  ' + target.name + '\n')
print('WINDOWS_PACKAGE=' + str(target))
