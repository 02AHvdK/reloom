import { parseDocument, stringify } from "yaml";
import { makeSource, referenceContent, autoLayout } from "./workflowExtras.js";

export const NODE_CATALOG = [
  {
    kind: "start",
    title: "开始",
    group: "基础",
    description: "定义工作流的输入数据",
    tone: "green",
  },
  {
    kind: "template",
    title: "文本模板",
    group: "处理",
    description: "组合指令与变量，生成文本",
    tone: "blue",
  },
  {
    kind: "condition",
    title: "条件分支",
    group: "逻辑",
    description: "根据条件执行 IF / ELSE",
    tone: "amber",
  },
  {
    kind: "set",
    title: "变量赋值",
    group: "逻辑",
    description: "存储文本、数值或布尔值",
    tone: "violet",
  },
  {
    kind: "ai",
    title: "AI 分析",
    group: "处理",
    description: "调用配置的模型分析内容",
    tone: "teal",
  },
  {
    kind: "output",
    title: "输出",
    group: "基础",
    description: "返回最终结果并结束运行",
    tone: "slate",
  },
];
export const OPERATORS = [
  ["equals", "等于"],
  ["notEquals", "不等于"],
  ["contains", "包含"],
  ["greater", "大于"],
  ["greaterEqual", "大于等于"],
  ["less", "小于"],
  ["lessEqual", "小于等于"],
  ["exists", "存在且非空"],
  ["isTrue", "为 true"],
];
export function uid(prefix = "node") {
  return `${prefix}_${globalThis.crypto.randomUUID().slice(0, 8)}`;
}
export function createNode(kind, position = { x: 80, y: 80 }) {
  const meta = NODE_CATALOG.find((n) => n.kind === kind);
  if (!meta) throw Error("未知的节点类型");
  const config = {
    start: {},
    template: { template: "{{input.brief}}" },
    condition: { path: "input.ready", operator: "equals", value: true },
    set: { key: "result", value: "{{input.brief}}", valueType: "template" },
    ai: { template: "{{last}}" },
    output: { template: "{{last}}" },
  }[kind];
  return {
    id: uid(),
    type: "workflow",
    position,
    data: { kind, title: meta.title, config },
  };
}
export function demoWorkflow() {
  const create = (id, kind, title, x, y, config) => ({
    id,
    type: "workflow",
    position: { x, y },
    data: { kind, title, config },
  });
  return {
    atlasWorkflow: 1,
    name: "设计协作 · 需求分流",
    input: {
      brief: "为一个虚构展览整理清晰的导览信息。",
      ready: true,
    },
    nodes: [
      create("start", "start", "接收设计需求", 20, 20, {}),
      create("check", "condition", "需求是否明确？", 20, 240, {
        path: "input.ready",
        operator: "equals",
        value: true,
      }),
      create("design", "template", "建立设计路径", 310, 120, {
        template:
          "设计任务：{{input.brief}}\n\n按以下顺序推进：\n概念 → 核心矛盾 → 具体事物 → 视觉机制 → 载体 → 最终呈现。\n\n检查：这个形式是否只有这个概念才能成立？",
      }),
      create("clarify", "template", "补充任务信息", 310, 400, {
        template:
          "请先明确设计的对象、受众与最终载体。\n当前需求：{{input.brief}}",
      }),
      create("result", "output", "交付结果", 600, 240, {
        template: "{{last}}",
      }),
    ],
    edges: [
      { id: "e1", source: "start", target: "check", sourceHandle: "out" },
      { id: "e2", source: "check", target: "design", sourceHandle: "true" },
      { id: "e3", source: "check", target: "clarify", sourceHandle: "false" },
      { id: "e4", source: "design", target: "result", sourceHandle: "out" },
      { id: "e5", source: "clarify", target: "result", sourceHandle: "out" },
    ],
  };
}
export function blankWorkflow() {
  const n = createNode("start", { x: 60, y: 180 });
  return {
    atlasWorkflow: 1,
    name: "未命名工作流",
    input: { brief: "", ready: true },
    nodes: [n],
    edges: [],
  };
}
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
export function resolvePath(state, path) {
  const parts = String(path).trim().split(".");
  let value = state;
  for (const part of parts) {
    if (forbidden.has(part) || !part) throw Error(`不允许的变量路径：${path}`);
    if (
      value === null ||
      typeof value !== "object" ||
      !Object.hasOwn(value, part)
    )
      return undefined;
    value = value[part];
  }
  return value;
}
export function renderTemplate(text, state) {
  return String(text ?? "").replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, path) => {
    const value = resolvePath(state, path);
    if (value === undefined) throw Error(`变量不存在：${path.trim()}`);
    return typeof value === "string" ? value : JSON.stringify(value);
  });
}
export function evaluateCondition(config, state) {
  if (!OPERATORS.some(([id]) => id === config.operator))
    throw Error("未知的条件运算符");
  const actual = resolvePath(state, config.path);
  const expected = config.value;
  if (config.operator === "exists")
    return actual !== undefined && actual !== null && actual !== "";
  if (actual === undefined) throw Error(`条件变量不存在：${config.path}`);
  switch (config.operator) {
    case "equals":
      return actual === expected;
    case "notEquals":
      return actual !== expected;
    case "isTrue":
      return actual === true;
    case "contains":
      if (typeof actual !== "string" && !Array.isArray(actual))
        throw Error("包含运算需要文本或数组");
      if (typeof actual === "string" && typeof expected !== "string")
        throw Error("文本包含运算需要文本比较值");
      return actual.includes(expected);
    default:
      if (
        typeof actual !== "number" ||
        typeof expected !== "number" ||
        !Number.isFinite(actual) ||
        !Number.isFinite(expected)
      )
        throw Error("大小比较需要两个有效数值");
      return {
        greater: () => actual > expected,
        greaterEqual: () => actual >= expected,
        less: () => actual < expected,
        lessEqual: () => actual <= expected,
      }[config.operator]();
  }
}
function validateCases(cases) {
  if (
    !Array.isArray(cases) ||
    cases.length > 20 ||
    cases.some(
      (c) =>
        !c ||
        typeof c.name !== "string" ||
        !c.input ||
        typeof c.input !== "object" ||
        Array.isArray(c.input),
    )
  )
    throw Error("测试样例格式无效（最多20组）");
  return structuredClone(cases);
}
export function normalizeWorkflow(value) {
  if (
    !value ||
    value.atlasWorkflow !== 1 ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges) ||
    typeof value.name !== "string"
  )
    throw Error(
      "不是有效的 Atlas 工作流文件。外部工作流请使用指令文档入口查看。",
    );
  if (value.nodes.length > 300 || value.edges.length > 600)
    throw Error("当前版本最多支持 300 个节点与 600 条连线。");
  if (
    !value.input ||
    typeof value.input !== "object" ||
    Array.isArray(value.input)
  )
    throw Error("输入必须是 JSON 对象");
  const documents = value.documents === undefined ? undefined : value.documents;
  if (documents && (!Array.isArray(documents) || documents.length > 40))
    throw Error("关联文档格式无效或超过40份");
  const docIds = new Set();
  for (const d of documents || []) {
    if (
      !d ||
      typeof d.id !== "string" ||
      docIds.has(d.id) ||
      typeof d.name !== "string" ||
      typeof d.source !== "string" ||
      typeof d.original !== "string" ||
      d.source.length > 4 * 1024 * 1024
    )
      throw Error("关联文档无效");
    docIds.add(d.id);
  }
  const ids = new Set();
  const nodes = value.nodes.map((n) => {
    if (
      !n ||
      typeof n.id !== "string" ||
      !n.id ||
      ids.has(n.id) ||
      forbidden.has(n.id)
    )
      throw Error("节点 ID 缺失、重复或无效");
    ids.add(n.id);
    if (
      !NODE_CATALOG.some((t) => t.kind === n.data?.kind) ||
      typeof n.data?.title !== "string" ||
      !n.data.config ||
      typeof n.data.config !== "object" ||
      Array.isArray(n.data.config)
    )
      throw Error(`节点 ${n.id} 配置无效`);
    if (!Number.isFinite(n.position?.x) || !Number.isFinite(n.position?.y))
      throw Error(`节点 ${n.id} 坐标无效`);
    const { kind, config } = n.data;
    if (config.sourceDocumentId && !docIds.has(config.sourceDocumentId))
      throw Error("引用的原文档不存在");
    if (config.references !== undefined) {
      if (!Array.isArray(config.references)) throw Error("文档引用格式无效");
      for (const ref of config.references)
        referenceContent({ documents: documents || [] }, ref);
    }
    if (
      ["template", "ai", "output"].includes(kind) &&
      typeof config.template !== "string"
    )
      throw Error(`节点 ${n.id} 的模板必须是文本`);
    if (
      kind === "condition" &&
      (typeof config.path !== "string" ||
        !OPERATORS.some(([op]) => op === config.operator) ||
        (!["exists", "isTrue"].includes(config.operator) &&
          !["boolean", "string", "number"].includes(typeof config.value)))
    )
      throw Error(`节点 ${n.id} 的判断规则格式无效`);
    if (
      kind === "set" &&
      (typeof config.key !== "string" ||
        !["template", "number", "boolean"].includes(config.valueType) ||
        (config.valueType === "template" && typeof config.value !== "string") ||
        (config.valueType === "boolean" && typeof config.value !== "boolean") ||
        (config.valueType === "number" && !Number.isFinite(config.value)))
    )
      throw Error(`节点 ${n.id} 的赋值类型与内容不一致`);
    if (typeof config.value === "number" && !Number.isFinite(config.value))
      throw Error("比较值必须是有限数值");
    return {
      id: n.id,
      type: "workflow",
      position: { x: n.position.x, y: n.position.y },
      data: {
        kind: n.data.kind,
        title: n.data.title,
        config: structuredClone(n.data.config),
      },
    };
  });
  const edgeIds = new Set();
  const edges = value.edges.map((e) => {
    if (
      !e ||
      typeof e.id !== "string" ||
      edgeIds.has(e.id) ||
      typeof e.source !== "string" ||
      typeof e.target !== "string"
    )
      throw Error("连线格式无效或 ID 重复");
    edgeIds.add(e.id);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || "out",
    };
  });
  return {
    atlasWorkflow: 1,
    name: value.name,
    input: structuredClone(value.input),
    ...(documents ? { documents: structuredClone(documents) } : {}),
    ...(value.testCases ? { testCases: validateCases(value.testCases) } : {}),
    nodes,
    edges,
  };
}
export function validateWorkflow(flow) {
  const errors = [],
    warnings = [];
  let f;
  try {
    f = normalizeWorkflow(flow);
  } catch (e) {
    return { errors: [e.message], warnings };
  }
  const byId = new Map(f.nodes.map((n) => [n.id, n]));
  const starts = f.nodes.filter((n) => n.data.kind === "start");
  if (starts.length !== 1) errors.push("工作流必须包含且仅包含一个开始节点。");
  if (!f.nodes.some((n) => n.data.kind === "output"))
    errors.push("请添加至少一个输出节点。");
  for (const e of f.edges) {
    const a = byId.get(e.source),
      b = byId.get(e.target);
    if (!a || !b) {
      errors.push("存在指向已删除节点的连线。");
      continue;
    }
    if (a.data.kind === "output" || b.data.kind === "start")
      errors.push("输出节点不能继续连出，开始节点不能接收入线。");
    if (e.source === e.target) errors.push("节点不能连接自身。");
    if (
      !(a.data.kind === "condition" ? ["true", "false"] : ["out"]).includes(
        e.sourceHandle,
      )
    )
      errors.push(`${a.data.title} 的输出端口无效。`);
  }
  for (const n of f.nodes) {
    const ports =
      n.data.kind === "condition"
        ? ["true", "false"]
        : n.data.kind === "output"
          ? []
          : ["out"];
    for (const port of ports) {
      const count = f.edges.filter(
        (e) => e.source === n.id && e.sourceHandle === port,
      ).length;
      if (count !== 1)
        errors.push(
          `${n.data.title} 的 ${port === "out" ? "下一步" : port === "true" ? "IF" : "ELSE"} 需要连接一个节点。`,
        );
    }
    if (n.data.kind === "condition") {
      if (
        !n.data.config.path?.trim() ||
        !OPERATORS.some(([id]) => id === n.data.config.operator)
      )
        errors.push(`${n.data.title} 的条件配置不完整。`);
    }
    if (
      n.data.kind === "set" &&
      (!/^[A-Za-z_]\w*$/.test(n.data.config.key || "") ||
        forbidden.has(n.data.config.key))
    )
      errors.push(`${n.data.title} 的变量名称无效。`);
  }
  const visiting = new Set(),
    visited = new Set();
  function visit(id) {
    if (visiting.has(id)) {
      errors.push("当前执行器不支持循环，请移除回连。");
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const e of f.edges.filter((e) => e.source === id)) visit(e.target);
    visiting.delete(id);
    visited.add(id);
  }
  f.nodes.forEach((n) => visit(n.id));
  const reachable = new Set();
  function reach(id) {
    if (reachable.has(id)) return;
    reachable.add(id);
    f.edges.filter((e) => e.source === id).forEach((e) => reach(e.target));
  }
  if (starts[0]) reach(starts[0].id);
  f.nodes
    .filter((n) => !reachable.has(n.id))
    .forEach((n) => warnings.push(`${n.data.title} 尚未连接到开始节点。`));
  return { errors: [...new Set(errors)], warnings };
}
export function connectNodes(flow, source, target, sourceHandle = "out") {
  const a = flow.nodes.find((n) => n.id === source),
    b = flow.nodes.find((n) => n.id === target);
  if (!a || !b) throw Error("请选择有效的节点");
  if (a.data.kind === "output" || b.data.kind === "start" || source === target)
    throw Error("不能建立这条连线");
  if (
    !(a.data.kind === "condition" ? ["true", "false"] : ["out"]).includes(
      sourceHandle,
    )
  )
    throw Error("请选择有效的输出端口");
  const edges = [
    ...flow.edges.filter(
      (e) => !(e.source === source && e.sourceHandle === sourceHandle),
    ),
    { id: uid("edge"), source, target, sourceHandle },
  ];
  const seen = new Set();
  function reaches(id) {
    if (id === source) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return edges.filter((e) => e.source === id).some((e) => reaches(e.target));
  }
  if (reaches(target))
    throw Error("这条连线会形成循环，当前版本仅支持无环工作流。");
  return { ...flow, edges };
}
export async function executeWorkflow(
  flow,
  input,
  { onEvent = () => {}, signal, analyzeAI } = {},
) {
  const validation = validateWorkflow(flow);
  if (validation.errors.length) throw Error(validation.errors.join("\n"));
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("测试输入必须是 JSON 对象");
  const state = {
    input: structuredClone(input),
    vars: {},
    nodes: {},
    last: "",
  };
  const trace = [];
  let current = flow.nodes.find((n) => n.data.kind === "start");
  for (let step = 0; current && step < 300; step++) {
    if (signal?.aborted) throw new DOMException("运行已停止", "AbortError");
    const event = {
      nodeId: current.id,
      title: current.data.title,
      kind: current.data.kind,
      status: "running",
      step: step + 1,
    };
    onEvent(event);
    try {
      const { kind, config } = current.data;
      let output, branch, detail;
      const references = (config.references || []).map((r) =>
        referenceContent(flow, r),
      );
      const context = references.map((r) => r.text).join("\n\n");
      const instruction = config.sourceDocumentId
        ? flow.documents.find((d) => d.id === config.sourceDocumentId).source
        : config.interpolate === false
          ? config.template
          : ["template", "ai", "output"].includes(kind)
            ? renderTemplate(config.template, state)
            : "";
      const prompt = [context, instruction]
        .filter((x) => x !== undefined && x !== "")
        .join("\n\n");
      const received =
        kind === "start" ? structuredClone(state.input) : state.last;
      if (kind === "start") output = state.input;
      else if (kind === "condition") {
        branch = evaluateCondition(config, state) ? "true" : "false";
        output = branch === "true";
        detail = {
          path: config.path,
          actual: resolvePath(state, config.path),
          operator: config.operator,
          expected: config.value,
          decision:
            branch === "true"
              ? "条件成立，选择 IF 路径"
              : "条件不成立，选择 ELSE 路径",
        };
      } else if (kind === "set") {
        output =
          config.valueType === "template"
            ? renderTemplate(config.value, state)
            : config.value;
        if (forbidden.has(config.key)) throw Error("变量名不可用");
        state.vars[config.key] = output;
      } else if (kind === "ai") {
        if (!analyzeAI) throw Error("请先配置 AI 接口。");
        output = await analyzeAI(prompt, signal);
      } else output = prompt;
      if (signal?.aborted) throw new DOMException("运行已停止", "AbortError");
      state.nodes[current.id] = { output };
      state.last = output;
      const done = {
        ...event,
        status: "success",
        output,
        branch,
        received,
        detail,
        references: references.map((r) => ({ name: r.name, title: r.title })),
      };
      trace.push(done);
      onEvent(done);
      if (kind === "output") return { output, state, trace };
      const edge = flow.edges.find(
        (e) => e.source === current.id && e.sourceHandle === (branch || "out"),
      );
      if (!edge) throw Error("执行路径没有连接到下一节点");
      current = flow.nodes.find((n) => n.id === edge.target);
      await new Promise((resolve) => setTimeout(resolve, 0));
    } catch (e) {
      onEvent({
        ...event,
        status: e.name === "AbortError" ? "stopped" : "error",
        error: e.message,
      });
      throw e;
    }
  }
  throw Error("执行未到达输出节点或超过步数限制");
}
export function serializeWorkflow(flow, format = "json") {
  const value = normalizeWorkflow(flow);
  const json = JSON.stringify(value, null, 2);
  if (format === "yaml") return stringify(value);
  if (format === "markdown")
    return `# ${value.name}\n\n此文件包含可由 Agent Atlas 恢复的工作流定义；执行语义属于 Atlas，不是其他平台的通用指令协议。\n\n\`\`\`atlas-workflow\n${json}\n\`\`\`\n`;
  return json;
}
export function parseWorkflow(text, name) {
  if (text.length > 4 * 1024 * 1024) throw Error("文件超过 4 MB");
  if (/\.md$/i.test(name)) {
    const embedded = text.match(/```atlas-workflow\s*\n([\s\S]*?)\n```/);
    if (embedded) return normalizeWorkflow(JSON.parse(embedded[1]));
    const flow = blankWorkflow();
    flow.name = name.replace(/\.md$/i, "");
    const doc = makeSource(name, text);
    flow.documents = [doc];
    const content = createNode("template", { x: 350, y: 180 });
    content.data.title = "导入的 Markdown";
    content.data.config = {
      template: "",
      interpolate: false,
      sourceDocumentId: doc.id,
    };
    const output = createNode("output", { x: 640, y: 180 });
    flow.nodes.push(content, output);
    return connectNodes(
      connectNodes(flow, flow.nodes[0].id, content.id),
      content.id,
      output.id,
    );
  }
  const yaml = /\.ya?ml$/i.test(name);
  if (!yaml && !/\.json$/i.test(name))
    throw Error("请选择 .json、.yaml、.yml 或 .md 文件");
  if (yaml) {
    const d = parseDocument(text);
    if (d.errors.length) throw Error(d.errors[0].message);
    return normalizeWorkflow(d.toJS({ maxAliasCount: 100 }));
  }
  return normalizeWorkflow(JSON.parse(text));
}
