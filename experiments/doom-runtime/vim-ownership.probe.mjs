import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom = new JSDOM('<!doctype html><body></body>', {pretendToBeVisual:true});
for (const name of ['window','Window','document','MutationObserver','HTMLElement','Node','Text','Event','KeyboardEvent','CustomEvent','DOMRect','Range','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']) Object.defineProperty(globalThis,name,{value:['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(name)?dom.window[name].bind(dom.window):dom.window[name],configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
dom.window.Range.prototype.getClientRects=()=>[];
dom.window.Range.prototype.getBoundingClientRect=()=>new dom.window.DOMRect();
const {EditorState,EditorSelection,StateEffect,StateField,Transaction}=await import('@codemirror/state');
const {EditorView,drawSelection}=await import('@codemirror/view');
const {history,undo,redo,undoDepth,redoDepth,invertedEffects,isolateHistory}=await import('@codemirror/commands');
const {vim,Vim,getCM}=await import('@replit/codemirror-vim');
const raw=s=>s.sliceDoc();
const source=[EditorState.lineSeparator.of('\n')];
const restore=StateEffect.define({map:(v,c)=>({id:v.id,selection:v.selection.map(c)})});
const marker=StateEffect.define();
const markerField=StateField.define({create:()=>0,update:(v,tr)=>tr.effects.reduce((v,e)=>e.is(marker)?e.value:v,v)});
const owners=new WeakMap(), windows=[], results=[], calls=[];
let serial=0;
class BufferOwner {
 windows=new Set(); revision=0;
 constructor(text){this.saved=text;this.state=EditorState.create({doc:text,extensions:[...source,history(),invertedEffects.of(tr=>tr.effects.filter(e=>e.is(restore)).map(e=>restore.of({id:e.value.id,selection:tr.startState.selection})))]});}
 get dirty(){return raw(this.state)!==this.saved;}
 command(cmd){return cmd({state:this.state,dispatch:tr=>this.commit(tr)});}
 commit(tr,origin=null){
  assert.equal(tr.startState,this.state);this.state=tr.state;if(tr.docChanged)this.revision++;
  const r=tr.effects.find(e=>e.is(restore))?.value;
  for(const w of this.windows){const selection=r?.id===w.id?r.selection:origin===w?tr.newSelection:w.view.state.selection.map(tr.changes);
   w.view.update([w.view.state.update({changes:tr.changes,selection,annotations:Transaction.addToHistory.of(false)})]);w.revision=this.revision;
   assert.ok(w.view.state.doc.eq(this.state.doc));assert.equal(undoDepth(w.view.state),0);assert.equal(redoDepth(w.view.state),0);
  }
 }
}
class Projection {
 constructor(b){this.id=++serial;this.cached=new Map();this.view=new EditorView({state:EditorState.create(),parent:document.body.appendChild(document.createElement('div')),dispatch:tr=>this.dispatch(tr)});windows.push(this);this.attach(b);}
 attach(b){if(this.buffer){owners.delete(getCM(this.view));this.cached.set(this.buffer,this.view.state.selection);this.buffer.windows.delete(this);}
  this.buffer=b;b.windows.add(this);this.revision=b.revision;
  this.view.setState(EditorState.create({doc:b.state.doc,selection:this.cached.get(b)??EditorSelection.cursor(0),extensions:[...source,vim(),drawSelection(),markerField]}));
  const cm=getCM(this.view);assert.ok(cm);owners.set(cm,this);
 }
 dispatch(tr){const b=this.buffer;if(tr.startState!==this.view.state||this.revision!==b.revision||!tr.startState.doc.eq(b.state.doc))throw Error('stale projection');
  if(!tr.docChanged){this.view.update([tr]);return;}
  // Vim dd temporarily selects its operator range before the edit. For this
  // normal-mode-only probe, history restores the range START as a cursor,
  // not that transient range (which would activate visual mode on undo).
  // This is an explicit public-selection policy, not Vim state copying.
  const preEdit=tr.startState.selection.main.empty?tr.startState.selection:EditorSelection.cursor(tr.startState.selection.main.from);
  b.state=b.state.update({selection:preEdit,annotations:Transaction.addToHistory.of(false)}).state;
  b.commit(b.state.update({changes:tr.changes,selection:tr.newSelection,effects:restore.of({id:this.id,selection:tr.newSelection}),annotations:[isolateHistory.of('full'),Transaction.userEvent.of(tr.annotation(Transaction.userEvent)??'input')]}),this);
 }
 select(n){this.view.dispatch({selection:{anchor:n}});}
 destroy(){owners.delete(getCM(this.view));this.buffer.windows.delete(this);this.view.destroy();}
}
function normal(w){assert.equal(!!getCM(w.view).state.vim.insertMode,false);assert.equal(!!getCM(w.view).state.vim.visualMode,false);}
function keys(w,...ks){normal(w);for(const k of ks){const cm=getCM(w.view);cm.operation(()=>Vim.handleKey(cm,k,'user'));}normal(w);}
function domKey(w,key,ctrlKey=false){w.view.contentDOM.dispatchEvent(new KeyboardEvent('keydown',{key,ctrlKey,bubbles:true,cancelable:true}));normal(w);}
function test(name,fn,category='custom-route'){try{results.push({name,category,status:'PASS',evidence:fn()});}catch(e){results.push({name,category,status:'FAIL',error:e.stack});}}
// Run baseline BEFORE any process-global mapping is installed.
test('ordinary Vim u and C-r do not reach canonical history',()=>{
 const b=new BufferOwner('one\ntwo\nthree'),a=new Projection(b),z=new Projection(b);
 keys(a,'d','d');assert.equal(raw(b.state),'two\nthree');assert.equal(undoDepth(b.state),1);
 const edited=b.state;keys(z,'u');assert.equal(b.state,edited);assert.equal(raw(a.view.state),'two\nthree');assert.equal(undoDepth(z.view.state),0);
 // Set up a REAL canonical redo event, otherwise a no-op C-r is not evidence.
 assert.ok(b.command(undo));assert.equal(raw(b.state),'one\ntwo\nthree');assert.equal(redoDepth(b.state),1);
 const undone=b.state;keys(a,'<C-r>');assert.equal(b.state,undone);assert.equal(redoDepth(b.state),1);
 return {expectedGapConfirmed:true,ordinaryUndoNoop:true,ordinaryRedoNoopWithCanonicalRedoAvailable:true,windowHistoryDepths:[undoDepth(a.view.state),undoDepth(z.view.state)]};
},'baseline-gap');
// Public API only: callback receives getCM's adapter; registry owns the live window.
for(const [name,cmd] of [['spikeCanonicalUndo',undo],['spikeCanonicalRedo',redo]])Vim.defineAction(name,(cm,args)=>{
 const w=owners.get(cm);if(!w)throw Error('unregistered Vim adapter (global mapping ownership policy)');
 const repeat=args?.repeat??1;const outcomes=[];for(let i=0;i<repeat;i++){const ok=w.buffer.command(cmd);outcomes.push(ok);if(!ok)break;}
 calls.push({window:w.id,name,repeat,outcomes});
});
Vim.mapCommand('u','action','spikeCanonicalUndo',{}, {context:'normal'});
Vim.mapCommand('<C-r>','action','spikeCanonicalRedo',{}, {context:'normal'});
test('shared buffer: dd on either view, cross-window u/redo, independent cursors',()=>{
 const b=new BufferOwner('one\ntwo\nthree\nfour'),a=new Projection(b),z=new Projection(b);
 a.select(0);z.select(8);keys(a,'d','d');assert.equal(raw(b.state),'two\nthree\nfour');assert.equal(z.view.state.selection.main.head,4);
 keys(z,'u');assert.equal(raw(b.state),'one\ntwo\nthree\nfour');assert.equal(a.view.state.selection.main.head,0);assert.equal(z.view.state.selection.main.head,8);
 keys(z,'<C-r>');assert.equal(raw(a.view.state),'two\nthree\nfour');assert.equal(z.view.state.selection.main.head,4);
 z.select(4);a.select(1);keys(z,'d','d');assert.equal(raw(b.state),'two\nfour');assert.equal(a.view.state.selection.main.head,1);
 keys(a,'u');assert.equal(raw(b.state),'two\nthree\nfour');assert.equal(z.view.state.selection.main.head,4);assert.equal(a.view.state.selection.main.head,1);
 keys(a,'<C-r>');assert.equal(raw(z.view.state),'two\nfour');assert.equal(a.view.state.selection.main.head,1);
 return {bothEditOrigins:true,bothUndoRedoWindows:true,otherCursorNotOverwritten:true,windowHistoryDepths:[undoDepth(a.view.state),undoDepth(z.view.state)],canonicalUndoDepth:undoDepth(b.state)};
});
test('A/B unsaved switchback: independent histories, adapter registration refreshed',()=>{
 const a=new BufferOwner('A1\nA2\nA3'),b=new BufferOwner('B1\nB2\nB3'),w=new Projection(a);
 keys(w,'d','d');const old=getCM(w.view);w.attach(b);assert.equal(owners.has(old),false);assert.notEqual(old,getCM(w.view));keys(w,'d','d');assert.ok(a.dirty&&b.dirty);
 w.attach(a);keys(w,'u');assert.equal(raw(a.state),'A1\nA2\nA3');assert.equal(raw(b.state),'B2\nB3');assert.equal(undoDepth(b.state),1);
 keys(w,'<C-r>');assert.ok(a.dirty&&b.dirty);w.attach(b);keys(w,'u');assert.equal(raw(b.state),'B1\nB2\nB3');assert.equal(raw(a.state),'A2\nA3');
 keys(w,'<C-r>');assert.ok(a.dirty&&b.dirty);assert.equal(undoDepth(a.state),1);assert.equal(undoDepth(b.state),1);
 return {unsavedBoth:true,noSaveOrDiskAdapter:true,independentUndoRedo:true,oldAdapterUnregistered:true,normalAfterSwitch:true};
});
test('DOM keydown dd/u/C-r invokes custom route',()=>{
 const b=new BufferOwner('one\ntwo'),w=new Projection(b);domKey(w,'d');domKey(w,'d');assert.equal(raw(b.state),'two');domKey(w,'u');assert.equal(raw(b.state),'one\ntwo');domKey(w,'r',true);assert.equal(raw(b.state),'two');return {syntheticDOM:true};
});
test('counted 2dd, two isolated dd events, 2u and 2C-r',()=>{
 const b=new BufferOwner('a\nb\nc\nd\ne\nf'),w=new Projection(b);keys(w,'2','d','d');assert.equal(raw(b.state),'c\nd\ne\nf');assert.equal(undoDepth(b.state),1);keys(w,'u');assert.equal(raw(b.state),'a\nb\nc\nd\ne\nf');
 keys(w,'d','d');keys(w,'d','d');assert.equal(raw(b.state),'c\nd\ne\nf');assert.equal(undoDepth(b.state),2);
 keys(w,'2','u');assert.equal(raw(b.state),'a\nb\nc\nd\ne\nf');assert.equal(undoDepth(b.state),0);
 keys(w,'2','<C-r>');assert.equal(raw(b.state),'c\nd\ne\nf');assert.equal(undoDepth(b.state),2);
 return {countedDeleteOneEvent:true,countedCustomUndoRedo:true,lastCalls:calls.slice(-2)};
});
test('local variance: empty stacks, cursor-only moves, origin moved before undo',()=>{
 const b=new BufferOwner('aa\nbb\ncc'),a=new Projection(b),z=new Projection(b);keys(a,'u','<C-r>');assert.equal(undoDepth(b.state),0);
 a.select(3);z.select(7);keys(a,'d','d');a.select(0);keys(z,'u');assert.equal(raw(b.state),'aa\nbb\ncc');assert.equal(a.view.state.selection.main.head,3);assert.equal(z.view.state.selection.main.head,7);
 assert.equal(undoDepth(b.state),0);assert.equal(redoDepth(b.state),1);return {emptyCommandsSafe:true,selectionMovesNotHistory:true,originPreEditCursorRestored:true};
});
for(const [label,text] of Object.entries({LF:'α\n中😀\ntail\n',CRLF:'α\r\n中😀\r\ntail\r\n',mixed:'a\r\nb\nc\rd\0😀',NULUnicode:'中\0😀\ne\u0301\n尾',noFinal:'one\ntwo',final:'one\ntwo\n'}))test(`local raw fixture dd/u/redo: ${label}`,()=>{
 const b=new BufferOwner(text),a=new Projection(b),z=new Projection(b);z.select(text.length);keys(a,'d','d');const deleted=raw(b.state);assert.notEqual(deleted,text);keys(z,'u');assert.equal(raw(b.state),text);assert.equal(raw(a.view.state),text);keys(z,'<C-r>');assert.equal(raw(b.state),deleted);return {original:JSON.stringify(text),deleted:JSON.stringify(deleted),separator:'LF; CR literal'};
});
test('unsupported plugin effects explicitly not losslessly forwarded',()=>{
 const b=new BufferOwner('abc'),w=new Projection(b);w.view.dispatch({effects:marker.of(7)});assert.equal(w.view.state.field(markerField),7);
 w.view.dispatch({changes:{from:0,insert:'X'},effects:marker.of(99)});assert.equal(raw(b.state),'Xabc');assert.equal(w.view.state.field(markerField),7);assert.equal(b.state.field(markerField,false),undefined);
 keys(w,'u');assert.equal(raw(b.state),'abc');assert.equal(w.view.state.field(markerField),7);return {selectionOnlyLocalEffectSupported:true,documentTransactionForeignEffectDeliberatelyDropped:true,canonicalHasNoPluginField:true};
},'boundary-nonclaim');
test('unregistered view demonstrates global mapping ownership hazard',()=>{
 const view=new EditorView({doc:'unowned',extensions:[vim()],parent:document.body.appendChild(document.createElement('div'))});try{const cm=getCM(view);assert.throws(()=>cm.operation(()=>Vim.handleKey(cm,'u','user')),/unregistered Vim adapter/);return {globalMapAffectsOtherVimViews:true,failClosedInSpike:true};}finally{view.destroy();}
},'policy');
for(const w of windows)w.destroy();await new Promise(r=>setTimeout(r,30));dom.window.close();
const versions={node:process.version};for(const name of ['@codemirror/state','@codemirror/view','@codemirror/commands','@replit/codemirror-vim','@replit/codemirror-vim-core','jsdom'])versions[name]=JSON.parse(fs.readFileSync(new URL(`./node_modules/${name}/package.json`,import.meta.url))).version;
const output={scope:'synthetic memory-only fixtures; isolated process global maps die at exit',versions,summary:{passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length},tests:results,routeCalls:calls};
fs.writeFileSync(new URL('./vim-ownership.results.json',import.meta.url),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));process.exitCode=output.summary.failed?1:0;
