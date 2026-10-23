import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const port=4336, base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['server/index.js','--no-open'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
let browser;
try {
  let ready=false;
  for(let i=0;i<50;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,200));}
  assert.ok(ready,'server ready');
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'更新与反馈',exact:true}).first().click();
  await page.route('**/api/updates',route=>route.fulfill({json:{status:'available',latestVersion:'v0.19.0',releaseUrl:'https://github.com/02AHvdK/reloom/releases/tag/v0.19.0'}}));
  await page.getByRole('button',{name:'检查更新',exact:true}).click();
  await page.getByText('发现新版本 v0.19.0').waitFor();
  const feedback=await page.getByRole('link',{name:'建议反馈 / 报告问题'}).getAttribute('href');
  assert.equal(new URL(feedback).searchParams.get('version'),'0.18.0');
  assert.equal(new URL(feedback).searchParams.get('template'),'feedback.yml');
  await mkdir('artifacts/reviews/support',{recursive:true});
  await page.waitForTimeout(500);
  await page.screenshot({path:'artifacts/reviews/support/update-dialog.png'});
  await page.route('**/api/updates',route=>route.fulfill({status:502,json:{error:'offline'}}));
  await page.getByRole('button',{name:'检查更新',exact:true}).click();
  await page.getByText(/未能检查更新/).waitFor();
  assert.equal(await page.getByText('当前已是最新版本。').count(),0);
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.locator('.topbar').getByRole('button',{name:'更新与反馈'}).click();
  await page.getByRole('dialog').waitFor();
  assert.deepEqual(errors,[]);
  console.log('Support UI passed: update, failure, feedback URL, mobile, no page errors.');
} finally {await browser?.close();server.kill();}
