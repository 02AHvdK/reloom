import React, {useState} from 'react';
import {Alert, Button, DialogTitle, DialogContent, DialogActions, Stack, Typography} from '@mui/material';
import {Download, MessageSquare, ExternalLink} from 'lucide-react';
import MorphDialog from './MorphDialog.jsx';
import pkg from '../package.json';

export const projectUrl = 'https://github.com/02AHvdK/reloom';
export default function ProjectSupport({open, onClose}) {
  const [busy, setBusy] = useState(false), [result, setResult] = useState(null), [error, setError] = useState('');
  async function check() {
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/updates', {signal: AbortSignal.timeout(15000)});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '检查失败');
      setResult(data);
    } catch (e) { setError(e.name === 'TimeoutError' ? '检查超时，请稍后重试。' : '未能检查更新。请检查网络后重试，或直接查看发布页面。'); }
    finally { setBusy(false); }
  }
  const feedback = `${projectUrl}/issues/new?template=feedback.yml&title=${encodeURIComponent('[反馈] ')}&version=${encodeURIComponent(pkg.version)}`;
  return <MorphDialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="support-title">
    <DialogTitle id="support-title">更新与反馈</DialogTitle>
    <DialogContent><Stack spacing={2.5} sx={{pt:1}}>
      <div><Typography variant="h5" fontWeight={800}>RELOOM</Typography><Typography color="text.secondary">当前版本 {pkg.version}</Typography></div>
      <Typography variant="body2" color="text.secondary">手动检查 GitHub 发布版本。更新包下载后安装，保留你对更新时机的选择。</Typography>
      <Button variant="contained" onClick={check} disabled={busy} startIcon={<Download size={18}/>}>{busy ? '正在检查…' : '检查更新'}</Button>
      {error && <Alert severity="warning">{error}</Alert>}
      {result && <Alert severity={result.status === 'available' ? 'info' : 'success'}>{result.status === 'available' ? `发现新版本 ${result.latestVersion}` : result.status === 'unpublished' ? '仓库尚未发布可用版本。' : '当前已是最新版本。'}</Alert>}
      {result?.status === 'available' && <Button component="a" href={result.releaseUrl} target="_blank" rel="noopener noreferrer">查看更新并下载</Button>}
      <Button variant="outlined" component="a" href={feedback} target="_blank" rel="noopener noreferrer" startIcon={<MessageSquare size={18}/>}>建议反馈 / 报告问题</Button>
      <Typography variant="caption" color="text.secondary">将在 GitHub 打开反馈表单，填写并确认后提交。不会自动附带你的 Agent 内容或接口密钥。提交需要登录 GitHub。</Typography>
      <Button component="a" href={`${projectUrl}/releases`} target="_blank" rel="noopener noreferrer" endIcon={<ExternalLink size={15}/>}>发布记录</Button>
    </Stack></DialogContent>
    <DialogActions><Button onClick={onClose}>关闭</Button></DialogActions>
  </MorphDialog>;
}
