import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  analyze,
  editSection,
  exportDocument,
  importFile,
  markdownSections,
} from "../../src/document.js";
import { parse } from "yaml";
test("Markdown preserves front matter, fenced headings and unrelated bytes", () => {
  const s =
    "---\r\nname: demo\r\n---\r\n# Agent\r\n\r\n## Rules\r\nold\r\n```md\r\n# not a heading\r\n```\r\n\r\n## Tools\r\nuntouched  \r\n";
  const p = analyze(s, "SKILL.md");
  assert.equal(p.sections.length, 4);
  const rules = p.sections.find((s) => s.title === "Rules");
  const out = editSection(
    s,
    "SKILL.md",
    rules.id,
    "Rules",
    rules.content.replace("old", "new"),
  );
  assert.equal(out, s.replace("old", "new"));
  assert.equal(exportDocument(out, "SKILL.md").text, out);
});
test("tilde fences and long fences ignore heading-like content", () => {
  const s =
    "# Root\n````md\n```\n## Hidden\n````\n~~~\n## Also hidden\n~~~\n## Visible\n";
  assert.deepEqual(
    markdownSections(s).map((s) => s.title),
    ["Root", "Visible"],
  );
});
test("synthetic agent fixture imports and survives an untouched round trip", () => {
  const s = readFileSync(
    new URL("../fixtures/example-agent.md", import.meta.url),
    "utf8",
  );
  const p = analyze(s, "AGENTS.md");
  assert.ok(p.sections.length >= 13);
  assert.ok(p.sections.some((s) => s.title.includes("检查结果")));
  assert.equal(exportDocument(s, "AGENTS.md").text, s);
});
test("n8n preserves credentials, unknown fields and branches when editing parameters", () => {
  const object = {
    name: "demo",
    custom: { retain: true },
    nodes: [
      {
        id: "a",
        name: "Start",
        type: "test",
        parameters: { prompt: "old" },
        credentials: { secret: { id: "reference" } },
        position: [0, 0],
      },
      { id: "b", name: "End", parameters: {} },
    ],
    connections: {
      Start: { main: [[{ node: "End", type: "main", index: 0 }]] },
    },
  };
  const s = JSON.stringify(object);
  const p = analyze(s, "flow.json");
  assert.equal(p.platform, "n8n");
  assert.equal(p.edges[0].target, "b");
  const next = JSON.parse(
    editSection(s, "flow.json", "a", "Start", '{"prompt":"new"}'),
  );
  assert.deepEqual(next.custom, object.custom);
  assert.deepEqual(next.nodes[0].credentials, object.nodes[0].credentials);
  assert.deepEqual(next.connections, object.connections);
  assert.equal(next.nodes[0].parameters.prompt, "new");
});
test("Dify YAML editing retains comments and unrecognized root fields", () => {
  const s =
    "# keep comment\nversion: 0.3.0\napp:\n  name: demo\nunknown: keep\nworkflow:\n  graph:\n    nodes:\n      - id: a\n        data:\n          title: Agent\n          type: llm\n    edges: []\n";
  assert.equal(analyze(s, "dify.yml").platform, "Dify");
  const edited = editSection(
    s,
    "dify.yml",
    "a",
    "Agent",
    '{"title":"Updated","type":"llm"}',
  );
  assert.ok(edited.includes("# keep comment"));
  assert.equal(parse(edited).unknown, "keep");
  assert.equal(parse(edited).workflow.graph.nodes[0].data.title, "Updated");
});
test("invalid input is rejected and Markdown cannot pretend to be workflow JSON", () => {
  assert.throws(() => analyze("{bad", "x.json"));
  assert.throws(() => analyze("a: [", "x.yml"));
  assert.throws(() => exportDocument("# hi", "x.md", "json"));
  assert.throws(() => importFile("{}", "x.atlas.json"));
  assert.throws(() => importFile("x", "x.exe"));
});
test("project keeps original and edited document, never credentials config", () => {
  const exp = exportDocument("# next", "CLAUDE.md", "project", "# original", {
    s0: { x: 1, y: 2 },
  });
  const back = importFile(exp.text, exp.name);
  assert.equal(back.source, "# next");
  assert.equal(back.original, "# original");
  assert.deepEqual(back.positions, { s0: { x: 1, y: 2 } });
  assert.ok(!exp.text.includes("apiKey"));
});
test("scalar JSON and YAML can be edited safely", () => {
  assert.equal(
    JSON.parse(editSection("12", "scalar.json", "f0", "value", "13")),
    13,
  );
  assert.equal(parse(editSection("12", "scalar.yml", "f0", "value", "13")), 13);
});
test("empty and metadata-only Markdown preserved", () => {
  for (const s of ["", "---\nname: a\n---\n"])
    assert.equal(exportDocument(s, "SKILL.md").text, s);
});
