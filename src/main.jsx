import {editableContent,preserveSectionKind} from './sectionContent.js';
import AnimatedFlow from './AnimatedFlow.jsx';
import IntegrationHub from "./IntegrationHub.jsx";
import AgentLibrary, {Brand, Opening} from "./AgentLibrary.jsx";
import useConnectionMonitor from "./useConnectionMonitor.js";
import ShortcutSettings from "./ShortcutSettings.jsx";
import ConnectionCheck from "./ConnectionCheck.jsx";
import ProjectSupport from './ProjectSupport.jsx';
import ChapterHistory from "./ChapterHistory.jsx";
import { DEFAULT_KEYS, keyCombo } from "./shortcuts.js";
import { appendRevision } from "./revisions.js";
import MorphDialog from "./MorphDialog.jsx";
import ChapterChart from "./ChapterChart.jsx";
import RuleEditor from "./RuleEditor.jsx";
import AlignmentTools from "./AlignmentTools.jsx";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CssBaseline,
  Button,
  IconButton,
  TextField,
  Chip,
  Tooltip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Select,
  Switch,
  FormControlLabel,
  Drawer,
  useMediaQuery,
} from "@mui/material";
import {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useUpdateNodeInternals,
} from "@xyflow/react";
import {
  Layers,
  LayoutDashboard,
  ListChecks,
  Palette,
  Upload,
  Download,
  Network,
  FileCode2,
  GitCompareArrows,
  Search,
  Plus,
  Undo2,
  Redo2,
  Settings2,
  Check,
  ChevronRight,
  FileText,
  Link2,
  Braces,
  PanelLeftClose,
  PanelRightClose,
  Maximize2,
  ShieldCheck,
  ArrowUpRight,
  RotateCcw,
  FolderOpen,
  ScanLine,
  X,
  BookOpen,
  Plug,
  Info,
  Copy,
  Trash2,
} from "lucide-react";
import { diffLines } from "diff";
import {
  analyze,
  addDocumentNode,
  addRelatedNode,
  insertLinkedParent,
  setSectionKind,
  NODE_KINDS,
  editSection,
  makeGraph,
  formats,
  exportDocument,
  importFile,
} from "./document";
import "@xyflow/react/dist/style.css";
import "./style.css";

import "./expressive.css";
import "./reloom.css";
import "./m3-refinement.css";
import { restoreEditorNewlines } from "./document.js";
import {
  AppearanceProvider,
  AppearanceButton,
  useAppearance,
} from "./Appearance.jsx";

const colors = {
  上下文: "#e1ece6",
  规则: "#f3e8cf",
  流程: "#dce8f4",
  项目: "#e9e1ef",
  工具: "#d8eeeb",
  指令: "#e9ece5",
};
// Solid tint for the minimap: translucent shapes read as structure, the accent marks the selection.
function withAlpha(hex, alpha) {
  const h = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return hex;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
function IconAction({ label, children, onClick, disabled = false }) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          aria-label={label}
          size="small"
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}
const kindIcons = {
  指令: FileText,
  上下文: Layers,
  环境: Settings2,
  功能: LayoutDashboard,
  输入: Braces,
  输出: ArrowUpRight,
  规则: ShieldCheck,
  流程: Network,
  工具: Plug,
  条件: GitCompareArrows,
  分支: Link2,
  记忆: BookOpen,
  验证: ScanLine,
  项目: FolderOpen,
};
function KindIcon({ kind }) {
  const Icon = kindIcons[kind] || FileText;
  return <Icon size={16} data-kind-icon={kind} />;
}
function SectionNode({ id, data, selected }) {
  const [kindAnchor,setKindAnchor]=useState(null);
  const [editing,setEditing]=useState(false),[editTitle,setEditTitle]=useState(""),[editBody,setEditBody]=useState("");
  function startEditing(e){e.stopPropagation();if(!data.inlineEdit || data.beginEdit?.() === false)return;setEditTitle(data.title);setEditBody(editableContent(data.content||""));setEditing(true)}
  useEffect(()=>{setEditing(false)},[data.title,data.content]);
  useEffect(()=>{if(editing && (editTitle!==data.title || editBody!==editableContent(data.content))) data.markDraft?.(()=>setEditing(false));else data.markDraft?.(null);return()=>data.markDraft?.(null)},[editing,editTitle,editBody,data.title,data.content]);

  return (
    <div
      className={`section-node direction-${data.direction} ${selected ? "selected" : ""}`}
    >
      <Handle
        type="target"
        position={data.direction === "vertical" ? Position.Top : Position.Left}
      />
      <div className="node-top">
        <span
          className="node-symbol"
          title="拖动节点"
          style={{ background: colors[data.kind] || "#e4ebe5" }}
        >
          <KindIcon kind={data.kind} />
        </span>
        {data.changeKind ? (
          <>
            <button className="node-kind-trigger nodrag nopan" role="combobox" aria-label={"更换节点类型："+data.title} aria-expanded={!!kindAnchor} aria-haspopup="listbox" onClick={e=>{e.stopPropagation();setKindAnchor(e.currentTarget)}}>{data.kind}<span aria-hidden="true">▾</span></button>
            {kindAnchor && <Menu open anchorEl={kindAnchor} onClose={()=>setKindAnchor(null)} onClick={e=>e.stopPropagation()} anchorOrigin={{vertical:'bottom',horizontal:'left'}} transformOrigin={{vertical:'top',horizontal:'left'}} slotProps={{paper:{className:'kind-menu'},list:{role:'listbox','aria-label':'节点类型'}}}>
              {NODE_KINDS.map(k=><MenuItem key={k} role="option" aria-selected={k===data.kind} selected={k===data.kind} onClick={()=>{setKindAnchor(null);data.changeKind(k)}}><KindIcon kind={k}/><span>{k}</span></MenuItem>)}
            </Menu>}
          </>
        ) : (
          <span>{data.kind}</span>
        )}
        <span className="node-index">
          {data.line ? `L${data.line}` : "NODE"}
        </span>
      </div>
      {data.addRelated && (
        <div className="node-attachments nodrag nopan">
          <button
            className="attach-left"
            title="在入线插入父节点"
            aria-label={"入线添加：" + data.title}
            onClick={(e) => {
              e.stopPropagation();
              data.addRelated("parent");
            }}
          >
            ＋
          </button>
          <button
            className="attach-right"
            title="添加子节点"
            aria-label={"添加子节点：" + data.title}
            disabled={!data.canAdd}
            onClick={(e) => {
              e.stopPropagation();
              data.addRelated("child");
            }}
          >
            ＋
          </button>
        </div>
      )}
      <strong className="node-editable nodrag" role={data.inlineEdit ? "button" : undefined} tabIndex={data.inlineEdit ? 0 : undefined} aria-label={"编辑节点文字："+data.title} onClick={startEditing} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();startEditing(e)}}}>{data.title}</strong>
      <p className="node-editable nodrag" onClick={startEditing}>{data.preview || "点击填写内容"}</p>
      {editing && <div className="node-inline-editor nodrag nopan nowheel" onClick={e=>e.stopPropagation()} onKeyDown={e=>{e.stopPropagation();if(e.key==="Escape")setEditing(false)}}><input aria-label="节点标题" disabled={data.style === "plain"} autoFocus value={editTitle} onChange={e=>setEditTitle(e.target.value)}/><textarea aria-label="节点正文" value={editBody} onChange={e=>setEditBody(e.target.value)}/><div><button onClick={()=>setEditing(false)}>取消</button><button onClick={()=>{if(data.inlineEdit(editTitle,editBody))setEditing(false)}}>保存到原文</button></div></div>}
      <div className="node-bottom">
        <span>{data.content?.length || 0} 字符</span>
        {data.addRelated && (
          <button
            className="attach-branch nodrag nopan"
            disabled={!data.canAdd}
            onClick={(e) => {
              e.stopPropagation();
              data.addRelated("branch");
            }}
          >
            ＋ IF / ELSE
          </button>
        )}
        {data.hasChildren && (
          <button
            className="nodrag nopan node-fold"
            aria-label={(data.collapsed ? "展开" : "收起") + data.title}
            onClick={(e) => {
              e.stopPropagation();
              data.toggle();
            }}
          >
            {data.collapsed ? "展开子节点" : "收起子节点"}
          </button>
        )}
      </div>
      <Handle
        type="source"
        position={
          data.direction === "vertical" ? Position.Bottom : Position.Right
        }
      />
    </div>
  );
}
function GraphInternals({direction}) {
 const update=useUpdateNodeInternals();
 useEffect(()=>{update([...document.querySelectorAll('.react-flow__node')].map(el=>el.dataset.id))},[direction,update]);
 return null;
}
const nodeTypes = { section: React.memo(SectionNode,(a,b)=>a.id===b.id&&a.data===b.data&&a.selected===b.selected) };
const empty = {
  name: "AGENTS.md",
  source:
    "# 新的 Agent\n\n## 角色与目标\n\n描述 Agent 的目标与服务对象。\n\n## 执行规则\n\n- 根据实际结果判断下一步。\n- 完成后检查输出是否满足目标。\n\n## 工具与权限\n\n列出允许使用的工具及权限边界。\n",
  original: "",
  positions: {},
};
// v0.16.1 — the built-in designer memory is gone; only the user's own documents remain.
const builtinMemoryName = "设计师协作记忆.md";
function isBuiltinMemory(d) {
  return (
    !!d &&
    d.name === builtinMemoryName &&
    typeof d.source === "string" &&
    d.source.startsWith("**我的设计师 Context") &&
    (!d.original || d.original === d.source)
  );
}
function readLibrary() {
  try {
    const list = JSON.parse(localStorage.getItem("atlas.library.v1") || "[]");
    return Array.isArray(list)
      ? list.filter(
          (d) =>
            d &&
            typeof d.id === "string" &&
            typeof d.source === "string" &&
            typeof d.name === "string",
        )
      : [];
  } catch {
    return [];
  }
}
function writeLibrary(list) {
  localStorage.setItem("atlas.library.v1", JSON.stringify(list));
}
function App() {
  const inlineDraft = useRef(null);
  const [immersive, setImmersive] = useState(false);
  const [floatingTools,setFloatingTools]=useState(false);
  const [navOpen, setNavOpen] = useState(
    () => localStorage.getItem("reloom.minimap") !== "off" && window.innerWidth > 650,
  );
  const beforeImmersive=useRef({left:true,right:true});
  function exitImmersive(){setImmersive(false);setFloatingTools(false);setLeft(beforeImmersive.current.left);setRight(beforeImmersive.current.right)}
  const animateLayout = useRef(false);
  useEffect(()=>{const exit=e=>{if(e.key === "Escape" && immersive && !document.querySelector('[role="dialog"]'))exitImmersive()};window.addEventListener("keydown",exit);return()=>window.removeEventListener("keydown",exit)},[immersive]);
  const [shortcuts, setShortcuts] = useState(() => {
    try {
      return {
        ...DEFAULT_KEYS,
        ...JSON.parse(localStorage.getItem("atlas.shortcuts.v1") || "{}"),
      };
    } catch {
      return DEFAULT_KEYS;
    }
  });
  const [shortcutOpen, setShortcutOpen] = useState(false),
    [connectionsOpen, setConnectionsOpen] = useState(false),
    [supportOpen, setSupportOpen] = useState(false),
    [historyOpen, setHistoryOpen] = useState(false);

  const [library, setLibrary] = useState(() =>
    readLibrary().filter((d) => !isBuiltinMemory(d)),
  );
  const libraryRef = useRef(library);
  function updateCard(id, patch) {
    const next = libraryRef.current.map(d=>d.id===id?{...d,...patch}:d);
    writeLibrary(next);
    libraryRef.current=next;setLibrary(next);
    if(doc?.id===id)setDoc(d=>({...d,...patch}));
  }
  function switchDocument(id) {
    if (!allowDiscard()) return;
    const next = libraryRef.current.find((d) => d.id === id);
    if (!next) return;
    setDoc(next);
    setHistory([]);
    setFuture([]);
    selectedRef.current = null;
    setSelected(null);
    setSearch("");
    setCategory("全部");
    setCollapsed([]);
    setDraftDirty(false);
  }
  function newDocument() {
    replace({
      ...empty,
      name: `未命名-${libraryRef.current.length + 1}.md`,
      original: empty.source,
    });
  }
  function deleteDocument(id) {
    const target = libraryRef.current.find((d) => d.id === id);
    if (!target) return;
    if (doc?.id === id && hasDraft())
      if (!window.confirm("这份记忆有尚未应用的编辑，删除后会一并丢失。是否继续？"))
        return;
    const next = libraryRef.current.filter((d) => d.id !== id);
    writeLibrary(next);
    libraryRef.current = next;
    setLibrary(next);
    if (doc?.id === id) {
      setDoc(null);
      setHistory([]);
      setFuture([]);
      selectedRef.current = null;
      setSelected(null);
      setDraftDirty(false);
      setSourceDraft("");
      localStorage.removeItem("atlas.workspace.v1");
      setSaveState("已删除当前记忆");
      setTab("agents");
      window.history.replaceState(null, "", "#agents");
    }
    setNotice(`已删除记忆「${target.name}」`);
  }
  function requestDeleteDocument(id) {
    const target = libraryRef.current.find((d) => d.id === id);
    if (!target) return;
    if (
      window.confirm(
        `删除记忆「${target.name}」？删除后无法恢复，需要保留请先导出文件。`,
      )
    )
      deleteDocument(id);
  }

  const { tokens, openSettings } = useAppearance();
  const [collapsed, setCollapsed] = useState([]);
  const [direction, setDirection] = useState("horizontal");
  const [focusTarget, setFocusTarget] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [motionOrigin, setMotionOrigin] = useState(null);
  const [detail, setDetail] = useState(null);
  const [sharedTitle, setSharedTitle] = useState(null);
  function showDetail(section, element) {
    const heading = element.closest(".review-card")?.querySelector("h3");
    setSharedTitle(
      heading
        ? {
            text: section.title,
            rect: heading.getBoundingClientRect(),
            fontSize: getComputedStyle(heading).fontSize,
          }
        : null,
    );
    setMotionOrigin(
      element.closest(".review-card")?.getBoundingClientRect() ||
        element.getBoundingClientRect(),
    );
    setDetail(section);
  }
  const [category, setCategory] = useState("全部");
  useEffect(() => {
    const changed = () =>
      setTab(
        { "#workflow": "graph", "#source": "source", "#diff": "diff", "#agents": "agents", "#documents": "overview" }[
          location.hash
        ] || "agents",
      );
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  const [snap, setSnap] = useState(true);
  const dragSnapshot = useRef(null);
  const narrow = useMediaQuery("(max-width:900px)");
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [doc, setDoc] = useState(null),
    [tab, setTab] = useState(
      { "#workflow": "graph", "#source": "source", "#diff": "diff", "#agents": "agents", "#documents": "overview" }[
        location.hash
      ] || "agents",
    ),
    [selected, setSelected] = useState(null),
    [search, setSearch] = useState(""),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [draftDirty, setDraftDirty] = useState(false),
    [notice, setNotice] = useState(""),
    [dialog, setDialog] = useState(null),
    [exportMode, setExportMode] = useState("source"),
    [paste, setPaste] = useState(""),
    [pasteName, setPasteName] = useState("AGENTS.md"),
    [full, setFull] = useState(true),
    [left, setLeft] = useState(true),
    [right, setRight] = useState(window.innerWidth > 900),
    [nodes, setNodes] = useState([]),
    [history, setHistory] = useState([]),
    [future, setFuture] = useState([]),
    [saveState, setSaveState] = useState("正在载入"),
    [config, setConfig] = useState({ baseUrl: "", model: "", apiKey: "" }),
    [aiResult, setAiResult] = useState(""),
    [busy, setBusy] = useState(false),
    [apiState, setApiState] = useState("检测中"),
    [sourceDraft, setSourceDraft] = useState("");
  const connection = useConnectionMonitor(config);
  const previousConnection = useRef(null);
  useEffect(()=>{
    if(connection.status.state === "error" && previousConnection.current !== "error" && !connection.muted) setNotice("连接异常：" + connection.status.message);
    previousConnection.current = connection.status.state;
  },[connection.status.state, connection.status.message, connection.muted]);
  const fileRef = useRef(),
    flowRef = useRef(),
    canvasRef = useRef(),
    graphRef = useRef(),
    selectedRef = useRef(null);
  const parsed = useMemo(() => {
    if (!doc) return null;
    try {
      return analyze(doc.source, doc.name);
    } catch (e) {
      return { error: e.message, sections: [], edges: [], issues: [] };
    }
  }, [doc?.source, doc?.name]);
  const current = parsed?.sections.find((s) => s.id === selected);
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    const stored = readLibrary();
    const clean = stored.filter((d) => !isBuiltinMemory(d));
    if (clean.length !== stored.length) writeLibrary(clean);
    try {
      const saved = localStorage.getItem("atlas.workspace.v1");
      if (saved) {
        const p = JSON.parse(saved);
        if (isBuiltinMemory(p)) {
          localStorage.removeItem("atlas.workspace.v1");
        } else {
          analyze(p.source, p.name);
          setDoc({ ...p, id: p.id || crypto.randomUUID() });
          setSaveState("已恢复本地草稿");
        }
      }
    } catch {}
    setBooted(true);
    fetch("/api/health")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(() => setApiState("本地 API 已连接"))
      .catch(() => setApiState("本地 API 未连接"));
  }, []);
  useEffect(() => {
    if (!doc) return;
    try {
      const next = libraryRef.current.some((d) => d.id === doc.id)
        ? libraryRef.current.map((d) => (d.id === doc.id ? doc : d))
        : [...libraryRef.current, doc];
      libraryRef.current = next;
      setLibrary(next);
      writeLibrary(next);
      localStorage.setItem("atlas.workspace.v1", JSON.stringify(doc));
      setSaveState("已保存到此浏览器");
    } catch {
      setSaveState("本地保存失败，请导出备份");
    }
  }, [doc]);
  useEffect(() => {
    if (doc) setSourceDraft(doc.source);
  }, [doc?.source, doc?.name]);
  useEffect(() => {
    if (!parsed) return;
    let section =
      parsed.sections.find((s) => s.id === selectedRef.current) ||
      parsed.sections.find((s) => s.style !== "plain") ||
      parsed.sections[0];
    setSelected(section?.id || null);
  }, [parsed]);
  useEffect(() => {
    selectedRef.current = selected;
    if (current) {
      setTitle(current.title);
      setBody(editableContent(current.content));
      setDraftDirty(false);
    }
  }, [selected, doc?.source]);
  const graphActions=useRef({});graphActions.current={nodeAction,allowDiscard,choose,saveInline,changeNodeKind};
  const graph = useMemo(() => {
    if (!parsed) return { nodes: [], edges: [] };
    let p = parsed;
    if (parsed.format === "markdown" && !full) {
      const visible = parsed.sections.filter(
        (s) => s.level <= 2 && s.style !== "plain",
      );
      p = {
        ...parsed,
        sections: visible.length ? visible : parsed.sections,
        edges: parsed.edges.filter(
          (e) =>
            visible.some((s) => s.id === e.source) &&
            visible.some((s) => s.id === e.target),
        ),
      };
    }
    const hidden = new Set();
    function hide(id) {
      for (const e of p.edges.filter((e) => e.source === id)) {
        if (!hidden.has(e.target)) {
          hidden.add(e.target);
          hide(e.target);
        }
      }
    }
    collapsed.forEach(hide);
    p = {
      ...p,
      sections: p.sections.filter((s) => !hidden.has(s.id)),
      edges: p.edges.filter(
        (e) => !hidden.has(e.source) && !hidden.has(e.target),
      ),
    };
    const g = makeGraph(p, {});
    g.nodes = g.nodes.map((n) => ({
      ...n,
      position:
        doc?.positions?.[n.id] ||
        (direction === "vertical" && parsed.format === "markdown"
          ? { x: (n.position.y * 320) / 260, y: (n.position.x * 290) / 340 }
          : n.position),
      data: {
        ...n.data,
        preview: n.data.preview?.replace(/<!-- atlas-kind: .*? -->/g, ""),
        canAdd: n.data.style !== "plain" && n.data.level < 6,
        addRelated:
          parsed.format === "markdown"
            ? (mode) => graphActions.current.nodeAction(n.id, mode)
            : null,
        beginEdit: ()=>{if(!graphActions.current.allowDiscard())return false;graphActions.current.choose(n.id);return true},
        markDraft: cancel=>{inlineDraft.current=cancel},
        inlineEdit: parsed.format === "markdown" ? (title,content)=>graphActions.current.saveInline(n.id,title,content) : null,
        changeKind:
          parsed.format === "markdown"
            ? (kind) => graphActions.current.changeNodeKind(n.id, kind)
            : null,
        direction,
        collapsed: collapsed.includes(n.id),
        hasChildren:
          parsed.format === "markdown" &&
          parsed.edges.some((e) => e.source === n.id),
        toggle: () =>
          setCollapsed((ids) =>
            ids.includes(n.id)
              ? ids.filter((id) => id !== n.id)
              : [...ids, n.id],
          ),
      },
    }));
    g.edges = g.edges.map((e) => {
      const target = parsed.sections.find((s) => s.id === e.target);
      return {
        ...e,
        label: /^IF ·/.test(target?.title)
          ? "IF"
          : /^ELSE ·/.test(target?.title)
            ? "ELSE"
            : undefined,
      };
    });
    return g;
  }, [
    parsed,
    full,
    doc?.positions,
    collapsed,
    direction,
  ]);
  graphRef.current = graph;
  // Shape the overview map to the graph: tall trees get height, wide ones get width.
  const navSize = useMemo(() => {
    const ns = graph.nodes || [];
    if (!ns.length) return { width: 184, height: 120 };
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of ns) {
      const w = n.width || 260;
      const h = n.height || 190;
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + w);
      maxY = Math.max(maxY, n.position.y + h);
    }
    const ratio = Math.max(
      0.25,
      Math.min(4, (maxX - minX) / Math.max(1, maxY - minY)),
    );
    const maxW = 196,
      maxH = 148,
      minSide = 96;
    let width = maxW;
    let height = Math.round(maxW / ratio);
    if (height > maxH) {
      height = maxH;
      width = Math.round(maxH * ratio);
    }
    return {
      width: Math.max(minSide, Math.min(maxW, width)),
      height: Math.max(minSide, Math.min(maxH, height)),
    };
  }, [graph.nodes]);
  useEffect(() => {
    setCollapsed([]);
  }, [doc?.source]);
  useEffect(() => {
    if (!focusTarget || tab !== "graph") return;
    const frame = requestAnimationFrame(() => {
      selectedRef.current = focusTarget;
      focusSection();
      setFocusTarget(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusTarget, graph, tab]);
  function focusSection(duration = 180) {
    const node =
      graphRef.current?.nodes.find((n) => n.id === selectedRef.current) ||
      graphRef.current?.nodes[0];
    if (!node || !flowRef.current || !canvasRef.current) return;
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;
    // Keep the selected chapter readable; overview is an explicit action.
    flowRef.current.setViewport(
      {
        x:
          width < 500
            ? (width - 260) / 2 - node.position.x
            : 36 - node.position.x,
        y: Math.min(65, height * 0.14) - node.position.y,
        zoom: 1,
      },
      { duration: matchMedia("(prefers-reduced-motion: reduce)").matches?0:duration },
    );
  }
  useEffect(() => {
    const unload = (e) => {
      if (!doc) return;
      if (inlineDraft.current || draftDirty || sourceDraft !== doc.source) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [draftDirty, sourceDraft, doc]);
  function hasDraft() {
    return !!doc && (!!inlineDraft.current || draftDirty || sourceDraft !== doc.source);
  }
  function allowDiscard() {
    if (!hasDraft()) return true;
    if (!window.confirm("有尚未应用的编辑，是否放弃这些编辑？")) return false;
    inlineDraft.current?.();inlineDraft.current=null;
    setSourceDraft(doc.source);
    setDraftDirty(false);
    if (current) {
      setTitle(current.title);
      setBody(editableContent(current.content));
    }
    return true;
  }
  function commit(next) {
    setHistory((h) => [...h.slice(-39), doc]);
    setFuture([]);
    setDoc(appendRevision(doc, next));
    setDraftDirty(false);
  }
  function replace(next) {
    if (!allowDiscard()) return;
    setDoc({ ...next, id: crypto.randomUUID() });
    setHistory([]);
    setFuture([]);
    setDraftDirty(false);
    setSelected(null);
    setCategory("全部");
    setSearch("");
    selectedRef.current = null;
    setDialog(null);
    setNotice(`已导入 ${next.name}`);
  }
  async function readFile(file) {
    if (!file) return;
    try {
      if (file.size > 4 * 1024 * 1024)
        throw Error("文件超过 4 MB，请拆分后导入。");
      replace(importFile(await file.text(), file.name));
    } catch (e) {
      setNotice(e.message);
    }
  }
  function choose(id, locate = false) {
    if (id !== selected && !allowDiscard()) return;
    if (!graph.nodes.some((n) => n.id === id)) setFull(true);
    if (locate) {
      setCollapsed([]);
      setFull(true);
      setFocusTarget(id);
    }
    setSelected(id);
    setRight(true);
    setDirectoryOpen(false);
  }
  function changeNodeKind(id, kind) {
    if (!allowDiscard()) return;
    try {
      commit({
        ...doc,
        source: setSectionKind(doc.source, doc.name, id, kind),
      });
      setSelected(id);
    } catch (e) {
      setNotice(e.message);
    }
  }
  function nodeAction(id, mode) {
    if (!allowDiscard()) return;
    try {
      const next =
        mode === "parent"
          ? insertLinkedParent(doc.source, doc.name, id)
          : addRelatedNode(doc.source, doc.name, id, mode);
      commit({ ...doc, source: next.source, positions: {} });
      selectedRef.current = next.sectionId;
      setSelected(next.sectionId);
      setFull(true);
      setCollapsed([]);
      setFocusTarget(next.sectionId);
      setRight(true);
      setNotice(
        mode === "branch"
          ? "IF / ELSE 已写入原文；请填写条件与步骤。"
          : "新节点已写入原文。",
      );
    } catch (e) {
      setNotice(e.message);
    }
  }
  function addLinkedNode(parentId = null) {
    if (!allowDiscard()) return;
    try {
      const next = addDocumentNode(doc.source, doc.name, parentId);
      commit({ ...doc, source: next.source, positions: {} });
      setSelected(next.sectionId);
      selectedRef.current = next.sectionId;
      setFull(true);
      setRight(true);
      setNotice("节点已添加，原文中已生成对应标题。");
    } catch (e) {
      setNotice(e.message);
    }
  }
  function apply() {
    try {
      commit({
        ...doc,
        source: editSection(doc.source, doc.name, selected, title, preserveSectionKind(current.content,body)),
      });
      setNotice("已更新原文，可在修改对照中检查。");
    } catch (e) {
      setNotice(e.message);
    }
  }
  function undo() {
    if (!history.length || !allowDiscard()) return;
    setFuture((f) => [doc, ...f]);
    setDoc(
      appendRevision(doc, { ...history.at(-1), revisions: doc.revisions }),
    );
    setHistory((h) => h.slice(0, -1));
    setDraftDirty(false);
  }
  function redo() {
    if (!future.length || !allowDiscard()) return;
    setHistory((h) => [...h, doc]);
    setDoc(appendRevision(doc, { ...future[0], revisions: doc.revisions }));
    setFuture((f) => f.slice(1));
    setDraftDirty(false);
  }
  function download() {
    try {
      if (hasDraft()) throw Error("请先应用或撤销尚未应用的编辑，再导出。");
      const result = exportDocument(
        doc.source,
        doc.name,
        exportMode,
        doc.original,
        doc.positions,
      );
      const url = URL.createObjectURL(
        new Blob([result.text], { type: "text/plain;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = result.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDialog(null);
      setNotice(`已导出 ${result.name}`);
    } catch (e) {
      setNotice(e.message);
    }
  }
  async function runAI() {
    if (!config.baseUrl || !config.model) {
      setNotice("请填写接口地址与模型名称。");
      return;
    }
    setBusy(true);
    setAiResult("");
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, source: doc.source }),
      });
      const p = await r.json();
      if (!r.ok) throw Error(p.error || "接口请求失败");
      setAiResult(p.content);
    } catch (e) {
      setAiResult(`请求失败：${e.message}`);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const handler = (e) => {
      if (
        e.repeat ||
        e.isComposing ||
        e.target.closest(
          'input,textarea,select,[contenteditable="true"],[role="dialog"]',
        ) ||
        dialog ||
        rulesOpen ||
        detail ||
        shortcutOpen ||
        connectionsOpen || supportOpen ||
        historyOpen
      )
        return;
      const combo = keyCombo(e),
        action = Object.keys(shortcuts).find((k) => shortcuts[k] === combo);
      if (!action) return;
      e.preventDefault();
      if (action === "undo") undo();
      if (action === "redo") redo();
      if (action === "graph") {
        setTab("graph");
        window.history.replaceState(null, "", "#workflow");
      }
      if (action === "source") {
        setTab("source");
        window.history.replaceState(null, "", "#source");
      }
      if (action === "settings") setShortcutOpen(true);
      if (["child","tools","branch"].includes(action)) {
        if(tab!=="graph" || !current || parsed.format!=="markdown") {setNotice("请在工作流中选择 Markdown 节点。");return;}
        if(action==="child") addLinkedNode(current.id);
        if(action==="tools" && allowDiscard())setRulesOpen(true);
        if(action==="branch") nodeAction(current.id,"branch");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  if (!booted)
    return (
      <div className="boot">
        <Layers size={36} />
        <h1>Agent Atlas</h1>
        <p>正在准备工作区…</p>
      </div>
    );
  const items = parsed
    ? parsed.sections.filter(
        (s) =>
          (category === "全部" || s.kind === category) &&
          (s.title + " " + s.content)
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
    : [];
  const categories = parsed
    ? ["全部", ...new Set(parsed.sections.map((s) => s.kind))]
    : ["全部"];
  const destinations = [
    ["overview", LayoutDashboard, "文档总览"],
    ["graph", Network, "文档工作流"],
    ["source", FileCode2, "指令原文"],
    ["diff", GitCompareArrows, "修改检阅"],
  ];
  function saveInline(id,title,content) {
    // This save owns the inline draft; only competing inspector/source edits need confirmation.
    const pending=inlineDraft.current;inlineDraft.current=null;
    if(!allowDiscard()){inlineDraft.current=pending;return false}
    if(!title.trim()){inlineDraft.current=pending;setNotice("章节名称不能为空");return false}
    try {const source=editSection(doc.source,doc.name,id,title,preserveSectionKind(parsed.sections.find(s=>s.id===id)?.content,content));commit({...doc,source});setDraftDirty(false);setNotice("节点文字已同步到原文");return true;} catch(e){inlineDraft.current=pending;setNotice(e.message);return false}
  }
  function navigate(id) {
    if(inlineDraft.current && !allowDiscard())return;
    if (!doc && id !== "agents") {
      // Nothing is open yet; keep the user in the library instead of an empty editor.
      setNotice("先新建或导入一份记忆。");
      id = "agents";
    }
    if (narrow && id === "graph") setRight(false);
    setTab(id);
    window.history.replaceState(
      null,
      "",
      id === "graph"
        ? "#workflow"
        : id === "overview"
          ? "#documents"
          : "#" + id,
    );
  }

  const changed = doc ? doc.source !== doc.original : false;
  const outlineView = parsed ? (
    <aside className="outline panel">
      <div className="panel-heading">
        <h2>文档结构</h2>
        <IconAction
          label="收起目录"
          onClick={() => (narrow ? setDirectoryOpen(false) : setLeft(false))}
        >
          <PanelLeftClose size={17} />
        </IconAction>
      </div>
      <TextField
        placeholder="搜索章节或内容"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        slotProps={{
          htmlInput: { "aria-label": "搜索章节或内容" },
          input: {
            startAdornment: <Search size={16} style={{ marginRight: 8 }} />,
          },
        }}
      />
      <div className="outline-filters">
        <Select
          inputProps={{"aria-label":"章节类别"}} fullWidth size="small" MenuProps={{slotProps:{paper:{className:"category-menu"}}}}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((c) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </Select>
      </div>
      <div className="document-label">
        <FileText size={16} />
        <span>{parsed.platform} 文档</span>
        <span>{parsed.sections.length}</span>
      </div>
      <div className="outline-list">
        {items.map((s) => (
          <button
            key={s.id}
            className={`outline-item ${selected === s.id ? "active" : ""}`}
            style={{ paddingLeft: 12 + Math.max(0, (s.level || 1) - 1) * 12 }}
            onClick={() => choose(s.id, true)}
          >
            <span
              className="outline-dot"
              style={{ background: colors[s.kind] || "#e4ebe5" }}
            />
            <span>{s.title}</span>
            {selected === s.id && <ChevronRight size={14} />}
          </button>
        ))}
        {!items.length && (
          <p className="empty-copy">没有匹配的章节。试试其他关键词。</p>
        )}
      </div>
      <div className="outline-footer">
        <Button
          fullWidth
          startIcon={<Plus size={16} />}
          disabled={parsed.format !== "markdown"}
          onClick={() => addLinkedNode()}
        >
          添加章节
        </Button>
        <button className="text-link" onClick={() => setDialog("formats")}>
          查看支持的导入格式 <ArrowUpRight size={13} />
        </button>
      </div>
    </aside>
  ) : null;
  return (
    <>
      <CssBaseline />
      <Opening/>
      <IntegrationHub doc={doc} library={library} config={config} onApply={source=>{if(allowDiscard())commit({...doc,source,positions:{}})}} onImport={next=>replace({...importFile(next.source,next.name),aiTransfer:next.aiTransfer})} onRestore={docs=>{if(!allowDiscard())return;docs.forEach(d=>importFile(d.source,d.name));const merged=[...libraryRef.current,...docs.map(d=>({...d,id:crypto.randomUUID()}))];writeLibrary(merged);libraryRef.current=merged;setLibrary(merged);setNotice("已合并导入本地存储库");}}/>
      {immersive && tab==="graph" && <div className="immersive-dock" role="toolbar" aria-label="全屏工具栏">
       <button title="目录" aria-label="悬浮目录" aria-pressed={left} onClick={()=>setLeft(v=>!v)}><PanelLeftClose size={19}/></button>
       <button title="编辑" aria-label="悬浮编辑" aria-pressed={right} onClick={()=>setRight(v=>!v)}><PanelRightClose size={19}/></button>
       <button title="布局与设置" aria-label="悬浮布局设置" aria-expanded={floatingTools} onClick={()=>setFloatingTools(v=>!v)}><Settings2 size={19}/></button>
       {floatingTools&&<div className="dock-expanded">
        {[['horizontal','横向'],['vertical','纵向']].map(([value,label])=><button key={value} aria-pressed={direction===value} onClick={()=>{if(direction!==value){animateLayout.current=true;setDirection(value);setDoc(d=>({...d,positions:{}}))}}}>{label}</button>)}
        <button onClick={()=>{setCollapsed([]);setFull(true)}}>展开</button><button onClick={()=>setCollapsed(parsed.sections.filter(s=>parsed.edges.some(e=>e.source===s.id)).map(s=>s.id))}>收起</button>
        <button onClick={()=>commit({...doc,positions:{}})}>排列</button><button aria-pressed={snap} onClick={()=>setSnap(v=>!v)}>吸附</button>
        <button title="全图总览" aria-label="全图总览" onClick={()=>flowRef.current?.fitView({padding:.16,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:180})}><ScanLine size={18}/></button>
        <button title="外观" aria-label="全屏外观" onClick={openSettings}><Palette size={18}/></button><button title="接口设置" aria-label="接口设置" onClick={()=>setDialog('api')}><Plug size={18}/></button><button title="连接检查" aria-label="连接检查" onClick={()=>setConnectionsOpen(true)}><Link2 size={18}/></button>
       </div>}
       <button title="退出全屏" aria-label="退出全屏" onClick={exitImmersive}><Maximize2 size={19}/></button></div>}
      <div
        className={`app ${tab === "agents" || !doc || !parsed ? "library-mode" : ""} ${immersive && tab === "graph" ? "immersive-mode" : ""} ${floatingTools ? "floating-tools-open" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          readFile(e.dataTransfer.files[0]);
        }}
      >
        <aside className="app-navigation" aria-label="主导航">
          <button className="navigation-brand" aria-label="回到 Agent 卡片库" onClick={()=>{if(allowDiscard()) navigate("agents")}}><Brand/></button>
          <Button
            className="import-fab"
            startIcon={<Plus size={22} />}
            variant="contained"
            onClick={() => setDialog("import")}
          >
            导入指令文档
          </Button>
          <div className="navigation-label">工作空间</div>
          {destinations.map(([id, Icon, label]) => (
            <button
              key={id}
              aria-current={tab === id ? "page" : undefined}
              className={tab === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <span>
                <Icon size={22} />
              </span>
              <strong>{label}</strong>
              {id === "diff" && changed && <i />}
            </button>
          ))}
          <div className="navigation-bottom">
            <div className="navigation-label">偏好与工具</div>
            <button onClick={() => setDialog("api")}><Plug size={21}/><strong>模型接口</strong></button>
            <button onClick={() => setConnectionsOpen(true)}><Link2 size={21}/><strong>连接状态</strong></button>
            <button onClick={openSettings}><Palette size={21}/><strong>外观与主题</strong></button>
            <button onClick={() => setShortcutOpen(true)}><Settings2 size={21}/><strong>快捷键设置</strong></button>
            <button onClick={() => setDialog("formats")}>
              <Info size={21} />
              <strong>格式与回导</strong>
            </button>
          </div>
          <div className="navigation-local">
            <ShieldCheck size={16} />
            本地保存 · 原文可回导
          </div>
          <button onClick={() => setSupportOpen(true)}><Info size={18}/><strong>更新与反馈</strong></button>
        </aside>
        <header className="topbar">
          <button className="mobile-brand" aria-label="返回 Agent 卡片库" onClick={()=>{if(allowDiscard())navigate("agents")}}><Brand/></button>
          <div className="page-identity">
            <span>指令文档 / {doc ? doc.name : "未打开记忆"}</span>
            <h1>
              {destinations.find((d) => d[0] === tab)?.[2] || "Agent 工作区"}
            </h1>
          </div>
          <div className="top-status">
            <span className="status-dot" />
            {saveState}
          </div>
          <div className="top-actions">
            <AppearanceButton />
            {narrow && <IconAction label="更新与反馈" onClick={() => setSupportOpen(true)}><Info size={18}/></IconAction>}
            <Button
              startIcon={<Upload size={16} />}
              onClick={() => setDialog("import")}
              variant="outlined"
            >
              导入文件
            </Button>
            <Button
              startIcon={<Download size={16} />}
              disabled={!doc || !parsed}
              onClick={() => setDialog("export")}
              variant="contained"
            >
              导出
            </Button>
          </div>
        </header>
        {doc && parsed && (
        <nav className="workspacebar">
          <div className="breadcrumb">
            <FolderOpen size={16} />
            <button className="library-back" onClick={()=>{if(allowDiscard())navigate("agents")}}>Agent 卡片库</button>
            <ChevronRight size={14} />
            <Select
              className="document-switch"
              inputProps={{ "aria-label": "切换文档" }}
              value={doc.id || ""}
              onChange={(e) => switchDocument(e.target.value)}
              MenuProps={{
                anchorOrigin: { vertical: "bottom", horizontal: "left" },
                transformOrigin: { vertical: "top", horizontal: "left" },
                slotProps: { paper: { className: "document-menu" } },
              }}
              renderValue={() => doc.name}
            >
              {library.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  <FileText size={18} />
                  <span>
                    <strong>{d.name}</strong>
                    <small>
                      {d.source.length.toLocaleString()} 字符 · 浏览器保存
                    </small>
                  </span>
                  {d.id === doc.id && <Check size={16} />}
                </MenuItem>
              ))}
            </Select>
            <button
              className="new-document"
              onClick={newDocument}
              aria-label="新建 Markdown"
            >
              ＋ 新建
            </button>
            {changed && (
              <span className="modified-dot" title="相较导入版本有修改" />
            )}
          </div>
          <div className="workspace-actions">
            <button className={`connection-indicator ${connection.status.state}`} aria-label="连接状态" title={connection.status.message} onClick={()=>setConnectionsOpen(true)}><Link2 size={17}/><span>{connection.status.state === "error" ? "连接异常" : connection.status.state === "unknown" ? "待确认" : "连接状态"}</span></button>
            {narrow && !right && (
              <IconAction label="展开编辑面板" onClick={() => setRight(true)}>
                <Settings2 size={19} />
              </IconAction>
            )}
            {narrow && (
              <IconAction
                label="打开章节目录"
                onClick={() => setDirectoryOpen(true)}
              >
                <BookOpen size={19} />
              </IconAction>
            )}
            <IconAction label="撤销" onClick={undo} disabled={!history.length}>
              <Undo2 size={17} />
            </IconAction>
            <IconAction label="重做" onClick={redo} disabled={!future.length}>
              <Redo2 size={17} />
            </IconAction>
            <span className="divider" />
            <Button
              startIcon={<Plug size={16} />}
              onClick={() => setDialog("api")}
            >
              接口
            </Button>
            <IconAction
              label="格式支持说明"
              onClick={() => setDialog("formats")}
            >
              <Info size={17} />
            </IconAction>
            <Button
              color="error"
              startIcon={<Trash2 size={16} />}
              onClick={() => requestDeleteDocument(doc.id)}
            >
              删除记忆
            </Button>
          </div>
        </nav>
        )}
        {tab === "agents" || !doc || !parsed ? <AgentLibrary documents={library} onOpen={id=>{if(!allowDiscard())return;switchDocument(id);setTab("graph");window.history.replaceState(null,"","#workflow")}} onNew={()=>{newDocument();setTab("graph");window.history.replaceState(null,"","#workflow")}} onImport={()=>setDialog("import")} onSettings={()=>setShortcutOpen(true)} onUpdate={updateCard} onDelete={deleteDocument}/> : <main
          className={`editor-shell mode-${tab} ${!left ? "no-left" : ""} ${!right ? "no-right" : ""}`}
        >
          {tab === "graph" && !narrow && left && outlineView}
          {narrow && (
            <Drawer
              open={directoryOpen}
              onClose={() => setDirectoryOpen(false)}
              slotProps={{
                paper: {
                  sx: {
                    width: "min(340px, 90vw)",
                    p: 1.5,
                    background: "#eef2ee",
                  },
                },
              }}
            >
              {outlineView}
            </Drawer>
          )}
          <section className="center panel">
            <div className="viewbar">
              <div className="view-tabs" role="tablist" aria-label="编辑视图">
                {[
                  ["overview", LayoutDashboard, "总览"],
                  ["graph", Network, "文档工作流"],
                  ["source", FileCode2, "源文件"],
                  ["diff", GitCompareArrows, "修改对照"],
                ].map(([id, Icon, label]) => (
                  <button
                    role="tab"
                    aria-selected={tab === id}
                    key={id}
                    onClick={() => navigate(id)}
                    className={tab === id ? "active" : ""}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                    {id === "diff" && changed && <span className="tab-dot" />}
                  </button>
                ))}
              </div>
              <div className="view-actions">
                {immersive && tab === "graph" && <><Button onClick={openSettings}>外观</Button><Button onClick={()=>setDialog("api")}>接口设置</Button><Button onClick={()=>setConnectionsOpen(true)}>连接检查</Button></>}
                {tab === "graph" && <Button onClick={()=>{if(immersive){exitImmersive();return}beforeImmersive.current={left,right};setLeft(false);setRight(false);setFloatingTools(false);setImmersive(true);setTimeout(()=>flowRef.current?.fitView({padding:.35,duration:matchMedia("(prefers-reduced-motion: reduce)").matches?0:400}),80)}} startIcon={<Maximize2 size={17}/>}>{immersive ? "退出全屏" : "全屏编辑"}</Button>}
                <IconAction label="聚焦当前章节" onClick={() => focusSection()}>
                  <ScanLine size={17} />
                </IconAction>
                {!left && (
                  <IconAction label="展开目录" onClick={() => setLeft(true)}>
                    <BookOpen size={17} />
                  </IconAction>
                )}
                {!right && (
                  <IconAction
                    label="展开编辑面板"
                    onClick={() => setRight(true)}
                  >
                    <Settings2 size={17} />
                  </IconAction>
                )}
                <IconAction
                  label="全图总览"
                  onClick={() =>
                    flowRef.current?.fitView({ padding: 0.16, duration: matchMedia("(prefers-reduced-motion: reduce)").matches?0:200 })
                  }
                >
                  <Maximize2 size={17} />
                </IconAction>
              </div>
            </div>
            {parsed.error ? (
              <Alert severity="error">{parsed.error}</Alert>
            ) : tab === "overview" ? (
              <div className="document-overview">
                <div className="overview-lead">
                  <div>
                    <span className="eyebrow">当前文档</span>
                    <h2>{doc.name}</h2>
                    <p>
                      从一份指令开始。结构、内容与修改记录，始终来自同一份文档。
                    </p>
                    <Button
                      variant="contained"
                      startIcon={<Network size={19} />}
                      onClick={() => navigate("graph")}
                    >
                      打开文档工作流
                    </Button>
                  </div>
                  <div className="document-emblem">
                    <FileText size={60} />
                    <span>{parsed.format.toUpperCase()}</span>
                  </div>
                </div>
                <div className="overview-metrics">
                  <div>
                    <span>指令节点</span>
                    <strong>
                      {parsed.sections.length}
                      <small>个章节</small>
                    </strong>
                  </div>
                  <div>
                    <span>章节关系</span>
                    <strong>
                      {parsed.edges.length}
                      <small>
                        {parsed.format === "markdown"
                          ? "条包含关系"
                          : "条原生连接"}
                      </small>
                    </strong>
                  </div>
                  <div>
                    <span>原文状态</span>
                    <strong className="metric-status">
                      {changed ? "有修改" : "已同步"}
                    </strong>
                    <small>
                      {changed ? "可检阅后回导" : "节点与原文保持一致"}
                    </small>
                  </div>
                </div>
                <ChapterChart
                  sections={parsed.sections}
                  onChoose={showDetail}
                />
                <section className="review-section">
                  <div className="review-heading">
                    <div>
                      <h2>检阅指令</h2>
                      <p>按类型查找内容，展开阅读，或定位到对应节点。</p>
                    </div>
                    <TextField
                      placeholder="搜索章节或内容"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <Search size={18} style={{ marginRight: 8 }} />
                          ),
                        },
                        htmlInput: { "aria-label": "检阅搜索" },
                      }}
                    />
                  </div>
                  <div className="category-chips" aria-label="按类型检阅">
                    {categories.map((c) => (
                      <button
                        key={c}
                        aria-pressed={category === c}
                        onClick={() => setCategory(c)}
                      >
                        {c}
                        <span>
                          {c === "全部"
                            ? parsed.sections.length
                            : parsed.sections.filter((s) => s.kind === c)
                                .length}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="review-cards">
                    {items.map((s, i) => (
                      <article
                        key={s.id}
                        className="review-card"
                        style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                      >
                        <div className="review-card-top">
                          <span>{s.kind}</span>
                          <small>{s.line ? `原文 L${s.line}` : s.id}</small>
                        </div>
                        <h3>{s.title}</h3>
                        <p>
                          {s.content.trim().slice(0, 160) || "此章节暂无正文"}
                        </p>
                        <Button onClick={(e) => showDetail(s, e.currentTarget)}>
                          展开完整内容
                        </Button>
                        <Button
                          endIcon={<ArrowUpRight size={16} />}
                          onClick={() => {
                            navigate("graph");
                            choose(s.id, true);
                          }}
                        >
                          定位并编辑
                        </Button>
                      </article>
                    ))}
                  </div>
                  {!items.length && (
                    <div className="review-empty">
                      没有匹配内容，尝试其他分类或关键词。
                    </div>
                  )}
                </section>
              </div>
            ) : tab === "graph" ? (
              <>
                <div className="canvas-caption">
                  <div>
                    <h1>{doc.name.replace(/\.[^.]+$/, "")}</h1>
                    <p>
                      {parsed.format === "markdown"
                        ? "由当前文档生成 · 编辑节点后同步回原文"
                        : "查看原生节点之间的连接关系"}
                    </p>
                  </div>
                  <Chip
                    size="small"
                    icon={<ShieldCheck size={13} />}
                    label="文档已联动"
                    variant="outlined"
                  />
                </div>
                {parsed.format === "markdown" && (
                  <div className="tree-view-tools">
                    <span>树形布局</span>
                    <div
                      className={`layout-segment direction-${direction}`}
                      role="group"
                      aria-label="树形方向"
                    >
                      {[
                        ["horizontal", "横向树"],
                        ["vertical", "纵向树"],
                      ].map(([value, label]) => (
                        <Button
                          key={value}
                          aria-pressed={direction === value}
                          onClick={() => {
                            if(value===direction)return;
                            animateLayout.current=true;
                            setDirection(value);
                            setDoc((d) => ({ ...d, positions: {} }));

                          }}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setCollapsed([]);
                        setFull(true);
                      }}
                    >
                      展开全部
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() =>
                        setCollapsed(
                          parsed.sections
                            .filter((s) =>
                              parsed.edges.some((e) => e.source === s.id),
                            )
                            .map((s) => s.id),
                        )
                      }
                    >
                      收起分支
                    </Button>
                  </div>
                )}
                <AlignmentTools
                  nodes={nodes}
                  snap={snap}
                  setSnap={setSnap}
                  disabled={draftDirty}
                  onArrange={() => commit({ ...doc, positions: {} })}
                  onAlign={(next) =>
                    commit({
                      ...doc,
                      positions: {
                        ...doc.positions,
                        ...Object.fromEntries(
                          next.map((n) => [n.id, n.position]),
                        ),
                      },
                    })
                  }
                />
                <div
                  className="canvas"
                  ref={canvasRef}
                  role="region"
                  aria-label="文档结构画布"
                >
                  <AnimatedFlow
                    graph={graph} selected={selected} animateLayout={animateLayout} onSettled={setNodes}
                    nodeDragThreshold={0}
                    nodeTypes={nodeTypes}
                    onInit={(i) => {
                      flowRef.current = i;
                    }}
                    fitView
                    fitViewOptions={{ padding: 0.2, minZoom: 0.05, maxZoom: 0.9 }}
                    onNodeClick={(_, n) => choose(n.id)}
                    snapToGrid={snap}
                    snapGrid={[20, 20]}
                    onNodeDragStart={(_, n) => {
                      dragSnapshot.current = {
                        document: structuredClone(doc),
                        position: { ...n.position },
                      };
                    }}
                    onNodeDragStop={(_, n) => {
                      const snapshot = dragSnapshot.current;
                      dragSnapshot.current = null;
                      if (
                        !snapshot ||
                        (snapshot.position.x === n.position.x &&
                          snapshot.position.y === n.position.y)
                      )
                        return;
                      setHistory((h) => [...h.slice(-39), snapshot.document]);
                      setFuture([]);
                      setDoc((d) => ({
                        ...d,
                        positions: { ...d.positions, [n.id]: n.position },
                      }));
                    }}
                    defaultViewport={{ x: 36, y: 48, zoom: 1 }}
                    minZoom={0.05}
                    maxZoom={1.8}
                    onlyRenderVisibleElements
                    nodesConnectable={false}
                    deleteKeyCode={null}
                  >
                    <GraphInternals direction={direction}/>
                    <Background color={tokens.line} gap={20} size={1} />
                    <Controls showInteractive={false} />
                    <div
                      className={`canvas-nav ${navOpen ? "is-open" : "is-closed"}`}
                    >
                      <div className="canvas-nav-head">
                        <Network size={12} aria-hidden="true" />
                        <span>画布导航</span>
                        <div className="canvas-nav-actions">
                          <button
                            type="button"
                            title="缩略图全图"
                            aria-label="缩略图全图"
                            onClick={() =>
                              flowRef.current?.fitView({
                                padding: 0.2,
                                duration: 220,
                              })
                            }
                          >
                            <Maximize2 size={12} />
                          </button>
                          <button
                            type="button"
                            className="canvas-nav-toggle"
                            title={navOpen ? "收起缩略图" : "展开缩略图"}
                            aria-label={navOpen ? "收起缩略图" : "展开缩略图"}
                            aria-expanded={navOpen}
                            onClick={() =>
                              setNavOpen((open) => {
                                localStorage.setItem(
                                  "reloom.minimap",
                                  open ? "off" : "on",
                                );
                                return !open;
                              })
                            }
                          >
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                      {navOpen && (
                        <>
                          <MiniMap
                            ariaLabel="画布缩略图，拖动可平移，点击可定位"
                            style={{
                              width: navSize.width,
                              height: navSize.height,
                              "--nav-w": `${navSize.width}px`,
                              "--nav-h": `${navSize.height}px`,
                            }}
                            bgColor={tokens.isDark ? "rgba(255,255,255,0.085)" : tokens.surface}
                            nodeColor={(n) =>
                              n.id === selected
                                ? tokens.accent
                                : withAlpha(
                                    tokens.accent,
                                    tokens.isDark ? 0.85 : 0.6,
                                  )
                            }
                            nodeStrokeColor={(n) =>
                              n.id === selected
                                ? tokens.ink
                                : tokens.isDark
                                  ? "rgba(255,255,255,0.22)"
                                  : "transparent"
                            }
                            nodeStrokeWidth={1}
                            nodeBorderRadius={3}
                            maskColor={
                              tokens.isDark
                                ? "rgba(0, 0, 0, 0.24)"
                                : "rgba(18, 20, 26, 0.1)"
                            }
                            maskStrokeColor={tokens.accent}
                            maskStrokeWidth={2}
                            pannable
                            zoomable
                            onClick={(_, point) =>
                              flowRef.current?.setCenter(point.x, point.y, {
                                zoom: flowRef.current?.getZoom?.() ?? 1,
                                duration: 220,
                              })
                            }
                          />
                          <p className="canvas-nav-hint">
                            拖动缩略图平移视野 · 点击定位
                          </p>
                        </>
                      )}
                    </div>
                  </AnimatedFlow>
                  <div className="canvas-legend">
                    <span className="legend-line" />
                    {parsed.format === "markdown"
                      ? "树状章节包含关系 · 非执行顺序"
                      : "原生工作流连接"}
                  </div>
                </div>
                <div className="canvas-footer">
                  <span>
                    <Network size={14} />
                    {graph.nodes.length} 个可见节点 · {graph.edges.length}{" "}
                    条关系
                  </span>
                  {parsed.format === "markdown" && (
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={full}
                          onChange={(e) => setFull(e.target.checked)}
                        />
                      }
                      label="展开全部章节"
                    />
                  )}
                </div>
              </>
            ) : tab === "source" ? (
              <div className="source-view">
                <div className="source-toolbar">
                  <span>{doc.name} · UTF-8</span>
                  <Button
                    variant="contained"
                    disabled={sourceDraft === doc.source}
                    onClick={() => {
                      try {
                        analyze(sourceDraft, doc.name);
                        commit({ ...doc, source: sourceDraft });
                        setNotice("源文件已应用。");
                      } catch (e) {
                        setNotice(e.message);
                      }
                    }}
                  >
                    应用源文件修改
                  </Button>
                </div>
                <textarea
                  aria-label="源文件编辑器"
                  spellCheck="false"
                  value={sourceDraft}
                  onChange={(e) => setSourceDraft(restoreEditorNewlines(e.target.value, doc.source))}
                />
              </div>
            ) : (
              <div className="diff-view">
                <div className="diff-heading">
                  <h2>与导入版本对照</h2>
                  <p>绿色为新增，红色为删除。导出使用当前已应用的内容。</p>
                </div>
                {!changed ? (
                  <div className="empty-diff">
                    <Check size={32} />
                    <h3>原文尚未修改</h3>
                    <p>编辑任意章节，修改会在这里逐行呈现。</p>
                  </div>
                ) : (
                  <pre>
                    {diffLines(doc.original, doc.source).map((p, i) => (
                      <span
                        key={i}
                        className={
                          p.added
                            ? "added"
                            : p.removed
                              ? "removed"
                              : "unchanged"
                        }
                      >
                        {p.value}
                      </span>
                    ))}
                  </pre>
                )}
              </div>
            )}
          </section>
          {tab === "graph" && right && (
            <aside className="inspector panel">
              <div className="panel-heading">
                <h2>编辑内容</h2>
                <IconAction
                  label="收起编辑面板"
                  onClick={() => setRight(false)}
                >
                  <PanelRightClose size={17} />
                </IconAction>
              </div>
              {current ? (
                <>
                  {parsed.format === "markdown" && (
                    <div className="node-linked-actions">
                      <Button
                        variant="contained"
                        startIcon={<Plus size={15} />}
                        disabled={
                          current.style === "plain" || current.level >= 6
                        }
                        onClick={() => addLinkedNode(current.id)}
                      >
                        添加子节点
                      </Button>
                      <Button
                        variant="contained"
                        className="rules-trigger"
                        startIcon={<Plug size={16} />}
                        onClick={(e) => {
                          if (allowDiscard()) {
                            setMotionOrigin(
                              e.currentTarget.getBoundingClientRect(),
                            );
                            setRulesOpen(true);
                          }
                        }}
                      >
                        触发与工具
                      </Button>
                    </div>
                  )}
                  <Button
                    className="chapter-history-trigger"
                    onClick={() => setHistoryOpen(true)}
                  >
                    章节修改历史
                  </Button>
                  <div className="inspector-meta">
                    <Chip
                      size="small"
                      label={current.kind}
                      sx={{ background: colors[current.kind] || "#e4ebe5" }}
                    />
                    <span>
                      {current.line
                        ? `源文件第 ${current.line} 行`
                        : "原生节点参数"}
                    </span>
                  </div>
                  <div className="inspector-form">
                    <TextField
                      label="章节名称"
                      fullWidth
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setDraftDirty(true);
                      }}
                      disabled={
                        parsed.format !== "markdown" ||
                        current.style === "plain"
                      }
                    />
                    <div className="body-label">
                      <label htmlFor="section-content">
                        {parsed.format === "markdown"
                          ? "章节内容"
                          : "节点内容 · JSON"}
                      </label>
                      <span>{body.length} 字符</span>
                    </div>
                    <textarea
                      id="section-content"
                      value={body}
                      onChange={(e) => {
                        setBody(e.target.value);
                        setDraftDirty(true);
                      }}
                      spellCheck="false"
                    />
                    <p className="field-help">
                      {parsed.format === "markdown"
                        ? "保留 Markdown 语法。应用后同步到源文件。"
                        : "仅修改此参数对象，原文中的其他字段保留。"}
                    </p>
                    <div className="edit-actions">
                      <Button
                        variant="contained"
                        startIcon={<Check size={16} />}
                        disabled={!draftDirty}
                        onClick={apply}
                      >
                        应用修改
                      </Button>
                      <IconAction
                        label="撤销未应用修改"
                        disabled={!draftDirty}
                        onClick={() => {
                          setTitle(current.title);
                          setBody(editableContent(current.content));
                          setDraftDirty(false);
                        }}
                      >
                        <RotateCcw size={17} />
                      </IconAction>
                    </div>
                  </div>
                  <div className="inspection">
                    <div className="inspection-title">
                      <ScanLine size={16} />
                      <strong>结构检查</strong>
                      <span>本地</span>
                    </div>
                    <p>
                      {parsed.issues.length
                        ? `${parsed.issues.length} 条需要留意`
                        : "文档结构可以解析"}
                    </p>
                    {parsed.issues.length ? (
                      parsed.issues.slice(0, 3).map((i, n) => (
                        <p key={n} className="issue">
                          {i}
                        </p>
                      ))
                    ) : (
                      <div className="check-row">
                        <Check size={14} /> 可导出当前源文件
                      </div>
                    )}
                    <button
                      className="text-link"
                      onClick={() => setDialog("api")}
                    >
                      配置 AI 深度分析 <ArrowUpRight size={13} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-copy">选择一个节点，查看和编辑内容。</div>
              )}
              <div className="inspector-foot">
                <ShieldCheck size={15} />
                <span>文档默认仅保存在本机浏览器</span>
              </div>
            </aside>
          )}
        </main>}
        <footer className="statusbar">
          <span>
            <span className="status-dot" />
            {connection.status.state === "error" ? "连接异常" : connection.status.state === "ok" ? "本地服务已连接" : "连接待确认"}
          </span>
          <span>
            {doc && parsed ? (
              <>
                {parsed.platform} <span className="status-sep">/</span>{" "}
                {doc.source.length.toLocaleString()} 字符{" "}
                <span className="status-sep">/</span>
                {hasDraft()
                  ? "有未应用编辑"
                  : changed
                    ? "已修改 · 可导出"
                    : "与导入版本一致"}
              </>
            ) : (
              <>没有打开的记忆 · 新建或导入开始</>
            )}
          </span>
          <button onClick={() => setDialog("formats")}>
            格式兼容性 <ArrowUpRight size={12} />
          </button>
          <button onClick={() => setSupportOpen(true)}>更新与反馈 <ArrowUpRight size={12}/></button>
        </footer>
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".md,.mdc,.markdown,.txt,.json,.yaml,.yml"
          onChange={(e) => {
            readFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <Dialog
          open={dialog === "import"}
          onClose={() => setDialog(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>导入指令或工作流</DialogTitle>
          <DialogContent>
            <p className="dialog-description">
              从文件或文本开始。当前工作区会被替换，可通过撤销恢复。
            </p>
            <button
              className="dropzone"
              onClick={() => fileRef.current.click()}
            >
              <Upload size={28} />
              <strong>选择文件，或拖入工作区</strong>
              <span>Markdown / JSON / YAML / Atlas · 最大 4 MB</span>
            </button>
            <div className="paste-fields">
              <TextField
                fullWidth
                label="文件名称（用于识别格式）"
                value={pasteName}
                onChange={(e) => setPasteName(e.target.value)}
              />
              <TextField
                label="或粘贴源文件内容"
                fullWidth
                multiline
                minRows={5}
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                replace({ ...empty, original: empty.source });
              }}
            >
              新建文档
            </Button>
            <Button onClick={() => setDialog(null)}>取消</Button>
            <Button
              variant="contained"
              disabled={!paste.trim()}
              onClick={() => {
                try {
                  replace(importFile(paste, pasteName));
                } catch (e) {
                  setNotice(e.message);
                }
              }}
            >
              导入文本
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={dialog === "export"}
          onClose={() => setDialog(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>导出修改后的文档</DialogTitle>
          <DialogContent>
            <p className="dialog-description">
              回导原软件请选择“原格式”。导出不会自动覆盖或上传到源处。
            </p>
            {hasDraft() && (
              <Alert severity="warning">
                还有未应用编辑，请先返回编辑器应用修改。
              </Alert>
            )}
            <TextField
              select
              label="导出格式"
              fullWidth
              value={exportMode}
              onChange={(e) => setExportMode(e.target.value)}
              sx={{ mt: 2 }}
            >
              <MenuItem value="source">原格式 · {doc?.name || "当前记忆"}</MenuItem>
              <MenuItem value="project">
                Atlas 项目 · 原始版本 + 编辑结果 + 布局
              </MenuItem>
              <MenuItem value="markdown">
                Markdown ·{" "}
                {parsed?.format === "markdown"
                  ? "原文"
                  : "结构说明（不可直接执行）"}
              </MenuItem>
              {parsed && parsed.format !== "markdown" && (
                <MenuItem value="json">JSON · 数据结构转换</MenuItem>
              )}
              {parsed && parsed.format !== "markdown" && (
                <MenuItem value="yaml">YAML · 数据结构转换</MenuItem>
              )}
            </TextField>
            <div className="export-summary">
              <ShieldCheck size={20} />
              <div>
                <strong>原始内容可追溯</strong>
                <p>未知字段保留。请在目标软件中检查插件、引用与版本兼容。</p>
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog(null)}>取消</Button>
            <Button
              variant="contained"
              startIcon={<Download size={16} />}
              disabled={hasDraft()}
              onClick={download}
            >
              下载文件
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={dialog === "formats"}
          onClose={() => setDialog(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>格式支持与回导边界</DialogTitle>
          <DialogContent>
            <p className="dialog-description">
              格式可读取不代表能在不同平台之间直接运行。第一版优先保留来源格式。
            </p>
            {formats.map((f) => (
              <div className="format-row" key={f.name}>
                <div>
                  <strong>{f.name}</strong>
                  <small>{f.ext}</small>
                </div>
                <div>
                  <Chip size="small" label={f.support} />
                  <p>{f.detail}</p>
                </div>
              </div>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog(null)}>知道了</Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={dialog === "api"}
          onClose={() => {
            if (!busy) setDialog(null);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>接口与分析</DialogTitle>
          <DialogContent>
            <p className="dialog-description">
              本地解析无需模型。AI 分析由你配置的兼容 Chat Completions
              接口提供，只有点击分析才会发送当前文档。
            </p>
            <div className="api-endpoints">
              <code>GET /api/health</code>
              <code>POST /api/parse</code>
              <code>POST /api/export</code>
              <code>POST /api/analyze</code>
            </div>
            <div className="api-form">
              <TextField
                fullWidth
                label="接口 Base URL"
                placeholder="https://your-provider.example/v1"
                value={config.baseUrl}
                onChange={(e) =>
                  setConfig({ ...config, baseUrl: e.target.value })
                }
              />
              <TextField
                fullWidth
                label="模型名称"
                value={config.model}
                onChange={(e) =>
                  setConfig({ ...config, model: e.target.value })
                }
              />
              <TextField
                fullWidth
                label="API Key（仅保存在本次页面内存）"
                type="password"
                autoComplete="off"
                value={config.apiKey}
                onChange={(e) =>
                  setConfig({ ...config, apiKey: e.target.value })
                }
              />
            </div>
            <Alert severity="info">
              分析结果不会自动修改原文。接口密钥不会写入浏览器存储或项目导出文件。
            </Alert>
            {aiResult && <pre className="ai-result">{aiResult}</pre>}
          </DialogContent>
          <DialogActions>
            <Button disabled={busy} onClick={() => setDialog(null)}>
              关闭
            </Button>
            <Button variant="contained" disabled={busy} onClick={runAI}>
              {busy ? "正在分析…" : "发送当前文档并分析"}
            </Button>
          </DialogActions>
        </Dialog>
        {current && (
          <RuleEditor
            origin={motionOrigin}
            open={rulesOpen}
            onClose={() => setRulesOpen(false)}
            content={current.content}
            onSave={(content) => {
              commit({
                ...doc,
                source: editSection(
                  doc.source,
                  doc.name,
                  current.id,
                  current.title,
                  content,
                ),
              });
              setRulesOpen(false);
              setNotice("调用规则已写入当前章节，可随 Markdown 导出。");
            }}
          />
        )}
        <MorphDialog
          sharedTitle={sharedTitle}
          open={!!detail}
          origin={motionOrigin}
          onClose={() => setDetail(null)}
          fullWidth
          maxWidth="md"
          aria-labelledby="chapter-detail-title"
        >
          <DialogTitle id="chapter-detail-title">{detail?.title}</DialogTitle>
          <DialogContent>
            <p className="detail-meta">
              {detail?.kind} · {detail?.content.length || 0} 字符 · 当前文档原文
            </p>
            <pre className="chapter-detail-content">
              {detail?.content || "暂无正文"}
            </pre>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetail(null)}>返回章节</Button>
            <Button
              variant="contained"
              onClick={() => {
                const id = detail.id;
                setDetail(null);
                navigate("graph");
                choose(id, true);
              }}
            >
              定位并编辑
            </Button>
          </DialogActions>
        </MorphDialog>
        <ShortcutSettings
          open={shortcutOpen}
          onClose={() => setShortcutOpen(false)}
          keys={shortcuts}
          onSave={(keys) => {
            try {
              localStorage.setItem("atlas.shortcuts.v1", JSON.stringify(keys));
              setShortcuts(keys);
            } catch {
              setNotice("快捷键保存失败，请检查浏览器存储。");
            }
          }}
        />
        <ConnectionCheck
          open={connectionsOpen}
          onClose={() => setConnectionsOpen(false)}
          config={config}
          monitor={connection}
        />
        <ProjectSupport open={supportOpen} onClose={() => setSupportOpen(false)}/>
        <ChapterHistory
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          doc={doc}
          section={current}
          onRestore={(version) => {
            if (allowDiscard()) {
              commit({
                ...doc,
                source: editSection(
                  doc.source,
                  doc.name,
                  current.id,
                  current.title,
                  version.content,
                ),
              });
              setNotice("已恢复章节内容，可撤销本次恢复。");
            }
          }}
        />
        <Snackbar
          open={!!notice}
          autoHideDuration={4500}
          onClose={() => setNotice("")}
          message={notice}
          action={
            <IconButton
              color="inherit"
              aria-label="关闭提示"
              onClick={() => setNotice("")}
            >
              <X size={17} />
            </IconButton>
          }
        />
      </div>
    </>
  );
}
function WorkspaceRouter() {
  return <App />;
}
createRoot(document.getElementById("root")).render(
  <AppearanceProvider>
    <WorkspaceRouter />
  </AppearanceProvider>,
);

