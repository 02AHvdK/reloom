import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSource,editSourceBlock,attachReference,autoLayout,variableOptions} from '../src/workflowExtras.js';
import {demoWorkflow,executeWorkflow,serializeWorkflow,parseWorkflow,normalizeWorkflow} from '../src/workflow.js';

test('linked Markdown changes execution and preserves untouched original bytes',async()=>{
 const original='---\r\nname: skill\r\n---\r\n# Rules\r\nKeep {{literal}} intact.\r\n\r\n# Other\r\nDo not change.\r\n';
 let f=demoWorkflow();const doc=makeSource('SKILL.md',original);f.documents=[doc];
 f=attachReference(f,'design',{documentId:doc.id,sectionId:'s0'});
 assert.match((await executeWorkflow(f,f.input)).output,/Keep \{\{literal\}\} intact/);
 f.documents[0]=editSourceBlock(doc,'s0','Rules','Updated {{literal}}.\r\n\r\n');
 const result=await executeWorkflow(f,f.input);assert.match(result.output,/Updated \{\{literal\}\}/);assert.equal(result.trace.find(t=>t.nodeId==='design').references[0].name,'SKILL.md');
 assert.equal(f.documents[0].original,original);assert.ok(f.documents[0].source.endsWith('# Other\r\nDo not change.\r\n'));assert.ok(f.documents[0].source.startsWith('---\r\nname: skill\r\n---\r\n'));
 for(const [format,name] of [['json','x.json'],['yaml','x.yaml'],['markdown','x.md']])assert.deepEqual(parseWorkflow(serializeWorkflow(f,format),name),normalizeWorkflow(f));
});
test('whole Markdown import reads edited source and never interprets literal braces',async()=>{
 let f=parseWorkflow('# Agent\nOld {{unknown}}\n','AGENTS.md');f.documents[0]=editSourceBlock(f.documents[0],'s0','Agent','New {{unknown}}\n');
 assert.equal((await executeWorkflow(f,{})).output,'# Agent\nNew {{unknown}}\n');
});
test('broken references and structure-changing edits rejected before silent retargeting',()=>{
 const d=makeSource('x.md','# A\nbody\n# B\nrest\n');assert.throws(()=>editSourceBlock(d,'s0','A','# Surprise\nbody\n'),/新增章节/);
 const f=demoWorkflow();f.documents=[d];assert.throws(()=>attachReference(f,'design',{documentId:d.id,sectionId:'gone'}),/不存在/);
 const linked=attachReference(f,'design',{documentId:d.id,sectionId:'s0'});linked.documents=[];assert.throws(()=>normalizeWorkflow(linked),/不存在/);
});
test('automatic layout advances every edge and separates branches',()=>{
 const f=autoLayout(demoWorkflow());const nodes=new Map(f.nodes.map(n=>[n.id,n]));
 for(const e of f.edges)assert.ok(nodes.get(e.target).position.x>nodes.get(e.source).position.x);
 assert.notEqual(nodes.get('design').position.y,nodes.get('clarify').position.y);assert.deepEqual(f.edges,demoWorkflow().edges);
 const bad=demoWorkflow();bad.edges.push({id:'cycle',source:'result',target:'start'});assert.throws(()=>autoLayout(bad),/循环/);
});
test('condition options expose ancestors only and trace explains actual comparison',async()=>{
 const f=demoWorkflow();const options=variableOptions(f,'check');assert.ok(options.some(v=>v.path==='input.ready'&&v.value===true));assert.ok(options.some(v=>v.path==='nodes.start.output'));assert.ok(!options.some(v=>v.path==='nodes.design.output'));
 const r=await executeWorkflow(f,{...f.input,ready:false});const t=r.trace.find(t=>t.nodeId==='check');assert.equal(t.detail.actual,false);assert.equal(t.detail.expected,true);assert.match(t.detail.decision,/ELSE/);
});
test('saved cases roundtrip and invalid cases rejected',()=>{
 const f=demoWorkflow();f.testCases=[{name:'Empty brief',input:{brief:'',ready:false}}];assert.deepEqual(parseWorkflow(serializeWorkflow(f),'x.json').testCases,f.testCases);f.testCases=[{name:'bad',input:'text'}];assert.throws(()=>normalizeWorkflow(f),/测试样例/);
});
