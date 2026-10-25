import { treePositions } from "./layout.js";
import { parseDocument } from "yaml";

// Textareas normalize Windows line endings. Keep a CRLF document in its
// original convention so a one-line edit does not mark the whole file changed.
export function restoreEditorNewlines(text, original) {
  const crlfOnly = original.includes("\r\n") && !/(^|[^\r])\n/.test(original);
  return crlfOnly ? text.replace(/\r?\n/g, "\r\n") : text;
}

export const formats = [
  {
    name: "Markdown",
    ext: ".md · .mdc · .markdown",
    support: "章节编辑 / 原文回导",
    detail:
      "支持 AGENTS.md、CLAUDE.md、SKILL.md 与普通 Markdown。保留前置元数据、代码围栏和未编辑原文。",
  },
  {
    name: "JSON / YAML",
    ext: ".json · .yaml · .yml",
    support: "字段编辑 / 原格式导出",
    detail: "可视化顶层字段；复杂对象可编辑原始结构。不进行跨平台语义转换。",
  },
  {
    name: "n8n",
    ext: ".json",
    support: "节点与连线 / 原格式导出",
    detail:
      "识别 nodes / connections，保留节点参数、凭据引用和未知字段。需在目标实例验证版本与凭据。",
  },
  {
    name: "Dify DSL",
    ext: ".yml · .yaml",
    support: "节点与连线 / 原格式导出",
    detail:
      "识别 workflow.graph。保留插件依赖和未知字段；目标实例需要对应插件、模型与知识库。",
  },
  {
    name: "Atlas 项目",
    ext: ".atlas.json",
    support: "完整工作区备份",
    detail: "保存原始版本、当前内容、名称与视图位置；不会包含模型密钥。",
  },
];
const clean = (s) => s.replace(/[*`]/g, "").trim();
export function classify(title, content = "") {
  const t = title.toLowerCase();
  if (/流程|方式|步骤|process|workflow/.test(t)) return "流程";
  if (/规则|约束|原则|限制|不要|rule|constraint|重要/.test(t)) return "规则";
  if (/工具|接口|tool|api|mcp/.test(t)) return "工具";
  if (/记忆|背景|context|身份|memory/.test(t)) return "上下文";
  if (/项目|《|project/.test(t)) return "项目";
  return "指令";
}
export function markdownSections(source) {
  const lines = source.match(/[^\n]*\n|[^\n]+$/g) || [];
  let offset = 0,
    fence = null,
    front = false;
  const marks = [];
  lines.forEach((raw, i) => {
    const line = raw.replace(/\r?\n$/, "");
    if (i === 0 && line.replace(/^\uFEFF/, "") === "---") {
      front = true;
      offset += raw.length;
      return;
    }
    if (front) {
      if (/^(---|\.\.\.)\s*$/.test(line)) front = false;
      offset += raw.length;
      return;
    }
    const f = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (f) {
      if (!fence) fence = { c: f[1][0], n: f[1].length };
      else if (f[1][0] === fence.c && f[1].length >= fence.n && !f[2].trim())
        fence = null;
      offset += raw.length;
      return;
    }
    if (!fence) {
      const h = line.match(/^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/);
      const b = line.match(/^\*\*(.+?)\*\*\s*$/);
      if (h || b)
        marks.push({
          start: offset,
          bodyStart: offset + raw.length,
          title: clean(h ? h[2] : b[1]),
          level: h ? h[1].length : /^\d+[.、]/.test(b[1]) ? 2 : 3,
          line: i + 1,
          style: h ? "heading" : "bold",
        });
    }
    offset += raw.length;
  });
  if (!marks.length)
    return [
      {
        id: "s0",
        title: "文档内容",
        kind: "指令",
        level: 1,
        start: 0,
        bodyStart: 0,
        end: source.length,
        content: source,
        line: 1,
        style: "plain",
      },
    ];
  const out = [];
  if (marks[0].start > 0)
    out.push({
      id: "preface",
      title: "前置内容与元数据",
      kind: "上下文",
      level: 0,
      start: 0,
      bodyStart: 0,
      end: marks[0].start,
      content: source.slice(0, marks[0].start),
      line: 1,
      style: "plain",
    });
  marks.forEach((m, i) => {
    const end = marks[i + 1]?.start ?? source.length;
    out.push({
      ...m,
      id: `s${i}`,
      end,
      content: source.slice(m.bodyStart, end),
      kind: sectionKind(source.slice(m.bodyStart, end)) || classify(m.title),
    });
  });
  return out;
}
function parseStructured(source, format) {
  if (format === "json") return { value: JSON.parse(source) };
  const doc = parseDocument(source, { uniqueKeys: true });
  if (doc.errors.length) throw new Error(doc.errors[0].message);
  return { value: doc.toJS({ maxAliasCount: 100 }), yamlDoc: doc };
}
export function analyze(source, name = "AGENTS.md") {
  if (typeof source !== "string") throw new Error("文档必须是文本");
  if (source.length > 4 * 1024 * 1024)
    throw new Error("单个文件上限为 4 MB，请拆分后导入。");
  const ext = name.toLowerCase();
  const format = /\.json$/.test(ext)
    ? "json"
    : /\.ya?ml$/.test(ext)
      ? "yaml"
      : "markdown";
  let sections = [],
    edges = [],
    platform = "Markdown",
    value;
  if (format === "markdown") {
    sections = markdownSections(source);
    const stack = [];
    sections.forEach((s) => {
      while (stack.length && stack.at(-1).level >= s.level) stack.pop();
      if (stack.length)
        edges.push({ source: stack.at(-1).id, target: s.id, label: "包含" });
      stack.push(s);
    });
  } else {
    value = parseStructured(source, format).value;
    if (
      value?.workflow?.graph?.nodes &&
      Array.isArray(value.workflow.graph.nodes)
    ) {
      platform = "Dify";
      sections = value.workflow.graph.nodes.map((n, i) => ({
        id: String(n.id ?? i),
        title: n.data?.title || n.id || `节点 ${i + 1}`,
        kind: n.data?.type || "节点",
        content: JSON.stringify(n.data ?? {}, null, 2),
        path: ["workflow", "graph", "nodes", i, "data"],
        position: n.position,
      }));
      edges = (value.workflow.graph.edges || []).map((e) => ({
        source: String(e.source),
        target: String(e.target),
        label: e.sourceHandle || "",
      }));
    } else if (
      Array.isArray(value?.nodes) &&
      value?.connections &&
      typeof value.connections === "object"
    ) {
      platform = "n8n";
      sections = value.nodes.map((n, i) => ({
        id: String(n.id ?? i),
        title: n.name || `节点 ${i + 1}`,
        kind: n.type?.split(".").at(-1) || "节点",
        content: JSON.stringify(n.parameters ?? {}, null, 2),
        path: ["nodes", i, "parameters"],
        position: n.position
          ? { x: n.position[0], y: n.position[1] }
          : undefined,
      }));
      const byName = new Map(
        value.nodes.map((n, i) => [n.name, sections[i].id]),
      );
      for (const [from, ports] of Object.entries(value.connections))
        for (const [port, groups] of Object.entries(ports))
          for (const group of groups || [])
            for (const target of group || [])
              edges.push({
                source: byName.get(from) || from,
                target: byName.get(target.node) || target.node,
                label: port,
              });
    } else {
      platform = format.toUpperCase();
      const entries =
        value && typeof value === "object"
          ? Object.entries(value)
          : [["value", value]];
      sections = entries.map(([key, v], i) => ({
        id: `f${i}`,
        title: key,
        kind: typeof v === "object" ? "结构" : "字段",
        content: JSON.stringify(v, null, 2) ?? "null",
        path:
          value && typeof value === "object"
            ? [Array.isArray(value) ? Number(key) : key]
            : [],
      }));
    }
  }
  const ids = new Set(sections.map((s) => s.id));
  const issues = [];
  if (ids.size !== sections.length)
    issues.push("存在重复节点 ID，请在原文中修正后再编辑结构。");
  if (edges.some((e) => !ids.has(e.source) || !ids.has(e.target)))
    issues.push("部分连线指向不存在的节点，请检查原文。");
  if (!source.trim()) issues.push("文档为空：添加章节或粘贴内容开始。");
  const seen = new Set();
  sections.forEach((s) => {
    if (seen.has(s.title)) issues.push(`重复标题：${s.title}`);
    seen.add(s.title);
  });
  if (platform === "Dify" || platform === "n8n")
    issues.push(
      "平台回导需要目标实例的插件、凭据和版本兼容；本程序尚未连接目标实例验证。",
    );
  return { format, platform, sections, edges, issues, value };
}
export function editSection(source, name, id, title, content) {
  const parsed = analyze(source, name);
  const s = parsed.sections.find((s) => s.id === id);
  if (!s) throw new Error("章节已变化，请重新选择。");
  if (parsed.format === "markdown") {
    if (/[\r\n]/.test(title) || !title.trim())
      throw new Error("标题不能为空或包含换行。");
    const eol = source.includes("\r\n") ? "\r\n" : "\n";
    let header =
      s.style === "plain"
        ? ""
        : s.style === "bold"
          ? `**${title}**${eol}`
          : `${"#".repeat(s.level)} ${title}${eol}`;
    if (title === s.title) header = source.slice(s.start, s.bodyStart);
    let body = content.replace(/\r?\n/g, eol);
    if (s.end < source.length && !body.endsWith(eol)) body += eol;
    return source.slice(0, s.start) + header + body + source.slice(s.end);
  }
  const replacement = JSON.parse(content);
  const { value, yamlDoc } = parseStructured(source, parsed.format);
  if (yamlDoc) {
    yamlDoc.setIn(s.path, replacement);
    return yamlDoc.toString();
  }
  let next = value;
  if (!s.path.length) next = replacement;
  else {
    let p = next;
    for (const k of s.path.slice(0, -1)) p = p[k];
    p[s.path.at(-1)] = replacement;
  }
  return JSON.stringify(next, null, 2) + "\n";
}
export function makeGraph(parsed, positions = {}) {
  const native = parsed.platform === "Dify" || parsed.platform === "n8n";
  const parent = new Map(parsed.edges.map((e) => [e.target, e.source]));
  const depths = new Map();
  function depth(id, seen = new Set()) {
    if (depths.has(id)) return depths.get(id);
    if (seen.has(id)) return 0;
    seen.add(id);
    const d = parent.has(id) ? Math.min(5, depth(parent.get(id), seen) + 1) : 0;
    depths.set(id, d);
    return d;
  }
  const tree = treePositions(parsed.sections, parsed.edges);
  const rows = new Map();
  const nodes = parsed.sections.map((s, i) => {
    const col = native ? i % 3 : depth(s.id);
    const row = rows.get(col) || 0;
    rows.set(col, row + 1);
    return {
      id: s.id,
      type: "section",
      position:
        positions[s.id] ||
        (native ? s.position || { x: col * 310, y: row * 235 } : tree[s.id]),
      data: {
        ...s,
        preview: s.content
          .replace(/[#*`\n]/g, " ")
          .trim()
          .slice(0, 82),
      },
    };
  });
  return {
    nodes,
    edges: parsed.edges.map((e, i) => ({
      ...e,
      id: `edge${i}`,
      type: "smoothstep",
      style: { stroke: "#9aada3", strokeWidth: 1.5 },
    })),
  };
}
export function exportDocument(
  source,
  name,
  mode = "source",
  original = source,
  positions = {},
) {
  const parsed = analyze(source, name);
  if (mode === "source") return { name, text: source };
  if (mode === "project")
    return {
      name: name.replace(/\.[^.]+$/, "") + ".atlas.json",
      text: JSON.stringify(
        { atlasVersion: 1, name, source, original, positions },
        null,
        2,
      ),
    };
  if (mode === "markdown")
    return {
      name: name.replace(/\.[^.]+$/, "") + ".md",
      text:
        parsed.format === "markdown"
          ? source
          : `# ${name}\n\n> 结构说明文档，不能作为原生工作流回导。\n\n` +
            parsed.sections
              .map((s) => `## ${s.title}\n\n\`\`\`json\n${s.content}\n\`\`\`\n`)
              .join("\n"),
    };
  if (!["json", "yaml"].includes(mode)) throw new Error("不支持的导出格式");
  if (parsed.format === "markdown")
    throw new Error(
      "Markdown 无法直接转换为可执行 JSON/YAML 工作流，请使用 Atlas 项目格式。",
    );
  const text =
    mode === "json"
      ? JSON.stringify(parsed.value, null, 2)
      : (() => {
          const d = parseDocument("");
          d.contents = d.createNode(parsed.value);
          return d.toString();
        })();
  return { name: name.replace(/\.[^.]+$/, "." + mode), text };
}
export function importFile(text, name) {
  if (name.endsWith(".atlas.json")) {
    const p = JSON.parse(text);
    if (
      p.atlasVersion !== 1 ||
      typeof p.source !== "string" ||
      typeof p.name !== "string" ||
      typeof p.original !== "string"
    )
      throw new Error("无效的 Atlas 项目");
    analyze(p.source, p.name);
    return {
      name: p.name,
      source: p.source,
      original: p.original,
      positions: p.positions || {},
    };
  }
  if (!/\.(md|mdc|markdown|txt|json|yaml|yml)$/i.test(name))
    throw new Error("请选择 Markdown、JSON、YAML 或 Atlas 项目文件。");
  analyze(text, name);
  return { name, source: text, original: text, positions: {} };
}
export function addDocumentNode(source, name, parentId = null) {
  const parsed = analyze(source, name);
  if (parsed.format !== "markdown")
    throw new Error("仅 Markdown 支持新增指令节点");
  const parent = parentId
    ? parsed.sections.find((s) => s.id === parentId)
    : null;
  if (parentId && (!parent || parent.style === "plain" || parent.level >= 6))
    throw new Error("该节点不能添加下级标题");
  const level = parent ? parent.level + 1 : 2;
  const later =
    parent &&
    parsed.sections.find(
      (s) => s.start > parent.start && s.level <= parent.level,
    );
  const offset = parent ? (later?.start ?? source.length) : source.length;
  const nl = source.includes("\r\n") ? "\r\n" : "\n";
  const prefix = source.slice(0, offset);
  const padding = prefix.endsWith(nl + nl)
    ? ""
    : prefix.endsWith(nl)
      ? nl
      : nl + nl;
  const headingStart = offset + padding.length;
  const inserted =
    "#".repeat(level) + " 新指令节点" + nl + nl + "在此补充指令。" + nl + nl;
  const next = prefix + padding + inserted + source.slice(offset);
  const sectionId = analyze(next, name).sections.find(
    (s) => s.start === headingStart,
  )?.id;
  return { source: next, sectionId };
}
export const NODE_KINDS = [
  "指令",
  "上下文",
  "环境",
  "功能",
  "输入",
  "输出",
  "规则",
  "流程",
  "工具",
  "条件",
  "分支",
  "记忆",
  "验证",
  "项目",
];
export function sectionKind(content) {
  const kind = content.match(/^\s*<!-- atlas-kind: ([^\r\n]+) -->/)?.[1];
  return NODE_KINDS.includes(kind) ? kind : null;
}
export function setSectionKind(source, name, id, kind) {
  if (!NODE_KINDS.includes(kind)) throw new Error("未知节点类型");
  const parsed = analyze(source, name),
    section = parsed.sections.find((s) => s.id === id);
  if (parsed.format !== "markdown" || !section)
    throw new Error("当前节点不支持修改类型");
  const nl = source.includes("\r\n") ? "\r\n" : "\n";
  const content = section.content.replace(
    /^\s*<!-- atlas-kind: [^\r\n]+ -->\r?\n?/,
    "",
  );
  return editSection(
    source,
    name,
    id,
    section.title,
    `<!-- atlas-kind: ${kind} -->${nl}${content}`,
  );
}
export function addRelatedNode(source, name, id, mode = "child") {
  const parsed = analyze(source, name),
    section = parsed.sections.find((s) => s.id === id);
  if (!section || parsed.format !== "markdown")
    throw new Error("仅 Markdown 章节支持新增节点");
  if (mode === "sibling") {
    if (section.style === "plain") throw new Error("请先选择一个标题章节");
    const offset =
      parsed.sections.find(
        (s) => s.start > section.start && s.level <= section.level,
      )?.start ?? source.length;
    const nl = source.includes("\r\n") ? "\r\n" : "\n",
      prefix = source.slice(0, offset);
    const padding = prefix.endsWith(nl + nl)
      ? ""
      : prefix.endsWith(nl)
        ? nl
        : nl + nl;
    const block =
      "#".repeat(section.level) +
      " 新指令节点" +
      nl +
      nl +
      "在此补充指令。" +
      nl +
      nl;
    const next = prefix + padding + block + source.slice(offset);
    return {
      source: next,
      sectionId: analyze(next, name).sections.find(
        (s) => s.start === offset + padding.length,
      )?.id,
    };
  }
  if (mode !== "branch") return addDocumentNode(source, name, id);
  if (section.style === "plain" || section.level >= 6)
    throw new Error("该章节无法继续添加下级标题");
  const next = parsed.sections.find(
    (s) => s.start > section.start && s.level <= section.level,
  );
  const offset = next?.start ?? source.length,
    nl = source.includes("\r\n") ? "\r\n" : "\n";
  const heading = "#".repeat(section.level + 1),
    prefix = source.slice(0, offset);
  const padding = prefix.endsWith(nl + nl)
    ? ""
    : prefix.endsWith(nl)
      ? nl
      : nl + nl;
  const block = `${heading} IF · 条件成立${nl}${nl}<!-- atlas-kind: 条件 -->${nl}条件：在此描述判断条件。${nl}成立时：在此填写执行步骤。${nl}${nl}${heading} ELSE · 条件不成立${nl}${nl}<!-- atlas-kind: 分支 -->${nl}上述 IF 条件不成立时：在此填写替代步骤。${nl}${nl}`;
  const result = prefix + padding + block + source.slice(offset);
  return {
    source: result,
    sectionId: analyze(result, name).sections.find(
      (s) => s.start === offset + padding.length,
    )?.id,
  };
}
export function insertLinkedParent(source, name, id) {
  const parsed = analyze(source, name),
    s = parsed.sections.find((n) => n.id === id);
  if (parsed.format !== "markdown" || !s || s.style === "plain")
    throw new Error("请选择标题章节");
  const end =
    parsed.sections.find((n) => n.start > s.start && n.level <= s.level)
      ?.start ?? source.length;
  const subtree = parsed.sections.filter(
    (n) => n.start >= s.start && n.start < end,
  );
  if (subtree.some((n) => n.level >= 6))
    throw new Error("插入父节点会超出 Markdown 六级标题，请先调整层级");
  const nl = source.includes("\r\n") ? "\r\n" : "\n";
  let body = source.slice(s.start, end);
  for (const n of [...subtree].reverse())
    body =
      body.slice(0, n.start - s.start) +
      "#".repeat(n.level + 1) +
      " " +
      n.title +
      nl +
      body.slice(n.bodyStart - s.start);
  const header =
    "#".repeat(s.level) +
    " 新的前置步骤" +
    nl +
    nl +
    "在此填写前置要求。" +
    nl +
    nl;
  const next = source.slice(0, s.start) + header + body + source.slice(end);
  return {
    source: next,
    sectionId: analyze(next, name).sections.find((n) => n.start === s.start)
      ?.id,
  };
}
