import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { alignNodes } from "./layout.js";
export default function AlignmentTools({
  nodes,
  onAlign,
  onArrange,
  snap,
  setSnap,
  disabled = false,
}) {
  const [open, setOpen] = useState(false),
    [ids, setIds] = useState([]);
  return (
    <div className="alignment-tools">
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={snap}
            disabled={disabled}
            onChange={(e) => setSnap(e.target.checked)}
          />
        }
        label="网格吸附"
      />
      <Button variant="outlined" size="small" disabled={disabled} onClick={onArrange}>
        自动排列
      </Button>
      <Button
        variant="outlined"
        size="small"
        disabled={disabled || nodes.length < 2}
        onClick={() => {
          setIds(nodes.filter((n) => n.selected).map((n) => n.id));
          setOpen(true);
        }}
      >
        手动对齐
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>对齐节点</DialogTitle>
        <DialogContent>
          <p>选择至少两个节点。对齐只调整位置，不改变内容或连线。</p>
          <Button onClick={() => setIds(nodes.map((n) => n.id))}>全选</Button>
          <Button onClick={() => setIds([])}>清空选择</Button>
          <div className="align-node-list">
            {nodes.map((n) => (
              <FormControlLabel
                key={n.id}
                label={n.data.title}
                control={
                  <Checkbox
                    checked={ids.includes(n.id)}
                    onChange={(e) =>
                      setIds(
                        e.target.checked
                          ? [...ids, n.id]
                          : ids.filter((id) => id !== n.id),
                      )
                    }
                  />
                }
              />
            ))}
          </div>
          <div className="align-actions">
            {[
              ["left", "左侧对齐"],
              ["top", "顶部对齐"],
              ["horizontal", "水平等距"],
              ["vertical", "垂直等距"],
            ].map(([mode, label]) => (
              <Button
                key={mode}
                variant="outlined"
                disabled={ids.length < 2}
                onClick={() => {
                  onAlign(alignNodes(nodes, ids, mode));
                  setOpen(false);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
