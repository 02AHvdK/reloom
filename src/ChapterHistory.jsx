import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from "@mui/material";
import { chapterVersions } from "./revisions.js";
import { diffLines } from "diff";
export default function ChapterHistory({
  open,
  onClose,
  doc,
  section,
  onRestore,
}) {
  const [preview, setPreview] = useState(null);
  const versions = chapterVersions(doc, section);
  return (
    <Dialog
      open={open}
      onClose={() => {
        setPreview(null);
        onClose();
      }}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>章节修改历史 · {section?.title}</DialogTitle>
      <DialogContent>
        <p>
          记录已应用的内容修改，保留最近 20 个文档版本（约 60
          万字符预算）。按唯一的同名同级章节匹配；重名或更名后不会猜测恢复目标。
        </p>
        {!versions.length && (
          <Alert severity="info">
            暂无可匹配的旧内容。新建记录从本版本开始保存。
          </Alert>
        )}
        <div className="revision-list">
          {versions.map((v, i) => (
            <article key={v.at + i}>
              <div>
                <strong>{new Date(v.at).toLocaleString()}</strong>
                <span>{v.content.length} 字符</span>
              </div>
              <Button onClick={() => setPreview(v)}>查看差异</Button>
            </article>
          ))}
        </div>
        {preview && (
          <>
            <pre className="revision-diff">
              {diffLines(section?.content || "", preview.content).map(
                (part, i) => (
                  <span
                    key={i}
                    className={
                      part.added ? "added" : part.removed ? "removed" : ""
                    }
                  >
                    {part.value}
                  </span>
                ),
              )}
            </pre>
            <Button
              variant="contained"
              onClick={() => {
                onRestore(preview);
                setPreview(null);
                onClose();
              }}
            >
              恢复此章节内容
            </Button>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
