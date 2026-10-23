import {useEffect,useState} from 'react';
export default function useConnectionMonitor(config){
 const [status,setStatus]=useState({state:'checking',message:'正在检查连接'});
 const [muted,setMuted]=useState(()=>localStorage.getItem('reloom.connection-muted')==='true');
 useEffect(()=>{let stopped=false,busy=false;const controller=new AbortController();
 async function check(){if(busy||document.hidden)return;busy=true;try{const r=await fetch('/api/health',{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(5000)])});const data=await r.json();if(!r.ok||!data.ok)throw Error('本地服务不可达');let next={state:'ok',message:config.baseUrl?'本地服务已连接':'本地服务已连接 · 模型未配置'};if(config.baseUrl){const m=await fetch('/api/check-model',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(config),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});const result=await m.json();next={state:m.ok?(result.status||'unknown'):'error',message:result.message||result.error||'检查未完成'};}if(!stopped)setStatus({...next,checkedAt:Date.now()});}catch(e){if(!stopped)setStatus({state:'error',message:e.name==='TimeoutError'?'连接超时':e.message,checkedAt:Date.now()});}finally{busy=false;}}
 const first=setTimeout(check,1200),timer=setInterval(check,30000);window.addEventListener('online',check);document.addEventListener('visibilitychange',check);return()=>{stopped=true;controller.abort();clearTimeout(first);clearInterval(timer);window.removeEventListener('online',check);document.removeEventListener('visibilitychange',check)};
 },[config.baseUrl,config.model,config.apiKey]);
 return {status,muted,setMuted(value){setMuted(value);try{localStorage.setItem('reloom.connection-muted',String(value))}catch{}}};
}
