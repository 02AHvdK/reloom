import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
} from "@mui/material";
import {
  DEFAULT_KEYS,
  KEY_LABELS,
  keyCombo,
  validateKeys,
} from "./shortcuts.js";
export default function ShortcutSettings({ open, onClose, keys, onSave }) {
  const [draft, setDraft] = useState(keys),
    [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setDraft(keys);
      setError("");
    }
  }, [open, keys]);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>快捷键设置</DialogTitle>
      <DialogContent>
        <p>
          点击输入框后按下组合键。Mod 表示 Windows 的 Ctrl 或 Mac 的
          Command。编辑文本时保留输入框自身的撤销行为。
        </p>
        <div className="settings-list">
          {Object.entries(KEY_LABELS).map(([id, label]) => (
            <TextField
              key={id}
              label={label}
              value={draft[id]}
              slotProps={{ htmlInput: { readOnly: true } }}
              onKeyDown={(e) => {
                if (e.key === "Tab") return;
                e.preventDefault();
                const combo = keyCombo(e);
                if (combo) setDraft((d) => ({ ...d, [id]: combo }));
              }}
            />
          ))}
        </div>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDraft(DEFAULT_KEYS)}>恢复默认</Button>
        <Button onClick={onClose}>取消</Button>
        <Button
          variant="contained"
          onClick={() => {
            try {
              validateKeys(draft);
              onSave(draft);
              onClose();
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          保存快捷键
        </Button>
      </DialogActions>
    </Dialog>
  );
}
