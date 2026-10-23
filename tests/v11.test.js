import test from "node:test";
import assert from "node:assert/strict";
import { trialRules } from "../src/rules.js";
import { validateKeys, keyCombo, DEFAULT_KEYS } from "../src/shortcuts.js";
import { appendRevision, chapterVersions } from "../src/revisions.js";
import { analyze, insertLinkedParent } from "../src/document.js";
test("trial explains any/all matching and leaves natural language unresolved", () => {
  const rows = trialRules(
    [
      { when: "核实", target: "research", keywords: "最新,来源", match: "all" },
      { when: "核实", target: "research", keywords: "最新,来源", match: "any" },
      { when: "需要核实", target: "research" },
    ],
    "查询最新信息",
  );
  assert.deepEqual(
    rows.map((r) => r.status),
    ["未命中", "命中", "待判定"],
  );
  assert.match(rows[0].reason, /未命中：来源/);
});
test("shortcuts normalize platform modifier and reject duplicate/reserved combos", () => {
  assert.equal(
    keyCombo({ key: "Z", ctrlKey: true, shiftKey: true }),
    "Mod+Shift+z",
  );
  assert.throws(() => validateKeys({ ...DEFAULT_KEYS, redo: "Mod+z" }));
  assert.throws(() => validateKeys({ ...DEFAULT_KEYS, undo: "Mod+w" }));
});
test("chapter history preserves revisions and matches unique sections only", () => {
  const old = { name: "A.md", source: "# A\nold\n", revisions: [] };
  const next = appendRevision(old, { ...old, source: "# A\nnew\n" });
  assert.equal(
    chapterVersions(next, analyze(next.source, "A.md").sections[0])[0].content,
    "old\n",
  );
  assert.equal(appendRevision(next, next).revisions.length, 1);
});
test("input port insertion wraps subtree and connects through new parent", () => {
  const s = "# A\n\n## B\nbody\n\n### C\nchild\n\n## D\ntail";
  const result = insertLinkedParent(s, "A.md", "s1");
  const p = analyze(result.source, "A.md");
  assert.equal(p.sections[1].title, "新的前置步骤");
  assert.equal(p.sections[2].level, 3);
  assert.equal(p.sections[3].level, 4);
  assert.equal(p.edges.find((e) => e.target === "s2").source, "s1");
  assert.ok(result.source.endsWith("## D\ntail"));
});
