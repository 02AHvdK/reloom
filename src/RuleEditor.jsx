import MorphDialog from "./MorphDialog.jsx";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
} from "@mui/material";
import { readRules, writeRules, trialRules } from "./rules.js";
const labels = {
  software: "调用软件",
  skill: "调用 Skill",
  plugin: "调用插件",
  search: "查询网站",
  scrape: "爬取网页",
};
export default function RuleEditor({ open, onClose, content, onSave, origin }) {
  const [apps,setApps]=useState([]),[launching,setLaunching]=useState(false),[launchMessage,setLaunchMessage]=useState("");
  useEffect(()=>{if(!open)return;const ctrl=new AbortController();fetch("/api/apps",{signal:ctrl.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(p=>setApps(p.apps||[])).catch(e=>{if(e.name!=="AbortError")setLaunchMessage("软件列表读取失败，请检查本地服务")});return()=>ctrl.abort()},[open]);
  async function launch(id){setLaunching(true);setLaunchMessage("");try{const r=await fetch("/api/apps/launch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});const p=await r.json();if(!r.ok)throw Error(p.error);setLaunchMessage(p.name+"："+p.message)}catch(e){setLaunchMessage(e.message)}finally{setLaunching(false)}}
  const [task, setTask] = useState("");
  const [trial, setTrial] = useState(null);
  const [rules, setRules] = useState([]),
    [error, setError] = useState(""),
    [invalid, setInvalid] = useState(false);
  useEffect(() => {
    if (open) {
      setTrial(null);
      try {
        setRules(readRules(content));
        setError("");
        setInvalid(false);
      } catch (e) {
        setError(e.message);
        setInvalid(true);
      }
    }
  }, [open, content]);
  const change = (i, key, value) => {
    setTrial(null);
    setRules((rs) => rs.map((r, n) => (n === i ? { ...r, [key]: value } : r)));
  };
  return (
    <MorphDialog
      origin={origin}
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>触发与工具</DialogTitle>
      <DialogContent>
        <p className="dialog-description">
          配置当前章节遇到什么情况、调用什么工具。规则保存在原文的 atlas-rules
          代码块中，可检阅、修改和导出。
        </p>
        <Alert severity="info">
          保存和试跑不会执行调用。软件可通过“打开软件”按钮手动启动；其他工具仍为规则配置。
        </Alert>
        <div className="rule-list">
          {rules.map((r, i) => (
            <section
              className="rule-card"
              key={i}
              style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
            >
              <header>
                <strong>规则 {String(i + 1).padStart(2, "0")}</strong>
                <Button
                  onClick={() => {
                    setTrial(null);
                    setRules((rs) => rs.filter((_, n) => n !== i));
                  }}
                >
                  删除规则
                </Button>
              </header>
              <TextField
                fullWidth
                label="当遇到什么情况"
                placeholder="例如：需要核实最新信息"
                value={r.when || ""}
                onChange={(e) => change(i, "when", e.target.value)}
              />
              <TextField
                fullWidth
                label="试跑关键词（逗号分隔）"
                value={r.keywords || ""}
                onChange={(e) => change(i, "keywords", e.target.value)}
                helperText="仅用于可解释的字面匹配；不会自动理解自然语言条件。"
              />
              <TextField
                select
                label="命中方式"
                value={r.match || "any"}
                onChange={(e) => change(i, "match", e.target.value)}
              >
                <MenuItem value="any">任一关键词</MenuItem>
                <MenuItem value="all">全部关键词</MenuItem>
              </TextField>
              <div className="rule-fields">
                <TextField
                  select
                  label="执行动作"
                  value={r.action}
                  onChange={(e) => change(i, "action", e.target.value)}
                >
                  {Object.entries(labels).map(([v, l]) => (
                    <MenuItem key={v} value={v}>
                      {l}
                    </MenuItem>
                  ))}
                </TextField>
                {r.action==="software" ? <TextField select label="本地软件" value={apps.some(a=>a.id===r.target)?r.target:""} onChange={e=>change(i,"target",e.target.value)} helperText="只启动列出的应用，不自动操作软件内容。">{apps.map(a=><MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}{!apps.length&&<MenuItem disabled value="">未检测到支持的软件</MenuItem>}</TextField> : <TextField
                  label={
                    ["skill", "plugin"].includes(r.action)
                      ? "Skill / 插件名称"
                      : "网站地址"
                  }
                  placeholder={
                    ["skill", "plugin"].includes(r.action)
                      ? "例如：imagegen"
                      : "https://example.com"
                  }
                  value={r.target || ""}
                  onChange={(e) => change(i, "target", e.target.value)}
                />}
              </div>
              {r.action==="software"&&<Button variant="outlined" disabled={launching||!apps.some(a=>a.id===r.target)} onClick={()=>launch(r.target)}>打开软件</Button>}
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="任务与预期结果"
                placeholder="查询关键词、采集范围或需要返回的内容"
                value={r.task || ""}
                onChange={(e) => change(i, "task", e.target.value)}
              />
            </section>
          ))}
        </div>
        <section className="rule-trial">
          <h3>规则试跑与命中解释</h3>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="试跑任务"
            value={task}
            onChange={(e) => {
              setTask(e.target.value);
              setTrial(null);
            }}
          />
          <Button
            disabled={invalid || !rules.length || !task.trim()}
            onClick={() => setTrial(trialRules(rules, task))}
          >
            开始试跑
          </Button>
          {trial?.map((row) => (
            <article key={row.index}>
              <strong>
                规则 {row.index + 1} · {row.status}
              </strong>
              <p>{row.reason}</p>
              <p>
                计划动作：{labels[row.rule.action]} →{" "}
                {row.rule.target || "未填写目标"}
              </p>
              <small>仅预演，未执行调用</small>
            </article>
          ))}
        </section>
        {launchMessage&&<Alert severity="info">{launchMessage}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <Button
          aria-label="添加调用规则" className="add-rule-button" variant="contained" fullWidth
          disabled={invalid}
          onClick={() =>
            setRules((rs) => [
              ...rs,
              { when: "", action: "skill", target: "", task: "" },
            ])
          }
        >
          添加调用规则
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button
          variant="contained"
          disabled={invalid}
          onClick={() => {
            try {
              onSave(writeRules(content, rules));
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          写入当前章节
        </Button>
      </DialogActions>
    </MorphDialog>
  );
}
