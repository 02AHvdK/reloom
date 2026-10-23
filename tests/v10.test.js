import test from "node:test";
import assert from "node:assert/strict";
import { analyze, addRelatedNode, setSectionKind } from "../src/document.js";
const source =
  "# Agent\r\n\r\n## 执行\r\n原内容。\r\n\r\n## 后续\r\n保留。\r\n";
test("IF ELSE adds two sibling branches inside source parent and preserves tail", () => {
  const next = addRelatedNode(source, "AGENTS.md", "s1", "branch");
  const p = analyze(next.source, "AGENTS.md");
  assert.equal(p.sections.length, 5);
  assert.equal(p.sections[2].kind, "条件");
  assert.equal(p.sections[3].kind, "分支");
  assert.ok(next.source.endsWith("## 后续\r\n保留。\r\n"));
  assert.equal(p.edges.find((e) => e.target === p.sections[2].id).source, "s1");
  assert.equal(p.edges.find((e) => e.target === p.sections[3].id).source, "s1");
});
test("editable kind roundtrips and invalid kinds rejected", () => {
  const next = setSectionKind(source, "AGENTS.md", "s1", "环境");
  assert.equal(analyze(next, "AGENTS.md").sections[1].kind, "环境");
  const changed = setSectionKind(next, "AGENTS.md", "s1", "功能");
  assert.equal(analyze(changed, "AGENTS.md").sections[1].kind, "功能");
  assert.equal((changed.match(/atlas-kind/g) || []).length, 1);
  assert.ok(changed.includes("原内容。"));
  assert.throws(() => setSectionKind(source, "AGENTS.md", "s1", "invalid"));
});
test("sibling insertion keeps original heading depth", () => {
  const next = addRelatedNode(source, "AGENTS.md", "s0", "sibling");
  const p = analyze(next.source, "AGENTS.md");
  assert.equal(p.sections.at(-1).level, 1);
  assert.ok(next.source.startsWith(source));
});
