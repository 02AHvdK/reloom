import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4350',out='artifacts/reviews/0.20.0';
await mkdir(out,{recursive:true});
const source=await readFile('tests/fixtures/example-agent.md','utf8');
const server=spawn(process.execPath,['server/index.js','--no-open'],{env:{...process.env,PORT:'4350'},stdio:'ignore',windowsHide:true});
let browser;const checks=[];
try{
 for(let i=0;i<60;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 assert.equal((await (await fetch(base+'/api/health')).json()).version,'0.20.0');
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(source=>{if(!localStorage.getItem('atlas.workspace.v1'))localStorage.setItem('atlas.workspace.v1',JSON.stringify({id:'qa-example',name:'示例助手.md',source,original:source,positions:{}}));},source);
 await page.goto(base+'/#documents');await page.getByText('已保存到此浏览器',{exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:out+'/overview-light.png'});
 await page.getByRole('button',{name:'指令原文',exact:true}).click();
 const editor=page.getByRole('textbox',{name:'源文件编辑器'});
 await editor.fill(source.replace('保留来源。','保留来源，并标注待核实的信息。'));
 await page.getByRole('button',{name:'应用源文件修改',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('atlas.workspace.v1')).source)).toContain('待核实');checks.push('source edit saved');
 await page.getByRole('button',{name:'修改检阅',exact:true}).click();await expect(page.locator('.diff-view .added')).toContainText('待核实');checks.push('diff reflects edit');
 await page.getByRole('button',{name:'撤销',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('atlas.workspace.v1')).source)).toBe(source);
 await page.getByRole('button',{name:'重做',exact:true}).click();checks.push('undo / redo');
 await page.getByRole('button',{name:'导出',exact:true}).click();
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'下载文件',exact:true}).click();
 const download=await downloadEvent;const exported=await readFile(await download.path(),'utf8');assert.ok(exported.includes('待核实'));assert.ok(exported.includes('\r\n'));checks.push('export content + Windows newlines');
 if(await page.getByRole('dialog').count())await page.getByRole('button',{name:'取消',exact:true}).click();
 await page.getByRole('button',{name:'文档工作流',exact:true}).click();await page.locator('.react-flow__node').first().waitFor();await page.waitForTimeout(600);
 const canvas=await page.locator('.canvas').boundingBox();
 const boxes=await page.locator('.react-flow__node').evaluateAll(ns=>ns.map(n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom};}));
 assert.ok(boxes.every(b=>b.x>=canvas.x-2&&b.y>=canvas.y-2&&b.right<=canvas.x+canvas.width+2&&b.bottom<=canvas.y+canvas.height+2),'initial nodes fit canvas');checks.push('initial graph fits');
 await page.getByRole('button',{name:'聚焦当前章节',exact:true}).click();
 await page.getByRole('combobox',{name:'更换节点类型：示例助手',exact:true}).click();await page.getByRole('option',{name:'规则',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('atlas.workspace.v1')).source)).toContain('atlas-kind: 规则');
 await page.getByRole('button',{name:'编辑节点文字：示例助手',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'节点正文',exact:true})).not.toHaveValue(/atlas-kind/);
 await page.getByRole('textbox',{name:'节点正文',exact:true}).fill('用于测试的虚构指令。已确认节点编辑。');
 await page.getByRole('button',{name:'保存到原文',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('atlas.workspace.v1')).source)).toContain('atlas-kind: 规则');checks.push('node type + inline editing preserve metadata');
 await page.screenshot({path:out+'/workflow-light.png'});
 await page.getByRole('button',{name:'纵向树',exact:true}).click();
 await page.getByRole('button',{name:'全屏编辑',exact:true}).click();await page.getByRole('toolbar',{name:'全屏工具栏'}).waitFor();await page.keyboard.press('Escape');await expect(page.getByRole('toolbar',{name:'全屏工具栏'})).toHaveCount(0);checks.push('layout + fullscreen + Escape');
 await page.getByRole('button',{name:'主题与颜色',exact:true}).click();await page.getByRole('button',{name:'深色',exact:true}).click();await page.getByRole('button',{name:'保存主题',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-color-mode','dark');
 await page.getByRole('button',{name:'文档总览',exact:true}).click();await page.screenshot({path:out+'/overview-dark.png'});checks.push('dark theme persists');
 for(const width of [390,768,1280]){
  await page.setViewportSize({width,height:900});await page.waitForTimeout(250);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow '+width);
  await page.screenshot({path:out+`/overview-${width}.png`});checks.push('viewport '+width);
 }
 assert.deepEqual(errors,[]);checks.push('no browser errors');
 await writeFile(out+'/checks.json',JSON.stringify(checks,null,2));console.log(checks);
}finally{await browser?.close();server.kill();}





