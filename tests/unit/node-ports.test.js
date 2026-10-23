import test from 'node:test';import assert from 'node:assert/strict';import {generateTheme} from '../../src/appearance.js';
test('generated themes preserve primary and produce coordinated light backgrounds',()=>{for(const seed of ['#6750a4','#0061a4','#000000','#ffffff']){const a=generateTheme(seed,()=>0),b=generateTheme(seed,()=>.99);assert.equal(a.accent,seed);assert.notEqual(a.background,b.background);assert.match(a.surface,/^#[0-9a-f]{6}$/);assert.notEqual(a.background,a.surface)}});
test('theme generator rejects invalid primary',()=>assert.throws(()=>generateTheme('invalid')));
