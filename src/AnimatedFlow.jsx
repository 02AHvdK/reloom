import React, {useEffect, useRef, useState} from 'react';
import {ReactFlow, applyNodeChanges} from '@xyflow/react';

// Keep per-frame positions inside the canvas; publish settled positions to tools.
export default function AnimatedFlow({graph, selected, animateLayout, onSettled, ...props}) {
  const [nodes, setNodes] = useState(graph.nodes);
  const [moving, setMoving] = useState(false);
  const latest = useRef(nodes);
  latest.current = nodes;
  useEffect(() => {
    let frame;
    const target = graph.nodes.map(n => ({...n, selected:n.id===selected}));
    const animate = animateLayout.current && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    animateLayout.current = false;
    if (!animate) {setMoving(false);setNodes(target);onSettled(target);return;}
    setMoving(true);
    const from = new Map(latest.current.map(n => [n.id,n.position]));
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1,(now-start)/520), k=1-Math.pow(1-t,4);
      const next=target.map(n=>{const a=from.get(n.id)||n.position;return {...n,position:{x:a.x+(n.position.x-a.x)*k,y:a.y+(n.position.y-a.y)*k}}});
      setNodes(next);
      if(t<1) frame=requestAnimationFrame(tick);
      else {setMoving(false);onSettled(target);}
    }
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[graph,animateLayout,onSettled]);
  useEffect(()=>setNodes(ns=>ns.map(n=>n.selected===(n.id===selected)?n:{...n,selected:n.id===selected})),[selected]);
  return <ReactFlow {...props} nodes={nodes} edges={graph.edges} nodesDraggable={!moving}
    onNodesChange={changes=>setNodes(ns=>applyNodeChanges(changes,ns))}
    onNodeDragStop={(event,node,...rest)=>{onSettled(latest.current);props.onNodeDragStop?.(event,node,...rest)}}/>;
}
