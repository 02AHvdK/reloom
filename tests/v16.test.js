import test from 'node:test';
import assert from 'node:assert/strict';
import {editableContent,preserveSectionKind} from '../src/sectionContent.js';
test('type metadata is hidden and preserved against typed replacement',()=>{
 const original='<!-- atlas-kind: 输出 -->\nBody';
 assert.equal(editableContent(original),'Body');
 assert.equal(preserveSectionKind(original,'<!-- atlas-kind: 指令 -->\nNew'),'<!-- atlas-kind: 输出 -->\nNew');
 assert.equal(preserveSectionKind('Body','<!-- atlas-kind: 输出 -->\nNew'),'New');
 assert.equal(preserveSectionKind(original,''),'<!-- atlas-kind: 输出 -->\n');
});
