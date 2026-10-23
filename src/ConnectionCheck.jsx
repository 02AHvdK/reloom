import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Switch,
  FormControlLabel,
} from "@mui/material";
export default function ConnectionCheck({ open, onClose, config, monitor }) {
  const [rows, setRows] = useState([]),
    [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const result = [];
    try {
      const r = await fetch("/api/health", {
        signal: AbortSignal.timeout(5000),
      });
      const body = await r.json();
      result.push(["本地服务", r.ok && body.ok ? "已连接" : "检查失败"]);
    } catch (e) {
      result.push(["本地服务", "不可达：" + e.message]);
    }
    if (config.baseUrl) {
      try {
        const r = await fetch("/api/check-model", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
          signal: AbortSignal.timeout(12000),
        });
        const data = await r.json();
        result.push([
          "模型接口",
          data.message || data.error || "未得到有效响应",
        ]);
      } catch (e) {
        result.push(["模型接口", "检查失败：" + e.message]);
      }
    } else result.push(["模型接口", "未配置，请先在接口与分析中填写地址"]);
    result.push(
      ["Skill / 插件", "未接入执行器；规则中的名称不代表已安装或可调用"],
      ["网站查询 / 采集", "未配置查询与采集连接器；未访问规则目标网站"],
    );
    setRows(result);
    setBusy(false);
  }
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>工具连接状态</DialogTitle>
      <DialogContent>
        {monitor && <><Alert severity={monitor.status.state === "error" ? "error" : "info"}>{monitor.status.message}</Alert><FormControlLabel control={<Switch checked={monitor.muted} onChange={e=>monitor.setMuted(e.target.checked)}/>} label="连接问题不弹出提醒"/><p>页面可见时每 30 秒检查一次；异常状态始终显示。</p></>}
        <p>
          检查本地服务和已配置的模型接口。模型检查只请求模型列表，不发送指令文档，不执行规则。
        </p>
        <Alert severity="info">
          连接状态是本次检测结果，不保证后续调用一定成功。
        </Alert>
        <div className="connection-list">
          {rows.map(([name, status]) => (
            <article key={name}>
              <strong>{name}</strong>
              <p>{status}</p>
            </article>
          ))}
        </div>
        {!rows.length && <p>尚未检查。点击下方按钮开始。</p>}
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onClose}>
          关闭
        </Button>
        <Button disabled={busy} variant="contained" onClick={run}>
          {busy ? "正在检查…" : "检查连接"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
