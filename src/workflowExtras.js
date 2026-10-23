import { markdownSections, editSection } from "./document.js";

export function makeSource(name, source) {
  if (!/\.md$/i.test(name)) throw Error("请选择 Markdown 文件");
  if (source.length > 4 * 1024 * 1024) throw Error("文档超过 4 MB");
  return { id: crypto.randomUUID(), name, original: source, source };
}
export function sourceBlocks(doc) {
  return markdownSections(doc.source);
}
export function editSourceBlock(doc, id, title, content) {
  const before = sourceBlocks(doc);
  const source = editSection(doc.source, doc.name, id, title, content);
  const after = markdownSections(source);
  if (
    before.length !== after.length ||
    before.some((s, i) => s.id !== after[i]?.id || s.style !== after[i]?.style)
  )
    throw Error(
      "此处只能编辑当前内容块，请勿在正文新增章节标题，以免改变现有引用。",
    );
  return { ...doc, source };
}
export function referenceContent(flow, ref) {
  const doc = (flow.documents || []).find((d) => d.id === ref.documentId);
  const block = doc && sourceBlocks(doc).find((b) => b.id === ref.sectionId);
  if (!block) throw Error("引用的文档内容块不存在，请重新关联");
  return {
    name: doc.name,
    title: block.title,
    text: doc.source.slice(block.start, block.end),
    line: block.line,
  };
}
export function attachReference(flow, nodeId, ref) {
  referenceContent(flow, ref);
  const node = flow.nodes.find((n) => n.id === nodeId);
  if (!node || !["template", "ai"].includes(node.data.kind))
    throw Error("请先选择文本模板或 AI 分析节点");
  const refs = node.data.config.references || [];
  if (
    refs.some(
      (r) => r.documentId === ref.documentId && r.sectionId === ref.sectionId,
    )
  )
    return flow;
  return {
    ...flow,
    nodes: flow.nodes.map((n) =>
      n.id !== nodeId
        ? n
        : {
            ...n,
            data: {
              ...n.data,
              config: { ...n.data.config, references: [...refs, ref] },
            },
          },
    ),
  };
}
export const fieldLabel = (key) =>
  ({ brief: "设计需求", ready: "需求信息完整", score: "得分" })[key] || key;
export function variableOptions(flow, nodeId) {
  const items = [];
  function flatten(obj, path, depth = 0) {
    if (depth > 5) return;
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v !== null && typeof v === "object" && !Array.isArray(v))
        flatten(v, `${path}.${k}`, depth + 1);
      else
        items.push({
          path: `${path}.${k}`,
          label: `输入 · ${fieldLabel(k)}`,
          value: v,
        });
    });
  }
  flatten(flow.input, "input");
  const ancestors = new Set();
  const visit = (id) =>
    flow.edges
      .filter((e) => e.target === id)
      .forEach((e) => {
        if (!ancestors.has(e.source)) {
          ancestors.add(e.source);
          visit(e.source);
        }
      });
  visit(nodeId);
  flow.nodes
    .filter((n) => ancestors.has(n.id))
    .forEach((n) => {
      items.push({
        path: `nodes.${n.id}.output`,
        label: `${n.data.title} · 输出`,
        value: undefined,
      });
      if (n.data.kind === "set")
        items.push({
          path: `vars.${n.data.config.key}`,
          label: `${n.data.title} · ${n.data.config.key}`,
          value:
            n.data.config.valueType === "template" ? "" : n.data.config.value,
        });
    });
  return items;
}
export function autoLayout(flow) {
  const incoming = new Map(flow.nodes.map((n) => [n.id, 0]));
  flow.edges.forEach((e) => {
    if (incoming.has(e.target))
      incoming.set(e.target, incoming.get(e.target) + 1);
  });
  const queue = flow.nodes
      .filter((n) => incoming.get(n.id) === 0)
      .map((n) => n.id),
    rank = new Map(queue.map((id) => [id, 0]));
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    flow.edges
      .filter((e) => e.source === id)
      .forEach((e) => {
        rank.set(
          e.target,
          Math.max(rank.get(e.target) || 0, (rank.get(id) || 0) + 1),
        );
        incoming.set(e.target, incoming.get(e.target) - 1);
        if (incoming.get(e.target) === 0) queue.push(e.target);
      });
  }
  if (queue.length !== flow.nodes.length)
    throw Error("请先移除循环连线再整理布局");
  const lanes = new Map();
  flow.nodes.forEach((n) => {
    const r = rank.get(n.id) || 0;
    if (!lanes.has(r)) lanes.set(r, []);
    lanes.get(r).push(n);
  });
  const max = Math.max(1, ...[...lanes.values()].map((a) => a.length));
  return {
    ...flow,
    nodes: flow.nodes.map((n) => {
      const row = lanes.get(rank.get(n.id) || 0);
      return {
        ...n,
        position: {
          x: (rank.get(n.id) || 0) * 330 + 30,
          y: 30 + (max - row.length) * 140 + row.indexOf(n) * 280,
        },
      };
    }),
  };
}
