import AlignmentTools from "./AlignmentTools.jsx";
import { placeNode } from "./layout.js";
import { AppearanceButton, useAppearance } from "./Appearance.jsx";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Button,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Drawer,
  useMediaQuery,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  applyNodeChanges,
} from "@xyflow/react";
import {
  Layers,
  Workflow,
  FileText,
  Plus,
  Search,
  ArrowDownToLine,
  Upload,
  Play,
  Square,
  GitBranch,
  Braces,
  Type,
  Sparkles,
  LogIn,
  LogOut,
  Undo2,
  Redo2,
  Settings2,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  X,
  PanelLeft,
  PanelRight,
  ScanLine,
  Code2,
  ListTree,
  Terminal,
  ArrowUpRight,
  Plug,
  Download,
  ZoomIn,
  ShieldCheck,
  Link2,
  RotateCcw,
} from "lucide-react";
import {
  NODE_CATALOG,
  OPERATORS,
  uid,
  createNode,
  demoWorkflow,
  blankWorkflow,
  validateWorkflow,
  connectNodes,
  executeWorkflow,
  serializeWorkflow,
  parseWorkflow,
  normalizeWorkflow,
} from "./workflow";
import "./workflow.css";
import SourceLibrary from "./SourceLibrary";
import InputForm from "./InputForm";
import {
  autoLayout,
  variableOptions,
  fieldLabel,
  referenceContent,
} from "./workflowExtras.js";

const ICONS = {
  start: LogIn,
  template: Type,
  condition: GitBranch,
  set: Braces,
  ai: Sparkles,
  output: LogOut,
};
const tone = {
  green: "#45765c",
  blue: "#537da4",
  amber: "#a87828",
  violet: "#8b6c9f",
  teal: "#438c8b",
  slate: "#657680",
};
function Action({ label, children, onClick, disabled }) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}
function FlowNode({ data, selected, isConnectable }) {
  const meta = NODE_CATALOG.find((n) => n.kind === data.kind),
    Icon = ICONS[data.kind];
  const config = data.config;
  return (
    <div
      className={`flow-node ${selected ? "is-selected" : ""} ${data.status || ""}`}
      data-kind={data.kind}
    >
      {data.kind !== "start" && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          isConnectable={isConnectable}
        />
      )}
      <div className="flow-node-title">
        <span className={`flow-icon ${meta.tone}`}>
          <Icon size={19} />
        </span>
        <div>
          <span className="flow-kind">{meta.title}</span>
          <strong>{data.title}</strong>
        </div>
        {data.status === "success" ? (
          <Check size={16} className="flow-done" />
        ) : data.status === "running" ? (
          <span className="flow-running" />
        ) : null}
      </div>
      {data.kind === "condition" ? (
        <>
          <div className="flow-expression">
            <code>
              {config.path?.startsWith("input.")
                ? fieldLabel(config.path.slice(6))
                : config.path || "选择变量"}
            </code>
            <span>{OPERATORS.find(([op]) => op === config.operator)?.[1]}</span>
            <b>
              {["exists", "isTrue"].includes(config.operator)
                ? ""
                : typeof config.value === "boolean"
                  ? config.value
                    ? "是"
                    : "否"
                  : JSON.stringify(config.value)}
            </b>
          </div>
          <div className="flow-branch-row">
            <span className="branch-true">IF · 条件成立</span>
            <span className="branch-false">ELSE · 不成立</span>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            style={{ top: "68%" }}
            isConnectable={isConnectable}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            style={{ top: "88%" }}
            isConnectable={isConnectable}
          />
        </>
      ) : (
        <>
          <div className="flow-node-preview">
            {data.kind === "start"
              ? "填写任务信息，开始这次协作"
              : data.kind === "set"
                ? `${config.key} = ${String(config.value)}`
                : config.template?.slice(0, 84) || meta.description}
          </div>
          {data.referenceCount > 0 && (
            <div className="flow-source-tag">
              <Link2 size={12} /> 引用了 {data.referenceCount} 份原文内容
            </div>
          )}
          <div className="flow-node-foot">
            <span>
              {data.kind === "ai"
                ? "使用已配置的模型"
                : data.kind === "output"
                  ? "结束此执行路径"
                  : "数据传递到下一节点"}
            </span>
            {data.kind !== "output" && <ChevronRight size={12} />}
          </div>
          {data.kind !== "output" && (
            <Handle
              type="source"
              position={Position.Right}
              id="out"
              isConnectable={isConnectable}
            />
          )}
        </>
      )}
    </div>
  );
}
const nodeTypes = { workflow: React.memo(FlowNode) };
const storageKey = "atlas.flow.v1";
function initialFlow() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return parseWorkflow(raw, "saved.json");
  } catch {}
  return autoLayout(demoWorkflow());
}
function downloadFile(text, name) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function WorkflowEditor() {
  const { tokens } = useAppearance();
  const [snap, setSnap] = useState(true);
  const [dragNodes, setDragNodes] = useState(null);
  const [flow, setFlow] = useState(initialFlow),
    [selection, setSelection] = useState("check"),
    [dragging, setDragging] = useState(false),
    [libraryTab, setLibraryTab] = useState("library"),
    [query, setQuery] = useState(""),
    [view, setView] = useState("canvas"),
    [dialog, setDialog] = useState(null),
    [notice, setNotice] = useState(""),
    [history, setHistory] = useState([]),
    [future, setFuture] = useState([]),
    [draft, setDraft] = useState(null),
    [dirty, setDirty] = useState(false),
    [trace, setTrace] = useState([]),
    [result, setResult] = useState(null),
    [runError, setRunError] = useState(""),
    [running, setRunning] = useState(false),
    [logsOpen, setLogsOpen] = useState(false),
    [inputText, setInputText] = useState(""),
    [sourceText, setSourceText] = useState(""),
    [runInput, setRunInput] = useState(null),
    [config, setConfig] = useState({ baseUrl: "", model: "", apiKey: "" }),
    [saveState, setSaveState] = useState("流程已保存在此浏览器"),
    [leftOpen, setLeftOpen] = useState(false),
    [rightOpen, setRightOpen] = useState(false),
    [edgeSelection, setEdgeSelection] = useState(null),
    [exportFormat, setExportFormat] = useState("json"),
    [zoom, setZoom] = useState(90),
    [runStale, setRunStale] = useState(false),
    [advancedCondition, setAdvancedCondition] = useState(false),
    [sourceRef, setSourceRef] = useState(null),
    [leftCollapsed, setLeftCollapsed] = useState(false),
    [rightCollapsed, setRightCollapsed] = useState(true),
    [traceDetail, setTraceDetail] = useState(null),
    [caseName, setCaseName] = useState(""),
    [versionName, setVersionName] = useState(""),
    [versions, setVersions] = useState(() => {
      try {
        const list = JSON.parse(
          localStorage.getItem("atlas.flow.versions") || "[]",
        );
        return Array.isArray(list)
          ? list
              .filter((v) => typeof v.name === "string" && v.flow)
              .slice(0, 10)
          : [];
      } catch {
        return [];
      }
    });
  const flowInstance = useRef(),
    fileInput = useRef(),
    abortRef = useRef(),
    canvasRef = useRef(),
    dragStart = useRef();
  const narrow = useMediaQuery("(max-width:1100px)");
  const selected = flow.nodes.find((n) => n.id === selection);
  const variables = useMemo(
    () => variableOptions(flow, selection),
    [flow, selection],
  );
  const validation = useMemo(() => validateWorkflow(flow), [flow]);
  useEffect(() => {
    if (dragging) return;
    try {
      localStorage.setItem(storageKey, serializeWorkflow(flow));
      setSaveState("流程已保存在此浏览器");
    } catch {
      setSaveState("自动保存失败，请导出备份");
    }
    setSourceText(serializeWorkflow(flow));
    if (trace.length) setRunStale(true);
  }, [flow, dragging]);
  useEffect(() => {
    setDraft(selected ? structuredClone(selected.data) : null);
    setDirty(false);
  }, [selection, flow.nodes.find((n) => n.id === selection)?.data]);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    const listener = (e) => {
      if (dirty || sourceText !== serializeWorkflow(flow)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty, sourceText, flow]);
  function change(next, { keepTrace = false } = {}) {
    setHistory((h) => [...h.slice(-39), flow]);
    setFuture([]);
    setFlow(next);
    setDirty(false);
    if (!keepTrace && trace.length) setRunStale(true);
  }
  function discard() {
    if (!dirty && sourceText === serializeWorkflow(flow)) return true;
    if (!confirm("有未应用的节点或源码修改，是否放弃？")) return false;
    setDirty(false);
    setSourceText(serializeWorkflow(flow));
    setDraft(selected ? structuredClone(selected.data) : null);
    return true;
  }
  function choose(id) {
    if (running) return;
    if (id !== selection && !discard()) return;
    setSelection(id);
    setEdgeSelection(null);
    setRightOpen(narrow);
    setRightCollapsed(false);
    setAdvancedCondition(false);
  }
  function updateConfig(key, value) {
    setDraft((d) => ({ ...d, config: { ...d.config, [key]: value } }));
    setDirty(true);
  }
  function applyDraft() {
    if (!draft?.title.trim()) {
      setNotice("请填写节点名称");
      return;
    }
    if (sourceText !== serializeWorkflow(flow)) {
      setNotice("请先应用或撤销源码修改");
      return;
    }
    try {
      change(
        normalizeWorkflow({
          ...flow,
          nodes: flow.nodes.map((n) =>
            n.id === selection ? { ...n, data: structuredClone(draft) } : n,
          ),
        }),
      );
    } catch (e) {
      setNotice(e.message);
      return;
    }
    setNotice("节点配置已应用");
  }
  function add(kind, position) {
    if (running || !discard()) return;
    if (kind === "start" && flow.nodes.some((n) => n.data.kind === "start")) {
      setNotice("一个工作流只需要一个开始节点");
      return;
    }
    const bounds = canvasRef.current?.getBoundingClientRect();
    const center =
      bounds &&
      flowInstance.current?.screenToFlowPosition({
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      });
    const n = createNode(
      kind,
      position ||
        (center
          ? { x: center.x - 125, y: center.y - 100 }
          : { x: 300, y: 160 }),
    );
    n.position = placeNode(n.position, flow.nodes, snap);
    // Keep the viewport and panel widths stable; dropped nodes stay under the pointer.
    change({ ...flow, nodes: [...flow.nodes, n] });
    setSelection(n.id);
    setLeftOpen(false);
    setNotice(`已添加${n.data.title}，点击节点配置并连接下一步`);
  }

  function link(source, target, port) {
    if (running || !discard()) return;
    try {
      change(
        target
          ? connectNodes(flow, source, target, port)
          : {
              ...flow,
              edges: flow.edges.filter(
                (e) => !(e.source === source && e.sourceHandle === port),
              ),
            },
      );
    } catch (e) {
      setNotice(e.message);
    }
  }
  function removeNode() {
    if (!selected || !discard()) return;
    change({
      ...flow,
      nodes: flow.nodes.filter((n) => n.id !== selected.id),
      edges: flow.edges.filter(
        (e) => e.source !== selected.id && e.target !== selected.id,
      ),
    });
    setSelection(null);
  }
  function duplicate() {
    if (!selected || !discard()) return;
    if (selected.data.kind === "start") {
      setNotice("开始节点不能复制");
      return;
    }
    const n = {
      ...structuredClone(selected),
      id: uid(),
      position: { x: selected.position.x + 40, y: selected.position.y + 210 },
    };
    change({ ...flow, nodes: [...flow.nodes, n] });
    setSelection(n.id);
  }
  function undo() {
    if (!history.length || !discard()) return;
    setFuture((f) => [flow, ...f]);
    setFlow(history.at(-1));
    setHistory((h) => h.slice(0, -1));
  }
  function redo() {
    if (!future.length || !discard()) return;
    setHistory((h) => [...h, flow]);
    setFlow(future[0]);
    setFuture((f) => f.slice(1));
  }
  async function importFile(file) {
    if (!file || !discard()) return;
    try {
      if (file.size > 4 * 1024 * 1024) throw Error("文件上限为 4 MB");
      const next = autoLayout(parseWorkflow(await file.text(), file.name));
      change(next);
      setSelection(next.nodes[0]?.id);
      setTrace([]);
      setResult(null);
      setNotice("已导入工作流；Markdown 原文可在内容库编辑和回导");
      if (next.documents?.length) setLibraryTab("content");
      setTimeout(() => flowInstance.current?.fitView({ padding: 0.12 }), 100);
    } catch (e) {
      setNotice(e.message);
    }
  }
  function arrange() {
    if (running || !discard()) return;
    try {
      change(autoLayout(flow));
      setTimeout(
        () => flowInstance.current?.fitView({ padding: 0.12, duration: 300 }),
        100,
      );
    } catch (e) {
      setNotice(e.message);
    }
  }
  function openReference(ref) {
    setSourceRef(ref);
    setLibraryTab("content");
    setLeftCollapsed(false);
    setLeftOpen(true);
  }
  function openRun() {
    if (dirty || sourceText !== serializeWorkflow(flow)) {
      setNotice("请先应用尚未保存的节点或源码修改");
      return;
    }
    setInputText(JSON.stringify(flow.input, null, 2));
    setDialog("run");
  }
  async function run() {
    let input;
    try {
      input = JSON.parse(inputText);
      if (!input || typeof input !== "object" || Array.isArray(input))
        throw Error("请提供 JSON 对象");
    } catch (e) {
      setNotice(`输入格式错误：${e.message}`);
      return;
    }
    const check = validateWorkflow(flow);
    if (check.errors.length) {
      setNotice("请先修复工作流检查中的错误");
      return;
    }
    if (
      flow.nodes.some((n) => n.data.kind === "ai") &&
      (!config.baseUrl || !config.model)
    ) {
      setNotice("工作流包含 AI 节点，请先配置模型接口");
      return;
    }
    setDialog(null);
    setRunning(true);
    setRunInput(input);
    setTraceDetail(null);
    setTrace([]);
    setResult(null);
    setRunError("");
    setRunStale(false);
    setLogsOpen(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const output = await executeWorkflow(flow, input, {
        signal: controller.signal,
        onEvent: (event) =>
          setTrace((t) => [
            ...t.filter((x) => x.nodeId !== event.nodeId),
            event,
          ]),
        analyzeAI: async (text, signal) => {
          const r = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...config, source: text }),
            signal,
          });
          const p = await r.json();
          if (!r.ok) throw Error(p.error || "模型请求失败");
          return p.content;
        },
      });
      setResult(output.output);
    } catch (e) {
      setRunError(e.name === "AbortError" ? "运行已停止" : e.message);
    } finally {
      setRunning(false);
    }
  }
  const nodePresentation = useMemo(
    () => ({
      cache: new WeakMap(),
      statuses: new Map(trace.map((t) => [t.nodeId, t.status])),
    }),
    [trace, runStale],
  );
  const flowNodes = (dragNodes || flow.nodes).map((n) => {
    let data = nodePresentation.cache.get(n.data);
    if (!data) {
      data = {
        ...n.data,
        referenceCount:
          (n.data.config.references?.length || 0) +
          (n.data.config.sourceDocumentId ? 1 : 0),
        status: runStale ? undefined : nodePresentation.statuses.get(n.id),
      };
      nodePresentation.cache.set(n.data, data);
    }
    return { ...n, selected: selection === n.id, data };
  });
  const flowEdges = flow.edges.map((e) => {
    const source = flow.nodes.find((n) => n.id === e.source);
    const conditional = source?.data.kind === "condition";
    const traversed =
      !runStale &&
      trace.some(
        (t) =>
          t.nodeId === e.source &&
          t.status === "success" &&
          (!t.branch || t.branch === e.sourceHandle),
      ) &&
      trace.some((t) => t.nodeId === e.target);
    const color =
      e.sourceHandle === "false"
        ? tokens.muted
        : conditional
          ? tokens.edge
          : tokens.control;
    return {
      ...e,
      type: "smoothstep",
      targetHandle: "in",
      label: conditional
        ? e.sourceHandle === "true"
          ? "IF · 成立"
          : "ELSE · 不成立"
        : undefined,
      animated: false,
      selected: e.id === edgeSelection,
      style: {
        stroke: traversed ? tokens.accentInk : color,
        strokeWidth: traversed ? 2.7 : 1.6,
        strokeDasharray: e.sourceHandle === "false" ? "5 4" : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: traversed ? tokens.accentInk : color,
        width: 16,
        height: 16,
      },
      labelStyle: { fill: tokens.ink, fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: tokens.surface },
      labelBgPadding: [7, 5],
      labelBgBorderRadius: 16,
    };
  });
  const currentMeta = NODE_CATALOG.find((n) => n.kind === draft?.kind);
  const library = (
    <aside className="wf-library">
      <div className="wf-panel-title">
        <h2>构建工作流</h2>
        {narrow && (
          <Action label="关闭节点库" onClick={() => setLeftOpen(false)}>
            <X size={17} />
          </Action>
        )}
      </div>
      <div className="wf-segment">
        <button
          className={libraryTab === "library" ? "active" : ""}
          onClick={() => setLibraryTab("library")}
        >
          节点库
        </button>
        <button
          className={libraryTab === "outline" ? "active" : ""}
          onClick={() => setLibraryTab("outline")}
        >
          大纲 <span>{flow.nodes.length}</span>
        </button>
        <button
          className={libraryTab === "content" ? "active" : ""}
          onClick={() => setLibraryTab("content")}
        >
          内容库 <span>{flow.documents?.length || 0}</span>
        </button>
      </div>
      <div className="wf-library-search" hidden={libraryTab === "content"}>
        <Search size={15} />
        <input
          aria-label="搜索节点"
          placeholder="搜索节点…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="wf-library-scroll">
        {libraryTab === "content" ? (
          <SourceLibrary
            flow={flow}
            onChange={(next) => change(normalizeWorkflow(next))}
            selectedId={selection}
            disabled={
              running || dirty || sourceText !== serializeWorkflow(flow)
            }
            onNotice={setNotice}
            openRef={sourceRef}
            onRefClosed={() => setSourceRef(null)}
          />
        ) : libraryTab === "library" ? (
          ["基础", "处理", "逻辑"].map((group) => (
            <div className="wf-node-group" key={group}>
              <h3>{group}</h3>
              {NODE_CATALOG.filter(
                (n) =>
                  n.group === group &&
                  (n.title + n.description).includes(query),
              ).map((n) => {
                const Icon = ICONS[n.kind];
                return (
                  <button
                    key={n.kind}
                    className="wf-library-node"
                    draggable={!running}
                    disabled={running}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/atlas-node", n.kind);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => add(n.kind)}
                    aria-label={`添加${n.title}节点`}
                  >
                    <span className={`flow-icon ${n.tone}`}>
                      <Icon size={19} />
                    </span>
                    <span>
                      <strong>{n.title}</strong>
                      <small>{n.description}</small>
                    </span>
                    <Plus size={14} />
                  </button>
                );
              })}
            </div>
          ))
        ) : (
          flow.nodes
            .filter((n) => n.data.title.includes(query))
            .map((n) => (
              <button
                className={`wf-outline-node ${selection === n.id ? "active" : ""}`}
                key={n.id}
                onClick={() => {
                  choose(n.id);
                  setLeftOpen(false);
                  flowInstance.current?.setCenter(
                    n.position.x + 120,
                    n.position.y + 80,
                    { zoom: 1, duration: 200 },
                  );
                }}
              >
                <span
                  className={`flow-icon ${NODE_CATALOG.find((m) => m.kind === n.data.kind)?.tone}`}
                >
                  {React.createElement(ICONS[n.data.kind], { size: 16 })}
                </span>
                <span>{n.data.title}</span>
                <ChevronRight size={14} />
              </button>
            ))
        )}
      </div>
      <div className="wf-library-footer">
        <div className="wf-tip">
          <Link2 size={16} />
          <p>
            拖入节点，再连接端口。
            <br />
            也可在右侧直接选择下一步。
          </p>
        </div>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<FileText size={15} />}
          href="#documents"
        >
          打开指令文档编辑器
        </Button>
      </div>
    </aside>
  );
  const inspector = (
    <aside className="wf-inspector">
      <div className="wf-panel-title">
        <h2>{edgeSelection ? "连线设置" : "节点设置"}</h2>
        <div>
          {selected && !edgeSelection && (
            <Action label="复制选中节点" disabled={running} onClick={duplicate}>
              <Copy size={16} />
            </Action>
          )}
          {narrow && (
            <Action label="关闭节点设置" onClick={() => setRightOpen(false)}>
              <X size={17} />
            </Action>
          )}
        </div>
      </div>
      <div className="wf-inspector-scroll">
        {edgeSelection ? (
          <div className="wf-edge-inspector">
            <p>删除连接后，可以重新拖动端口建立路径。</p>
            <Button
              color="error"
              variant="outlined"
              startIcon={<Trash2 size={15} />}
              disabled={running}
              onClick={() => {
                if (!discard()) return;
                change({
                  ...flow,
                  edges: flow.edges.filter((e) => e.id !== edgeSelection),
                });
                setEdgeSelection(null);
              }}
            >
              删除此连线
            </Button>
          </div>
        ) : draft && selected ? (
          <>
            <div className="wf-selected-type">
              <span className={`flow-icon ${currentMeta.tone}`}>
                {React.createElement(ICONS[draft.kind], { size: 21 })}
              </span>
              <div>
                <strong>{currentMeta.title}</strong>
                <small>{selected.id}</small>
              </div>
              <Chip
                size="small"
                label={dirty ? "修改待应用" : "已应用"}
                variant="outlined"
              />
            </div>
            <TextField
              fullWidth
              label="节点名称"
              value={draft.title}
              disabled={running}
              onChange={(e) => {
                setDraft({ ...draft, title: e.target.value });
                setDirty(true);
              }}
            />
            <div className="wf-form-section">
              <h3>
                {draft.kind === "condition"
                  ? "判断规则"
                  : draft.kind === "start"
                    ? "输入变量"
                    : draft.kind === "set"
                      ? "变量设置"
                      : "内容配置"}
              </h3>
              {draft.kind === "condition" ? (
                <>
                  <p className="condition-sentence">
                    当下列信息满足条件时，执行 IF；否则执行 ELSE。
                  </p>
                  <Button
                    size="small"
                    onClick={() => setAdvancedCondition(!advancedCondition)}
                  >
                    {advancedCondition ? "选择已有信息" : "手写变量路径"}
                  </Button>
                  {advancedCondition ? (
                    <TextField
                      fullWidth
                      label="变量路径"
                      value={draft.config.path || ""}
                      disabled={running}
                      onChange={(e) => updateConfig("path", e.target.value)}
                      helperText="例如 input.ready 或 vars.score"
                    />
                  ) : (
                    <TextField
                      fullWidth
                      select
                      label="判断哪项信息"
                      value={draft.config.path || ""}
                      disabled={running}
                      onChange={(e) => {
                        const v = variables.find(
                          (v) => v.path === e.target.value,
                        );
                        setDraft((d) => ({
                          ...d,
                          config: {
                            ...d.config,
                            path: e.target.value,
                            value:
                              typeof v?.value === "boolean"
                                ? true
                                : typeof v?.value === "number"
                                  ? 0
                                  : "",
                          },
                        }));
                        setDirty(true);
                      }}
                      helperText={
                        variables.find((v) => v.path === draft.config.path)
                          ?.value !== undefined
                          ? "示例值：" +
                            String(
                              variables.find(
                                (v) => v.path === draft.config.path,
                              )?.value,
                            )
                          : "从输入和上游节点选择；输出的实际类型以运行结果为准"
                      }
                    >
                      {!variables.some((v) => v.path === draft.config.path) && (
                        <MenuItem value={draft.config.path || ""}>
                          {draft.config.path || "请选择信息"}
                        </MenuItem>
                      )}
                      {variables.map((v) => (
                        <MenuItem key={v.path} value={v.path}>
                          {v.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  <TextField
                    fullWidth
                    select
                    label="满足什么条件"
                    value={draft.config.operator || "equals"}
                    disabled={running}
                    onChange={(e) => updateConfig("operator", e.target.value)}
                  >
                    {OPERATORS.map(([id, label]) => (
                      <MenuItem key={id} value={id}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                  {!["exists", "isTrue"].includes(draft.config.operator) && (
                    <div className="wf-value-row">
                      <TextField
                        select
                        label="类型"
                        value={typeof draft.config.value}
                        disabled={running}
                        onChange={(e) =>
                          updateConfig(
                            "value",
                            e.target.value === "boolean"
                              ? true
                              : e.target.value === "number"
                                ? 0
                                : "",
                          )
                        }
                      >
                        <MenuItem value="boolean">是 / 否</MenuItem>
                        <MenuItem value="string">文本</MenuItem>
                        <MenuItem value="number">数值</MenuItem>
                      </TextField>
                      {typeof draft.config.value === "boolean" ? (
                        <TextField
                          select
                          label="比较值"
                          value={String(draft.config.value)}
                          disabled={running}
                          onChange={(e) =>
                            updateConfig("value", e.target.value === "true")
                          }
                        >
                          <MenuItem value="true">是</MenuItem>
                          <MenuItem value="false">否</MenuItem>
                        </TextField>
                      ) : (
                        <TextField
                          label="比较值"
                          type={
                            typeof draft.config.value === "number"
                              ? "number"
                              : "text"
                          }
                          value={draft.config.value ?? ""}
                          disabled={running}
                          onChange={(e) =>
                            updateConfig(
                              "value",
                              typeof draft.config.value === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                            )
                          }
                        />
                      )}
                    </div>
                  )}
                  <div className="wf-rule-preview">
                    <GitBranch size={16} />
                    <span>
                      当「
                      {variables.find((v) => v.path === draft.config.path)
                        ?.label || draft.config.path}
                      」
                      {
                        OPERATORS.find(
                          ([op]) => op === draft.config.operator,
                        )?.[1]
                      }
                      {["exists", "isTrue"].includes(draft.config.operator)
                        ? ""
                        : typeof draft.config.value === "boolean"
                          ? draft.config.value
                            ? "是"
                            : "否"
                          : String(draft.config.value)}
                      ，执行 IF。
                    </span>
                  </div>
                </>
              ) : draft.kind === "start" ? (
                <>
                  <p className="wf-muted">
                    运行前可以修改测试输入。其他节点通过变量路径读取数据。
                  </p>
                  <pre className="wf-input-preview">
                    {JSON.stringify(flow.input, null, 2)}
                  </pre>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setInputText(JSON.stringify(flow.input, null, 2));
                      setDialog("input");
                    }}
                    disabled={
                      running || dirty || sourceText !== serializeWorkflow(flow)
                    }
                  >
                    编辑默认输入
                  </Button>
                </>
              ) : draft.kind === "set" ? (
                <>
                  <TextField
                    label="变量名称"
                    fullWidth
                    value={draft.config.key || ""}
                    disabled={running}
                    onChange={(e) => updateConfig("key", e.target.value)}
                    helperText="通过 vars.变量名称 引用"
                  />
                  <TextField
                    select
                    label="赋值类型"
                    fullWidth
                    value={draft.config.valueType || "template"}
                    disabled={running}
                    onChange={(e) => {
                      setDraft((d) => ({
                        ...d,
                        config: {
                          ...d.config,
                          valueType: e.target.value,
                          value:
                            e.target.value === "number"
                              ? 0
                              : e.target.value === "boolean"
                                ? true
                                : "",
                        },
                      }));
                      setDirty(true);
                    }}
                  >
                    <MenuItem value="template">文本模板</MenuItem>
                    <MenuItem value="number">数值</MenuItem>
                    <MenuItem value="boolean">布尔值</MenuItem>
                  </TextField>
                  {draft.config.valueType === "boolean" ? (
                    <TextField
                      label="值"
                      select
                      fullWidth
                      value={String(draft.config.value)}
                      onChange={(e) =>
                        updateConfig("value", e.target.value === "true")
                      }
                      disabled={running}
                    >
                      <MenuItem value="true">是</MenuItem>
                      <MenuItem value="false">否</MenuItem>
                    </TextField>
                  ) : (
                    <TextField
                      label="值"
                      fullWidth
                      type={
                        draft.config.valueType === "number" ? "number" : "text"
                      }
                      value={draft.config.value ?? ""}
                      disabled={running}
                      onChange={(e) =>
                        updateConfig(
                          "value",
                          draft.config.valueType === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                        )
                      }
                    />
                  )}
                </>
              ) : (
                <>
                  <TextField
                    label={draft.kind === "ai" ? "待分析内容" : "文本内容"}
                    fullWidth
                    multiline
                    minRows={5}
                    maxRows={12}
                    value={draft.config.template || ""}
                    disabled={running || !!draft.config.sourceDocumentId}
                    helperText={
                      draft.config.sourceDocumentId
                        ? "此节点读取关联的整份 Markdown，请在内容库编辑原文。"
                        : undefined
                    }
                    onChange={(e) => updateConfig("template", e.target.value)}
                  />
                  <div className="wf-variable-hint">
                    <Braces size={14} />
                    <span>
                      {"使用 {{input.brief}}、{{last}} 或 {{vars.name}}"}
                    </span>
                  </div>
                  {draft.kind === "template" && (
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={draft.config.interpolate !== false}
                          onChange={(e) =>
                            updateConfig("interpolate", e.target.checked)
                          }
                          disabled={running}
                        />
                      }
                      label="替换模板变量"
                    />
                  )}
                  {draft.kind === "ai" && (
                    <Alert severity="info">
                      运行时会将内容发送到已配置的模型服务。
                    </Alert>
                  )}
                </>
              )}
            </div>
            {["template", "ai"].includes(draft.kind) && (
              <div className="node-references">
                <h3>引用的原文</h3>
                {draft.config.sourceDocumentId && (
                  <Button
                    size="small"
                    startIcon={<FileText size={14} />}
                    onClick={() =>
                      openReference({
                        documentId: draft.config.sourceDocumentId,
                      })
                    }
                  >
                    整份文档 · 点击编辑
                  </Button>
                )}
                {(draft.config.references || []).map((ref, i) => {
                  let r;
                  try {
                    r = referenceContent(flow, ref);
                  } catch {}
                  return (
                    <div className="reference-row" key={i}>
                      <button onClick={() => openReference(ref)}>
                        <Link2 size={13} />
                        {r?.title || "引用失效"}
                        <small>{r?.name}</small>
                      </button>
                      <Action
                        label={"移除引用 " + (r?.title || i)}
                        disabled={running}
                        onClick={() =>
                          updateConfig(
                            "references",
                            draft.config.references.filter((_, j) => i !== j),
                          )
                        }
                      >
                        <X size={14} />
                      </Action>
                    </div>
                  );
                })}
                <Button
                  size="small"
                  onClick={() => {
                    setLibraryTab("content");
                    setLeftCollapsed(false);
                    setLeftOpen(true);
                  }}
                >
                  从内容库添加引用
                </Button>
                <p>引用内容保持原文，运行时放在节点文本之前。</p>
              </div>
            )}
            <Button
              variant="contained"
              fullWidth
              startIcon={<Check size={16} />}
              disabled={!dirty || running}
              onClick={applyDraft}
            >
              应用节点修改
            </Button>
            {draft.kind !== "output" && (
              <div className="wf-form-section">
                <h3>后续路径</h3>
                {(draft.kind === "condition" ? ["true", "false"] : ["out"]).map(
                  (port) => (
                    <div className="wf-next" key={port}>
                      <span
                        className={
                          port === "false" ? "branch-false" : "branch-true"
                        }
                      >
                        {port === "true"
                          ? "IF · 成立"
                          : port === "false"
                            ? "ELSE · 不成立"
                            : "NEXT · 下一步"}
                      </span>
                      <TextField
                        select
                        fullWidth
                        label={
                          port === "out"
                            ? "下一节点"
                            : port === "true"
                              ? "IF 目标节点"
                              : "ELSE 目标节点"
                        }
                        value={
                          flow.edges.find(
                            (e) =>
                              e.source === selection && e.sourceHandle === port,
                          )?.target || ""
                        }
                        disabled={running || dirty}
                        onChange={(e) => link(selection, e.target.value, port)}
                      >
                        <MenuItem value="">尚未连接</MenuItem>
                        {flow.nodes
                          .filter(
                            (n) =>
                              n.id !== selection && n.data.kind !== "start",
                          )
                          .map((n) => (
                            <MenuItem key={n.id} value={n.id}>
                              {n.data.title}
                            </MenuItem>
                          ))}
                      </TextField>
                    </div>
                  ),
                )}
              </div>
            )}
            <div className="wf-delete">
              <Button
                size="small"
                color="error"
                startIcon={<Trash2 size={14} />}
                disabled={running}
                onClick={removeNode}
              >
                删除节点
              </Button>
            </div>
          </>
        ) : (
          <div className="wf-no-selection">
            <Settings2 size={28} />
            <h3>选择一个节点</h3>
            <p>配置内容、判断条件与下一步路径。</p>
          </div>
        )}
      </div>
      <div className="wf-panel-foot">
        <ShieldCheck size={14} />
        <span>配置保存在本机，密钥仅保存在内存</span>
      </div>
    </aside>
  );
  return (
    <div className="wf-app">
      <header className="wf-header">
        <a href="#workflow" className="wf-brand">
          <span>
            <Layers size={23} />
          </span>
          <strong>Agent Atlas</strong>
          <small>工作流工作台</small>
        </a>
        <nav className="wf-main-nav">
          <a className="active" href="#workflow">
            <Workflow size={16} />
            工作流
          </a>
          <a href="#documents">
            <FileText size={16} />
            指令文档
          </a>
        </nav>
        <div className="wf-header-actions">
          <AppearanceButton />
          <Action
            label="模型接口设置"
            onClick={() => setDialog("api")}
            disabled={running}
          >
            <Plug size={19} />
          </Action>
        </div>
      </header>
      <div className="wf-projectbar">
        <div>
          <span className="wf-project-icon">
            <Workflow size={18} />
          </span>
          <h1>{flow.name}</h1>
          <Chip size="small" label="本地草稿" variant="outlined" />
        </div>
        <div className="wf-project-actions">
          <Action
            label="撤销工作流修改"
            disabled={!history.length || running}
            onClick={undo}
          >
            <Undo2 size={17} />
          </Action>
          <Action
            label="重做工作流修改"
            disabled={!future.length || running}
            onClick={redo}
          >
            <Redo2 size={17} />
          </Action>
          <span className="wf-separator" />
          <Button
            size="small"
            disabled={running}
            onClick={() => setDialog("versions")}
          >
            版本
          </Button>
          <Button
            size="small"
            startIcon={<Plus size={15} />}
            disabled={running}
            onClick={() => setDialog("new")}
          >
            新建
          </Button>
          <Button
            size="small"
            startIcon={<Upload size={15} />}
            disabled={running}
            onClick={() => fileInput.current.click()}
          >
            导入
          </Button>
        </div>
      </div>
      <div className="wf-taskbar" aria-label="工作流操作">
        <div className="wf-task-context">
          <span>编辑工作流</span>
          <small>添加节点 → 连接步骤 → 测试结果</small>
        </div>
        <div className="wf-task-actions">
          {" "}
          <span className="wf-save">
            <i />
            {saveState}
          </span>
          <Button
            variant="outlined"
            startIcon={<Download size={15} />}
            onClick={() => setDialog("export")}
            disabled={running}
          >
            导出
          </Button>
          <Button
            variant="contained"
            startIcon={running ? <Square size={14} /> : <Play size={15} />}
            onClick={running ? () => abortRef.current?.abort() : openRun}
          >
            {running ? "停止" : "测试运行"}
          </Button>
        </div>
      </div>
      <main
        className={`wf-workspace ${leftCollapsed ? "left-collapsed" : ""} ${rightCollapsed ? "right-collapsed" : ""}`}
      >
        {!narrow && !leftCollapsed && library}
        {narrow && (
          <Drawer
            open={leftOpen}
            onClose={() => setLeftOpen(false)}
            slotProps={{ paper: { sx: { width: 290 } } }}
          >
            {library}
          </Drawer>
        )}
        <section className="wf-center">
          <div className="wf-canvas-toolbar">
            <div
              className="wf-view-tabs"
              role="tablist"
              aria-label="工作流视图"
            >
              <button
                role="tab"
                aria-selected={view === "canvas"}
                onClick={() => setView("canvas")}
              >
                <Workflow size={15} />
                工作流画布
              </button>
              <button
                role="tab"
                aria-selected={view === "source"}
                onClick={() => setView("source")}
              >
                <Code2 size={15} />
                工作流源码
              </button>
            </div>
            <div
              className="wf-canvas-actions"
              role="group"
              aria-label="画布布局与视图"
            >
              <span className="wf-tools-label">画布工具</span>
              {!narrow && (
                <Action
                  label={leftCollapsed ? "展开节点库" : "收起节点库"}
                  onClick={() => setLeftCollapsed(!leftCollapsed)}
                >
                  <PanelLeft size={18} />
                </Action>
              )}
              <Action
                label="自动整理布局"
                disabled={running || dirty}
                onClick={arrange}
              >
                <ListTree size={18} />
              </Action>
              {!narrow && (
                <Action
                  label={rightCollapsed ? "展开节点设置" : "收起节点设置"}
                  onClick={() => setRightCollapsed(!rightCollapsed)}
                >
                  <PanelRight size={18} />
                </Action>
              )}
              {narrow && (
                <Action label="打开节点库" onClick={() => setLeftOpen(true)}>
                  <PanelLeft size={18} />
                </Action>
              )}
              <Action
                label="全图总览"
                onClick={() =>
                  flowInstance.current?.fitView({
                    padding: 0.12,
                    duration: 180,
                  })
                }
              >
                <ScanLine size={17} />
              </Action>
              <Action
                label="可读缩放"
                onClick={() => {
                  const n = selected || flow.nodes[0];
                  if (n)
                    flowInstance.current?.setCenter(
                      n.position.x + 120,
                      n.position.y + 90,
                      { zoom: 1, duration: 180 },
                    );
                }}
              >
                <ZoomIn size={17} />
              </Action>
              {narrow && (
                <Action label="打开节点设置" onClick={() => setRightOpen(true)}>
                  <PanelRight size={18} />
                </Action>
              )}
            </div>
          </div>
          {view === "canvas" && (
            <AlignmentTools
              nodes={flowNodes}
              snap={snap}
              setSnap={setSnap}
              disabled={running || dirty}
              onArrange={arrange}
              onAlign={(next) =>
                change({
                  ...flow,
                  nodes: flow.nodes.map((n) => ({
                    ...n,
                    position: next.find((x) => x.id === n.id).position,
                  })),
                })
              }
            />
          )}
          {view === "canvas" ? (
            <div
              className="wf-canvas"
              ref={canvasRef}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const kind = e.dataTransfer.getData("application/atlas-node");
                if (kind)
                  add(
                    kind,
                    flowInstance.current?.screenToFlowPosition({
                      x: e.clientX,
                      y: e.clientY,
                    }),
                  );
              }}
            >
              <ReactFlow
                snapToGrid={snap}
                snapGrid={[20, 20]}
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onInit={(instance) => {
                  flowInstance.current = instance;
                  if (window.innerWidth <= 650)
                    setTimeout(() => {
                      const n =
                        flow.nodes.find((n) => n.id === selection) ||
                        flow.nodes[0];
                      if (n)
                        instance.setCenter(
                          n.position.x + 125,
                          n.position.y + 110,
                          { zoom: 0.85, duration: 0 },
                        );
                    }, 100);
                }}
                fitView={window.innerWidth > 650}
                fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
                ariaLabelConfig={{
                  "controls.zoomIn.ariaLabel": "放大画布",
                  "controls.zoomOut.ariaLabel": "缩小画布",
                  "controls.fitView.ariaLabel": "适合画布",
                }}
                minZoom={0.25}
                maxZoom={1.5}
                onMoveEnd={(_, v) => setZoom(Math.round(v.zoom * 100))}
                onNodeClick={(_, n) => choose(n.id)}
                onEdgeClick={(_, e) => {
                  if (running || !discard()) return;
                  setEdgeSelection(e.id);
                  setRightOpen(narrow);
                  setRightCollapsed(false);
                }}
                onPaneClick={() => setEdgeSelection(null)}
                nodesDraggable={
                  !running &&
                  !dirty &&
                  (dragging || sourceText === serializeWorkflow(flow))
                }
                nodesConnectable={!running}
                onConnect={(c) =>
                  link(c.source, c.target, c.sourceHandle || "out")
                }
                onNodeDragStart={() => {
                  dragStart.current = structuredClone(flow);
                  setDragNodes(flow.nodes);
                  setDragging(true);
                }}
                onNodeDragStop={(_, moved) => {
                  const live = flowInstance.current?.getNodes() || [];
                  const positions = new Map(
                    live.map((n) => [n.id, n.position]),
                  );
                  positions.set(moved.id, moved.position);
                  setFlow((f) => ({
                    ...f,
                    nodes: f.nodes.map((n) => ({
                      ...n,
                      position: positions.get(n.id) || n.position,
                    })),
                  }));
                  setDragNodes(null);
                  setDragging(false);
                  if (dragStart.current) {
                    const snapshot = dragStart.current;
                    setHistory((h) => [...h.slice(-39), snapshot]);
                    setFuture([]);
                    dragStart.current = null;
                  }
                }}
                onNodesChange={(changes) => {
                  const moves = changes.filter((c) => c.type === "position");
                  if (!running && moves.length) {
                    if (dragStart.current)
                      setDragNodes((ns) =>
                        applyNodeChanges(moves, ns || flow.nodes),
                      );
                    else
                      setFlow((f) => ({
                        ...f,
                        nodes: applyNodeChanges(moves, f.nodes),
                      }));
                  }
                }}
                deleteKeyCode={null}
                connectOnClick
              >
                <Background gap={22} size={1} color={tokens.line} />
                <Controls showInteractive={false} />
              </ReactFlow>
              <div className="wf-canvas-key">
                <span className="wf-key-line" />
                数据流
                <span className="wf-key-line dashed" />
                ELSE 分支
              </div>
              <button
                className="wf-floating-add"
                onClick={() => {
                  setLeftOpen(true);
                  setLibraryTab("library");
                  if (!narrow) setNotice("从左侧节点库点击或拖动节点到画布");
                }}
                disabled={running}
              >
                <Plus size={18} />
                添加节点
              </button>
            </div>
          ) : (
            <div className="wf-source">
              <div>
                <p>Atlas 工作流 JSON · 修改后应用到画布</p>
                <Button
                  variant="contained"
                  disabled={running || sourceText === serializeWorkflow(flow)}
                  onClick={() => {
                    try {
                      if (
                        dirty &&
                        !confirm("应用源码将放弃未应用的节点配置，是否继续？")
                      )
                        return;
                      const next = parseWorkflow(sourceText, "flow.json");
                      change(next);
                      setSelection(next.nodes[0]?.id);
                      setNotice("工作流源码已应用");
                    } catch (e) {
                      setNotice(e.message);
                    }
                  }}
                >
                  应用源码
                </Button>
              </div>
              <textarea
                spellCheck="false"
                aria-label="工作流源码编辑器"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                disabled={running}
              />
            </div>
          )}
          <div className={`wf-run-panel ${logsOpen ? "open" : ""}`}>
            <button
              className="wf-run-toggle"
              onClick={() => setLogsOpen(!logsOpen)}
              aria-expanded={logsOpen}
            >
              <Terminal size={16} />
              <strong>运行记录</strong>
              <span>
                {running
                  ? "正在执行"
                  : runError
                    ? "执行未完成"
                    : result !== null
                      ? "运行完成"
                      : "尚未运行"}
              </span>
              {runStale && <span>· 配置已变化</span>}
              <ChevronDown size={16} />
            </button>
            {logsOpen && (
              <div className="wf-run-content">
                <div className="wf-trace">
                  {trace.length ? (
                    trace.map((t) => (
                      <button
                        key={t.nodeId}
                        onClick={() => {
                          if (!running) {
                            choose(t.nodeId);
                            setTraceDetail(t.nodeId);
                          }
                        }}
                      >
                        <span className={`wf-trace-state ${t.status}`}>
                          {t.status === "success" ? (
                            <Check size={12} />
                          ) : (
                            t.step
                          )}
                        </span>
                        <span>{t.title}</span>
                        <small>
                          {t.branch
                            ? t.branch === "true"
                              ? "IF"
                              : "ELSE"
                            : t.status === "success"
                              ? "完成"
                              : t.status === "running"
                                ? "执行中"
                                : "中止"}
                        </small>
                      </button>
                    ))
                  ) : (
                    <p>点击“测试运行”，查看实际经过的节点。</p>
                  )}
                </div>
                <div className="wf-run-output">
                  <div>
                    <strong>{runError ? "运行提示" : "最终输出"}</strong>
                    {result !== null && (
                      <Action
                        label="下载运行结果"
                        onClick={() =>
                          downloadFile(
                            typeof result === "string"
                              ? result
                              : JSON.stringify(result, null, 2),
                            "workflow-result.md",
                          )
                        }
                      >
                        <ArrowDownToLine size={15} />
                      </Action>
                    )}
                  </div>
                  {traceDetail &&
                    trace.find((t) => t.nodeId === traceDetail) && (
                      <div className="trace-explanation">
                        <Button
                          size="small"
                          onClick={() => setTraceDetail(null)}
                        >
                          返回最终结果
                        </Button>
                        {(() => {
                          const t = trace.find((t) => t.nodeId === traceDetail);
                          return (
                            <>
                              <h4>{t.title}</h4>
                              <p>收到的信息</p>
                              <pre>
                                {typeof t.received === "string"
                                  ? t.received
                                  : JSON.stringify(t.received, null, 2)}
                              </pre>
                              {t.detail && (
                                <>
                                  <p>{t.detail.decision}</p>
                                  <pre>
                                    {t.detail.path} ={" "}
                                    {JSON.stringify(t.detail.actual)}；比较值 ={" "}
                                    {JSON.stringify(t.detail.expected)}
                                  </pre>
                                </>
                              )}
                              <p>本节点输出</p>
                              <pre>
                                {typeof t.output === "string"
                                  ? t.output
                                  : JSON.stringify(t.output, null, 2)}
                              </pre>
                              {t.references?.length > 0 && (
                                <p>
                                  引用：
                                  {t.references
                                    .map((r) => r.name + " / " + r.title)
                                    .join("、")}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  <pre hidden={!!traceDetail}>
                    {runError ||
                      (result !== null
                        ? typeof result === "string"
                          ? result
                          : JSON.stringify(result, null, 2)
                        : running
                          ? "等待执行结果…"
                          : "此处显示执行输出。")}
                  </pre>
                </div>
              </div>
            )}
          </div>
          <div className="wf-canvas-status">
            <span>
              {flow.nodes.length} 个节点 <b>·</b> {flow.edges.length} 条连线{" "}
              <b>·</b> {zoom}%
            </span>
            <button
              onClick={() => setDialog("validation")}
              className={validation.errors.length ? "has-errors" : ""}
            >
              {validation.errors.length ? (
                <>
                  <span className="wf-warning-dot" />
                  {validation.errors.length} 项待完善
                </>
              ) : (
                <>
                  <Check size={13} />
                  结构检查通过
                </>
              )}
              {validation.warnings.length > 0 &&
                ` · ${validation.warnings.length} 条提示`}
              <ChevronRight size={12} />
            </button>
          </div>
        </section>
        {!narrow && !rightCollapsed && inspector}
        {narrow && (
          <Drawer
            anchor="right"
            open={rightOpen}
            onClose={() => setRightOpen(false)}
            slotProps={{ paper: { sx: { width: "min(340px, 94vw)" } } }}
          >
            {inspector}
          </Drawer>
        )}
      </main>
      <footer className="wf-footer">
        <span>
          <i />
          Web 编辑器 · 本机运行
        </span>
        <span>拖动连接 / 点击节点编辑 / IF 与 ELSE 独立配置</span>
        <a href="/openapi.json" target="_blank" rel="noreferrer">
          接口文档
          <ArrowUpRight size={12} />
        </a>
      </footer>
      <input
        ref={fileInput}
        hidden
        type="file"
        accept=".json,.yml,.yaml,.md"
        onChange={(e) => {
          importFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <Dialog
        open={dialog === "run" || dialog === "input"}
        onClose={() => setDialog(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dialog === "run" ? "测试工作流" : "默认输入数据"}
        </DialogTitle>
        <DialogContent>
          <p className="wf-dialog-copy">
            填写任务信息。切换“需求信息完整”可测试两条分支。
          </p>
          <InputForm text={inputText} onChange={setInputText} />
          <div className="test-cases">
            <strong>测试样例</strong>
            <div className="test-case-buttons">
              {Object.hasOwn(flow.input, "ready") && (
                <>
                  <Button
                    size="small"
                    onClick={() =>
                      setInputText(
                        JSON.stringify({ ...flow.input, ready: true }, null, 2),
                      )
                    }
                  >
                    信息完整
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      setInputText(
                        JSON.stringify(
                          { ...flow.input, ready: false },
                          null,
                          2,
                        ),
                      )
                    }
                  >
                    信息不足
                  </Button>
                </>
              )}
              {(flow.testCases || []).map((c, i) => (
                <Button
                  key={i}
                  size="small"
                  onClick={() => setInputText(JSON.stringify(c.input, null, 2))}
                >
                  {c.name}
                </Button>
              ))}
            </div>
            <div className="case-save">
              <TextField
                label="样例名称"
                value={caseName}
                onChange={(e) => setCaseName(e.target.value)}
              />
              <Button
                disabled={!caseName.trim()}
                onClick={() => {
                  try {
                    const input = JSON.parse(inputText);
                    const next = normalizeWorkflow({
                      ...flow,
                      testCases: [
                        ...(flow.testCases || []).filter(
                          (c) => c.name !== caseName.trim(),
                        ),
                        { name: caseName.trim(), input },
                      ],
                    });
                    change(next);
                    setCaseName("");
                    setNotice("测试样例已保存到工作流");
                  } catch (e) {
                    setNotice(e.message);
                  }
                }}
              >
                保存样例
              </Button>
            </div>
          </div>
          {dialog === "run" && validation.errors.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {validation.errors[0]}
            </Alert>
          )}
          {dialog === "run" && flow.nodes.some((n) => n.data.kind === "ai") && (
            <Alert severity="info" sx={{ mt: 2 }}>
              此流程包含 AI 节点，执行到该节点时会发送对应内容到配置的服务。
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>取消</Button>
          <Button
            variant="contained"
            onClick={
              dialog === "run"
                ? run
                : () => {
                    try {
                      const input = JSON.parse(inputText);
                      if (
                        !input ||
                        typeof input !== "object" ||
                        Array.isArray(input)
                      )
                        throw Error("输入需要是对象");
                      change({ ...flow, input });
                      setDialog(null);
                    } catch (e) {
                      setNotice(e.message);
                    }
                  }
            }
          >
            {dialog === "run" ? "开始运行" : "保存默认输入"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialog === "export"}
        onClose={() => setDialog(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>导出工作流</DialogTitle>
        <DialogContent>
          <p className="wf-dialog-copy">
            本次包含 {flow.nodes.length} 个节点、{flow.edges.length} 条连线、
            {flow.documents?.length || 0} 份原文与 {flow.testCases?.length || 0}{" "}
            组测试样例。可重新导入 Atlas 继续编辑。不是 n8n / Dify 的执行文件。
          </p>
          <TextField
            fullWidth
            select
            label="格式"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            sx={{ mt: 1 }}
          >
            <MenuItem value="json">Atlas Workflow · JSON</MenuItem>
            <MenuItem value="yaml">Atlas Workflow · YAML</MenuItem>
            <MenuItem value="markdown">Markdown · 嵌入完整工作流</MenuItem>
          </TextField>
          {dirty && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              请先应用节点修改。
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>取消</Button>
          <Button
            variant="contained"
            disabled={dirty || sourceText !== serializeWorkflow(flow)}
            onClick={() => {
              downloadFile(
                serializeWorkflow(flow, exportFormat),
                flow.name.replace(/[<>:"/\\|?*]/g, "_") +
                  ".flow." +
                  { json: "json", yaml: "yaml", markdown: "md" }[exportFormat],
              );
              setDialog(null);
              setNotice("工作流已下载；关联原文可在内容库单独导出回源");
            }}
          >
            下载工作流
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialog === "versions"}
        onClose={() => setDialog(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>浏览器内的命名版本</DialogTitle>
        <DialogContent>
          <p>
            保存当前工作流、关联文档和测试样例。最多保留最近 10
            个版本；清除浏览器数据会删除这些版本，请定期导出备份。
          </p>
          <div className="case-save">
            <TextField
              fullWidth
              label="版本名称"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
            />
            <Button
              disabled={
                !versionName.trim() ||
                dirty ||
                sourceText !== serializeWorkflow(flow)
              }
              onClick={() => {
                try {
                  const next = [
                    {
                      name: versionName.trim(),
                      time: new Date().toISOString(),
                      flow: normalizeWorkflow(flow),
                    },
                    ...versions,
                  ].slice(0, 10);
                  localStorage.setItem(
                    "atlas.flow.versions",
                    JSON.stringify(next),
                  );
                  setVersions(next);
                  setVersionName("");
                  setNotice("命名版本已保存到此浏览器");
                } catch (e) {
                  setNotice("保存版本失败，请导出备份：" + e.message);
                }
              }}
            >
              保存版本
            </Button>
          </div>
          <div className="version-list">
            {versions.length ? (
              versions.map((v, i) => (
                <div key={i}>
                  <span>
                    <strong>{v.name}</strong>
                    <small>{new Date(v.time).toLocaleString()}</small>
                  </span>
                  <Button
                    onClick={() => {
                      if (!discard()) return;
                      try {
                        change(normalizeWorkflow(v.flow));
                        setSelection(v.flow.nodes[0]?.id);
                        setDialog(null);
                        setNotice("已恢复版本；可以撤销此操作");
                      } catch (e) {
                        setNotice(e.message);
                      }
                    }}
                  >
                    恢复
                  </Button>
                  <Action
                    label={"删除版本 " + v.name}
                    onClick={() => {
                      try {
                        const next = versions.filter((_, j) => j !== i);
                        localStorage.setItem(
                          "atlas.flow.versions",
                          JSON.stringify(next),
                        );
                        setVersions(next);
                      } catch (e) {
                        setNotice(e.message);
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </Action>
                </div>
              ))
            ) : (
              <p>还没有保存的版本。</p>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialog === "api"}
        onClose={() => setDialog(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>模型接口</DialogTitle>
        <DialogContent>
          <p className="wf-dialog-copy">
            基础流程在本地执行。AI 分析节点使用 Chat Completions
            兼容服务；密钥不进入工作流文件。
          </p>
          <div className="wf-api-fields">
            <TextField
              label="Base URL"
              value={config.baseUrl}
              onChange={(e) =>
                setConfig({ ...config, baseUrl: e.target.value })
              }
              placeholder="https://provider.example/v1"
            />
            <TextField
              label="模型名称"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
            />
            <TextField
              label="API Key"
              type="password"
              autoComplete="off"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>完成</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialog === "validation"}
        onClose={() => setDialog(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>工作流检查</DialogTitle>
        <DialogContent>
          <div className="wf-validation-list">
            {!validation.errors.length && !validation.warnings.length && (
              <Alert severity="success">
                节点、连线和条件结构有效，可以测试运行。
              </Alert>
            )}
            {validation.errors.map((m, i) => (
              <Alert key={i} severity="error">
                {m}
              </Alert>
            ))}
            {validation.warnings.map((m, i) => (
              <Alert key={i} severity="warning">
                {m}
              </Alert>
            ))}
          </div>
          <p className="wf-dialog-copy">
            当前支持单路径顺序执行与条件分支。并行调度、循环和任意代码执行尚未启用。
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialog === "new"}
        onClose={() => setDialog(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>新建工作流</DialogTitle>
        <DialogContent>
          <p className="wf-dialog-copy">
            当前流程可通过撤销恢复，也可以先导出备份。
          </p>
          <div className="wf-new-options">
            <Button
              variant="outlined"
              onClick={() => {
                if (!discard()) return;
                const next = blankWorkflow();
                change(next);
                setSelection(next.nodes[0].id);
                setDialog(null);
                setTrace([]);
                setResult(null);
              }}
            >
              空白工作流
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                if (!discard()) return;
                change(demoWorkflow());
                setSelection("check");
                setDialog(null);
                setTrace([]);
                setResult(null);
              }}
            >
              设计协作示例
            </Button>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>取消</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!notice}
        autoHideDuration={5000}
        message={notice}
        onClose={() => setNotice("")}
        action={
          <IconButton
            aria-label="关闭提示"
            color="inherit"
            onClick={() => setNotice("")}
          >
            <X size={17} />
          </IconButton>
        }
      />
    </div>
  );
}
