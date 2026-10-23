import test from 'node:test';
import assert from 'node:assert/strict';
import {checkUpdates, compareVersions} from '../server/updates.js';
const release = (tag_name, prerelease=false) => ({tag_name, prerelease, draft:false});
const api = data => async (url, options) => {
  assert.equal(new URL(url).hostname, 'api.github.com');
  assert.equal(options.redirect, 'error');
  assert.ok(options.signal);
  return {ok:true,json:async()=>data};
};
test('semantic version ordering handles numeric versions and prereleases',()=>{
  assert.equal(compareVersions('v0.19.0','0.18.0'),1);
  assert.equal(compareVersions('0.18.0','0.18.0'),0);
  assert.equal(compareVersions('1.0.0-demo.10','1.0.0-demo.2'),1);
  assert.equal(compareVersions('1.0.0','1.0.0-demo'),1);
});
test('stable channel ignores drafts and prereleases and sorts versions',async()=>{
  const result=await checkUpdates('0.18.0',api([release('0.19.0'),release('0.20.0-beta',true),{...release('1.0.0'),draft:true},release('0.9.0')]));
  assert.equal(result.status,'available');assert.equal(result.latestVersion,'0.19.0');
  assert.equal(result.releaseUrl,'https://github.com/02AHvdK/reloom/releases/tag/0.19.0');
});
test('demo channel includes prereleases; missing release is not up to date',async()=>{
  assert.equal((await checkUpdates('0.16.0-demo',api([release('0.17.0-demo',true)]))).status,'available');
  assert.equal((await checkUpdates('0.18.0',api([]))).status,'unpublished');
  assert.equal((await checkUpdates('0.18.0',api([release('v0.18.0')]))).status,'current');
});
test('network and rate-limit failures never claim newest version',async()=>{
  await assert.rejects(checkUpdates('0.18.0',async()=>({ok:false,status:403})),/请求受限/);
  await assert.rejects(checkUpdates('0.18.0',async()=>{throw Error('offline')}),/offline/);
  await assert.rejects(checkUpdates('0.18.0',api({})),/无效数据/);
});
