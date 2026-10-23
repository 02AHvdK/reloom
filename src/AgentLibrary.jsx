import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Button,TextField,Dialog,DialogTitle,DialogContent,DialogActions,Alert} from '@mui/material';
import {ArrowUpRight,Plus,Upload,Pencil,Trash2,Orbit,Layers,Network,Sparkles,Hexagon,Waves} from 'lucide-react';
const symbols={weave:Orbit,layers:Layers,network:Network,spark:Sparkles,hexagon:Hexagon,waves:Waves};
export function Brand(){return <span className="reloom-wordmark"><em>RELOOM</em></span>}
function openingEnabled(){try{return JSON.parse(localStorage.getItem("atlas.appearance.v1")||"{}").opening!==false}catch{return true}}
export function Opening(){
 const [open,setOpen]=useState(()=>!location.hash&&openingEnabled()&&!matchMedia('(prefers-reduced-motion: reduce)').matches),word=useRef(null),overlay=useRef(null);
 useLayoutEffect(()=>{
  if(!open)return;let stopped=false,timer;const animations=[];const app=document.querySelector('.app');if(app)app.inert=true;
  document.documentElement.classList.add('opening-active');
  const close=()=>setOpen(false),escape=e=>{if(e.key==='Escape')close()};window.addEventListener('keydown',escape);window.addEventListener('resize',close);
  (async()=>{try{
   await document.fonts.load('900 36px ReeloomDisplay');if(stopped)return;
   const target=[...document.querySelectorAll('.navigation-brand .reloom-wordmark em,.mobile-brand .reloom-wordmark em')].find(el=>el.getBoundingClientRect().width>0);
   if(!target||!word.current){close();return}
   const b=target.getBoundingClientRect(),style=getComputedStyle(target),el=word.current,em=el.querySelector('em');
   ['font-family','font-size','font-weight','font-style','letter-spacing','line-height'].forEach(key=>em.style.setProperty(key,style.getPropertyValue(key),'important'));
   Object.assign(el.style,{position:'fixed',left:b.x+'px',top:b.y+'px',width:b.width+'px',height:b.height+'px',transformOrigin:'center center',visibility:'visible'});
   const scale=Math.min(innerWidth*.72/b.width,innerHeight*.28/b.height),start=`translate(${innerWidth/2-b.x-b.width/2}px,${innerHeight/2-b.y-b.height/2}px) scale(${scale})`;
   el.style.transform=start;overlay.current.dataset.phase='hold';
   timer=setTimeout(()=>{if(stopped)return;overlay.current.dataset.phase='moving';const motion=el.animate([{transform:start,color:getComputedStyle(el).color},{transform:'translate(0px,0px) scale(1)',color:style.color}],{duration:760,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});animations.push(motion);
    animations.push(overlay.current.querySelector('.opening-backdrop').animate([{opacity:1},{opacity:0}],{duration:700,easing:'ease-out',fill:'forwards'}));
    animations.push(overlay.current.querySelector('.opening-ripple').animate([{opacity:1},{opacity:0}],{duration:350,fill:'forwards'}));
    motion.finished.then(()=>{if(!stopped)close()}).catch(()=>{});
   },800);
  }catch{if(!stopped)close()}})();
  return()=>{stopped=true;clearTimeout(timer);animations.forEach(a=>a.cancel());window.removeEventListener('keydown',escape);window.removeEventListener('resize',close);if(app)app.inert=false;document.documentElement.classList.remove('opening-active')};
 },[open]);
 return open&&<div ref={overlay} className="reloom-opening opening-v15" role="dialog" aria-modal="true" aria-label="回织开场"><div className="opening-backdrop"/><div className="opening-ripple" aria-hidden="true"><i/><i/><i/></div><div ref={word} className="opening-word" style={{visibility:'hidden'}}><Brand/></div></div>
}
export default function AgentLibrary({documents,onOpen,onNew,onImport,onSettings,onUpdate,onDelete}){
 const [search,setSearch]=useState(''),[editing,setEditing]=useState(null),[deleting,setDeleting]=useState(null),[name,setName]=useState(''),[icon,setIcon]=useState('weave'),[image,setImage]=useState(''),[error,setError]=useState('');
 const list=documents.filter(d=>d.name.toLowerCase().includes(search.toLowerCase()));
 function edit(d){setEditing(d);setName(d.name.replace(/\.[^.]+$/,''));setIcon(d.cardIcon||'weave');setImage(d.cardImage||'');setError('')}
 async function upload(file){if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1024*1024){setError('请选择 1 MB 以内的 PNG、JPEG 或 WebP 图片');return}const reader=new FileReader();reader.onload=()=>{setImage(reader.result);setError('')};reader.onerror=()=>setError('图片读取失败');reader.readAsDataURL(file)}
 return <main className="agent-library"><header><div><span className="library-eyebrow">RELOOM / WORKSPACE</span><h1>把思路，织成行动。</h1><p>你的 Agent、指令与工作流，从这里继续。</p></div><div className="library-actions"><Button onClick={onImport} startIcon={<Upload size={18}/>}>导入文档</Button><Button variant="contained" onClick={onNew} startIcon={<Plus size={18}/>}>新建 Agent</Button></div></header><div className="library-toolbar"><h2>我的 Agent <small>{documents.length}</small></h2><TextField value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索 Agent" inputProps={{'aria-label':'搜索 Agent'}}/><Button onClick={onSettings}>快捷键设置</Button></div><div className="agent-grid">{list.map((d,i)=>{const Icon=symbols[d.cardIcon]||Orbit;return <article key={d.id} className="agent-card" style={{'--card-index':Math.min(i,8)}}><div className="agent-card-top"><span>{String(i+1).padStart(2,'0')}</span><div className="card-tools"><button className="card-edit" aria-label={'设置卡片：'+d.name} onClick={()=>edit(d)}><Pencil size={17}/></button><button className="card-delete" aria-label={'删除记忆：'+d.name} onClick={()=>setDeleting(d)}><Trash2 size={17}/></button></div></div><button className="agent-card-open" aria-label={'打开 Agent：'+d.name} onClick={()=>onOpen(d.id)}><div className="card-art" aria-hidden="true">{d.cardImage?<img src={d.cardImage} alt=""/>:<Icon size={76} strokeWidth={1.35}/>}</div><h3>{d.name.replace(/\.(md|markdown)$/i,'')}</h3><p>{d.source.replace(/<!--[^]*?-->/g,'').replace(/[#*`>]/g,'').trim().slice(0,100)||'从一个想法开始，建立你的第一条指令。'}</p><footer><span>{d.name.split('.').pop().toUpperCase()} · {d.source.length.toLocaleString()} 字符</span><ArrowUpRight size={20}/></footer></button></article>})}</div>{!documents.length&&<div className="library-empty"><p>还没有记忆。新建一份 Agent 指令，或导入 AGENTS.md / Markdown 文件。</p></div>}{documents.length>0&&!list.length&&<p className="library-empty">没有匹配的 Agent，试试其他名称。</p>}
 <Dialog open={!!editing} onClose={()=>setEditing(null)} fullWidth maxWidth="sm"><DialogTitle>卡片设置</DialogTitle><DialogContent className="card-settings"><TextField label="Agent 名称" value={name} onChange={e=>setName(e.target.value)} fullWidth helperText="只修改文件名，保留原格式与文档内容。"/><h3>显示图案</h3><div className="card-symbols">{Object.entries(symbols).map(([key,Icon])=><button key={key} aria-label={'图案 '+key} aria-pressed={!image&&icon===key} onClick={()=>{setIcon(key);setImage('')}}><Icon size={30}/></button>)}</div><Button component="label" variant="outlined">上传自定义图案<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>upload(e.target.files[0])}/></Button><p>PNG / JPEG / WebP · 最大 1 MB · 保存在本浏览器</p>{image&&<img className="card-image-preview" src={image} alt="自定义图案预览"/>}{error&&<Alert severity="error">{error}</Alert>}</DialogContent><DialogActions><Button onClick={()=>setEditing(null)}>取消</Button><Button variant="contained" disabled={!name.trim()||/[\\/:*?"<>|]/.test(name)} onClick={()=>{const extension=editing.name.match(/\.[^.]+$/)?.[0]||'.md';try{onUpdate(editing.id,{name:name.trim()+extension,cardIcon:icon,cardImage:image});setEditing(null)}catch(e){setError(e.message)}}}>保存卡片</Button></DialogActions></Dialog>
  <Dialog open={!!deleting} onClose={()=>setDeleting(null)} fullWidth maxWidth="xs"><DialogTitle>删除记忆</DialogTitle><DialogContent className="card-settings"><p>确定删除「{deleting?.name}」？</p><p>只会删除此浏览器中保存的记忆，无法恢复；需要保留请先打开该记忆导出文件。</p></DialogContent><DialogActions><Button onClick={()=>setDeleting(null)}>取消</Button><Button color="error" variant="contained" startIcon={<Trash2 size={16}/>} onClick={()=>{onDelete?.(deleting.id);setDeleting(null)}}>删除记忆</Button></DialogActions></Dialog>
 </main>
}
