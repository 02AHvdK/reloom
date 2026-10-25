import test from 'node:test';
import assert from 'node:assert/strict';
import { diffLines } from 'diff';
import { restoreEditorNewlines } from '../../src/document.js';

test('editing one Windows line keeps all other lines unchanged in the diff', () => {
  const original = '# Agent\r\n\r\nKeep sources.\r\n';
  const edited = restoreEditorNewlines('# Agent\n\nKeep sources and dates.\n', original);
  const parts = diffLines(original, edited);
  assert.equal(parts[0].value, '# Agent\r\n\r\n');
  assert.equal(parts[0].added, false);
  assert.equal(parts[0].removed, false);
  assert.equal(edited.endsWith('\r\n'), true);
});
test('LF files and text without a newline are not converted', () => {
  assert.equal(restoreEditorNewlines('one\ntwo\n', 'one\n'), 'one\ntwo\n');
  assert.equal(restoreEditorNewlines('one', 'one\r\n'), 'one');
});
