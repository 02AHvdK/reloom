import path from 'node:path';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
export function availableApps(env=process.env,exists=existsSync){
 const windows=env.WINDIR||'C:/Windows',program=env.ProgramFiles||'C:/Program Files',local=env.LOCALAPPDATA||'';
 return [
 ['notepad','记事本',path.join(windows,'System32','notepad.exe')],
 ['calculator','计算器',path.join(windows,'System32','calc.exe')],
 ['paint','画图',path.join(windows,'System32','mspaint.exe')],
 ['chrome','Chrome',path.join(program,'Google','Chrome','Application','chrome.exe')],
 ['vscode','Visual Studio Code',local?path.join(local,'Programs','Microsoft VS Code','Code.exe'):''],
 ].filter(([, ,file])=>file&&exists(file)).map(([id,name,executable])=>({id,name,executable}));
}
export function launchApp(id,apps=availableApps(),start=spawn){
 const app=apps.find(a=>a.id===id);if(!app)throw Error('未找到已登记的软件，请刷新软件列表。');
 return new Promise((resolve,reject)=>{const child=start(app.executable,[],{shell:false,detached:true,windowsHide:false,stdio:'ignore'});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve({ok:true,name:app.name,message:'已提交启动请求'})})});
}
