import React, { useState, useRef } from "react";
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
} from "@mui/material";
import { Upload, FileText, Link2, Download, ArrowUpRight } from "lucide-react";
import { diffLines } from "diff";
import {
  makeSource,
  sourceBlocks,
  editSourceBlock,
  attachReference,
} from "./workflowExtras.js";

export function downloadText(text, name) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function SourceLibrary({
  flow,
  onChange,
  selectedId,
  disabled,
  onNotice,
  openRef,
  onRefClosed,
}) {
  const file = useRef();
  const [editing, setEditing] = useState(null),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [preview, setPreview] = useState(null),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
  function edit(doc, block) {
    setEditing({ documentId: doc.id, sectionId: block.id });
    setTitle(block.title);
    setBody(block.content);
    setDirty(false);
    setError("");
  }
  React.useEffect(() => {
    if (openRef) {
      const d = (flow.documents || []).find((d) => d.id === openRef.documentId);
      const b = d && sourceBlocks(d).find((b) => b.id === openRef.sectionId);
      if (d && b) edit(d, b);
      else if (d) {
        const first = sourceBlocks(d)[0];
        edit(d, first);
      }
      onRefClosed();
    }
  }, [openRef]);
  const selected = flow.nodes.find((n) => n.id === selectedId);
  const canAttach = ["template", "ai"].includes(selected?.data.kind);
  const doc =
    editing && (flow.documents || []).find((d) => d.id === editing.documentId);
  function close() {
    if (dirty && !confirm("内容块有未应用修改，是否放弃？")) return;
    setEditing(null);
    setDirty(false);
  }
  async function load(f) {
    if (!f) return;
    try {
      if (f.size > 4 * 1024 * 1024) throw Error("文档超过4 MB");
      const d = makeSource(f.name, await f.text());
      onChange({ ...flow, documents: [...(flow.documents || []), d] });
      onNotice("已拆分为内容块，可引用到文本或 AI 节点");
    } catch (e) {
      onNotice(e.message);
    }
  }
  return (
    <div className="source-library">
      <p>
        把原则、资料和提示词放在这里，按需引用到节点。内容块本身没有执行顺序。
      </p>
      <Button
        fullWidth
        startIcon={<Upload size={16} />}
        variant="contained"
        disabled={disabled}
        onClick={() => file.current.click()}
      >
        导入 Markdown 内容
      </Button>
      <input
        hidden
        type="file"
        accept=".md"
        ref={file}
        onChange={(e) => {
          load(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {!(flow.documents || []).length && (
        <div className="source-empty">
          <FileText size={30} />
          <strong>让指令成为可复用的积木</strong>
          <span>
            导入 AGENTS.md、CLAUDE.md 或 SKILL.md，保留原文与章节关系。
          </span>
        </div>
      )}
      {(flow.documents || []).map((d) => (
        <section className="source-document" key={d.id}>
          <div className="source-doc-title">
            <strong>{d.name}</strong>
            <Chip
              size="small"
              label={d.source === d.original ? "原文" : "已修改"}
            />
          </div>
          <Button
            size="small"
            startIcon={<Download size={14} />}
            onClick={() => setPreview(d.id)}
          >
            修改对照与回导
          </Button>
          {sourceBlocks(d).map((b) => (
            <div className="source-block" key={b.id}>
              <button
                className="source-block-open"
                disabled={disabled}
                onClick={() => edit(d, b)}
              >
                <FileText size={16} />
                <span>
                  <strong>{b.title}</strong>
                  <small>
                    原文第 {b.line} 行 · {b.content.length} 字符
                  </small>
                </span>
                <ArrowUpRight size={14} />
              </button>
              <Button
                size="small"
                disabled={disabled || !canAttach}
                startIcon={<Link2 size={13} />}
                onClick={() => {
                  try {
                    onChange(
                      attachReference(flow, selectedId, {
                        documentId: d.id,
                        sectionId: b.id,
                      }),
                    );
                    onNotice(`已引用到「${selected.data.title}」`);
                  } catch (e) {
                    onNotice(e.message);
                  }
                }}
              >
                引用到选中节点
              </Button>
            </div>
          ))}
        </section>
      ))}
      {!canAttach && (
        <p className="source-help">选择文本模板或 AI 节点，即可添加引用。</p>
      )}
      <Dialog open={!!editing} onClose={close} fullWidth maxWidth="md">
        <DialogTitle>
          编辑原文内容块 <small>{doc?.name}</small>
        </DialogTitle>
        <DialogContent>
          <p>修改会同步到所有引用此块的节点。其他章节与原有格式保留。</p>
          <div className="source-edit-fields">
            <TextField
              label="内容块标题"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              fullWidth
            />
            <TextField
              label="内容块正文"
              multiline
              minRows={9}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setDirty(true);
              }}
              fullWidth
            />
          </div>
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>取消</Button>
          <Button
            variant="contained"
            disabled={disabled || !dirty}
            onClick={() => {
              try {
                const next = editSourceBlock(
                  doc,
                  editing.sectionId,
                  title,
                  body,
                );
                onChange({
                  ...flow,
                  documents: flow.documents.map((d) =>
                    d.id === doc.id ? next : d,
                  ),
                });
                setEditing(null);
                setDirty(false);
                onNotice("原文已更新，节点引用已同步；源文件尚未覆盖");
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            应用内容块修改
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!preview}
        onClose={() => setPreview(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>原文修改对照</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            下载保留原文件名的
            Markdown，再手动回导到来源。不会自动覆盖磁盘上的源文件。
          </Alert>
          <div className="source-diff">
            {(() => {
              const d = flow.documents?.find((d) => d.id === preview);
              return d
                ? diffLines(d.original, d.source).map((part, i) => (
                    <pre
                      className={
                        part.added ? "added" : part.removed ? "removed" : ""
                      }
                      key={i}
                    >
                      {part.added ? "+ " : part.removed ? "− " : "  "}
                      {part.value}
                    </pre>
                  ))
                : null;
            })()}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)}>关闭</Button>
          <Button
            variant="contained"
            startIcon={<Download size={16} />}
            onClick={() => {
              const d = flow.documents.find((d) => d.id === preview);
              downloadText(d.source, d.name);
              onNotice("已下载 Markdown；请手动回导到来源");
            }}
          >
            下载修改后的 Markdown
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
