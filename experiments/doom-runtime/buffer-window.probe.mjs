import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom = new JSDOM('<!doctype html><body></body>', {pretendToBeVisual:true});
for (const name of ['window','Window','document','MutationObserver','HTMLElement','Node','Text','Event','KeyboardEvent','CustomEvent','DOMRect','Range','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']) Object.defineProperty(globalThis,name,{value: ['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(name) ? dom.window[name].bind(dom.window) : dom.window[name], configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
// Measurement stubs: no layout, real browser input, UX or performance claim.
dom.window.Range.prototype.getClientRects = () => [];
dom.window.Range.prototype.getBoundingClientRect = () => new dom.window.DOMRect();
const {EditorState,EditorSelection,StateEffect,Transaction} = await import('@codemirror/state');
const {EditorView} = await import('@codemirror/view');
const {history,undo,redo,undoDepth,redoDepth,invertedEffects,isolateHistory} = await import('@codemirror/commands');
const raw = state => state.sliceDoc();
// LF is the ONLY CM separator. CR remains ordinary source content, including CRLF's CR.
// This intentionally preserves mixed source without a guessed separator or normalization.
const sourceExtensions = [EditorState.lineSeparator.of('\n'),EditorState.allowMultipleSelections.of(true)];
const restoreOrigin = StateEffect.define({map:(value,changes)=>({id:value.id,selection:value.selection.map(changes)})});
const canonicalExtensions = [...sourceExtensions,history(),invertedEffects.of(tr=>tr.effects.filter(e=>e.is(restoreOrigin)).map(e=>restoreOrigin.of({id:e.value.id,selection:tr.startState.selection})))];
const identity = ({workspace,file}) => JSON.stringify([workspace,file]);
class RevisionFiles {
  records = new Map(); writes = 0;
  put(key,body) {const old=this.records.get(key); const record={body,revision:(old?.revision??0)+1};this.records.set(key,record);return {...record};}
  read(key) {return {...this.records.get(key)};}
  async compareAndWrite(key,expected,body,gate=Promise.resolve()) {await gate;const current=this.read(key);if(current.revision!==expected)return {ok:false,conflict:true,currentRevision:current.revision};this.writes++;return {ok:true,...this.put(key,body)};}
}
class Buffer {
  windows = new Set(); revision = 0;
  constructor(files,id,path,initial) {this.files=files;this.id=id;this.key=identity(id);this.path=path;this.saved=initial.body;this.fileRevision=initial.revision;this.state=EditorState.create({doc:initial.body,extensions:canonicalExtensions});}
  get dirty() {return raw(this.state)!==this.saved;}
  commit(tr,origin=null) {
    if(tr.startState!==this.state) throw Error('stale canonical transaction');
    this.state=tr.state;if(tr.docChanged)this.revision++;
    const restoration=tr.effects.find(e=>e.is(restoreOrigin))?.value;
    for(const w of this.windows) {
      const selection=restoration?.id===w.id ? restoration.selection : origin===w ? tr.newSelection : w.view.state.selection.map(tr.changes);
      const projected=w.view.state.update({changes:tr.changes,selection,annotations:Transaction.addToHistory.of(false)});
      w.view.update([projected]);w.revision=this.revision;
      assert.ok(w.view.state.doc.eq(this.state.doc));assert.equal(undoDepth(w.view.state),0);
    }
  }
  historyCommand(command) {return command({state:this.state,dispatch:tr=>this.commit(tr)});}
  async save(gate) {
    // Capture before the await. Only the captured body becomes the saved baseline.
    const capture={body:raw(this.state),revision:this.fileRevision,bufferRevision:this.revision};
    const result=await this.files.compareAndWrite(this.key,capture.revision,capture.body,gate);
    if(result.ok){this.saved=capture.body;this.fileRevision=result.revision;}
    return {result,capturedRevision:capture.bufferRevision,currentRevision:this.revision,dirty:this.dirty};
  }
  externalCheck() {const current=this.files.read(this.key);if(current.revision===this.fileRevision)return {changed:false};return {changed:true,conflict:this.dirty,revision:current.revision};}
}
class WindowProjection {
  constructor(id,buffer) {this.id=id;this.selections=new Map();this.view=new EditorView({state:EditorState.create({extensions:sourceExtensions}),parent:document.body.appendChild(document.createElement('div')),dispatch:tr=>this.dispatch(tr)});this.attach(buffer);}
  attach(buffer) {
    if(this.buffer){this.selections.set(this.buffer.key,this.view.state.selection);this.buffer.windows.delete(this);}
    this.buffer=buffer;buffer.windows.add(this);this.revision=buffer.revision;
    this.view.setState(EditorState.create({doc:buffer.state.doc,selection:this.selections.get(buffer.key)??EditorSelection.cursor(0),extensions:sourceExtensions}));
  }
  dispatch(tr) {
    const b=this.buffer;
    // Exact window start-state + revision + document equality: reject, never rebase stale offsets.
    if(tr.startState!==this.view.state || this.revision!==b.revision || !tr.startState.doc.eq(b.state.doc)) throw Error('stale view transaction');
    if(!tr.docChanged){this.view.update([tr]);return;}
    // Window's pre-edit selection seeds canonical history; this is not window-local history.
    b.state=b.state.update({selection:tr.startState.selection,annotations:Transaction.addToHistory.of(false)}).state;
    const canonical=b.state.update({changes:tr.changes,selection:tr.newSelection,effects:restoreOrigin.of({id:this.id,selection:tr.newSelection}),annotations:[isolateHistory.of('full'),Transaction.userEvent.of(tr.annotation(Transaction.userEvent)??'input')]});
    b.commit(canonical,this);
  }
  select(anchor,head=anchor) {this.view.dispatch({selection:EditorSelection.range(anchor,head)});}
  edit(from,to,insert,anchor=from+insert.length) {this.view.dispatch({changes:{from,to,insert},selection:{anchor},userEvent:'input.type'});}
  undo() {return this.buffer.historyCommand(undo);}
  redo() {return this.buffer.historyCommand(redo);}
  destroy(){this.buffer.windows.delete(this);this.view.destroy();}
}
const files=new RevisionFiles(), buffers=[], windows=[];
const makeBuffer=(file,body,workspace='ws1',path='/same/path')=>{const id={workspace,file};const initial=files.put(identity(id),body);const b=new Buffer(files,id,path,initial);buffers.push(b);return b;};
const mount=(id,b)=>{const w=new WindowProjection(id,b);windows.push(w);return w;};
const results=[];
async function test(name,fn){try{const evidence=await fn();results.push({name,status:'PASS',evidence});}catch(e){results.push({name,status:'FAIL',error:e.stack});}}
await test('A/B unsaved switchback and independent canonical histories',()=>{
 const a=makeBuffer('A','alpha'),b=makeBuffer('B','bravo'),w=mount('switch',a);
 w.edit(0,0,'A');assert.ok(a.dirty);assert.equal(undoDepth(a.state),1);w.attach(b);w.edit(5,5,'B');assert.ok(b.dirty);
 w.attach(a);assert.equal(raw(w.view.state),'Aalpha');assert.equal(undoDepth(a.state),1);assert.ok(w.undo());assert.equal(raw(a.state),'alpha');assert.equal(raw(b.state),'bravoB');assert.equal(undoDepth(b.state),1);
 w.attach(b);assert.equal(raw(w.view.state),'bravoB');assert.ok(w.undo());assert.equal(raw(b.state),'bravo');assert.equal(undoDepth(a.state),0);
 return {independentlyDirtyBeforeUndo:true,independentHistory:true,projectionUndoDepth:undoDepth(w.view.state)};
});
await test('same buffer, independent selections, edit either side, cross-window undo/redo with origin selection',()=>{
 const b=makeBuffer('shared','abcdefghij'),left=mount('left',b),right=mount('right',b);
 left.select(2,4);right.select(7,9);assert.notDeepEqual(left.view.state.selection.toJSON(),right.view.state.selection.toJSON());
 left.edit(2,4,'XYZ',5);assert.equal(raw(b.state),'abXYZefghij');assert.equal(raw(right.view.state),raw(b.state));assert.deepEqual(right.view.state.selection.toJSON(),EditorSelection.single(8,10).toJSON());
 const rightAfterFirst=right.view.state.selection;
 assert.ok(right.undo());assert.equal(raw(b.state),'abcdefghij');assert.deepEqual(left.view.state.selection.toJSON(),EditorSelection.single(2,4).toJSON());assert.deepEqual(right.view.state.selection.toJSON(),EditorSelection.single(7,9).toJSON());
 assert.ok(right.redo());assert.equal(raw(b.state),'abXYZefghij');assert.deepEqual(left.view.state.selection.toJSON(),EditorSelection.single(5).toJSON());assert.deepEqual(right.view.state.selection.toJSON(),rightAfterFirst.toJSON());
 right.select(8,10);right.edit(8,10,'!',9);assert.equal(raw(left.view.state),'abXYZefg!j');const leftBeforeUndo=left.view.state.selection;
 assert.ok(left.undo());assert.equal(raw(b.state),'abXYZefghij');assert.deepEqual(right.view.state.selection.toJSON(),EditorSelection.single(8,10).toJSON());assert.deepEqual(left.view.state.selection.toJSON(),leftBeforeUndo.toJSON());
 assert.ok(right.undo());assert.equal(raw(b.state),'abcdefghij');assert.deepEqual(left.view.state.selection.toJSON(),EditorSelection.single(2,4).toJSON());assert.equal(undoDepth(b.state),0);
 return {bothDirections:true,crossWindowUndo:true,originSelectionRestored:true,otherSelectionMapped:true,canonicalRedoDepth:redoDepth(b.state),windowUndoDepths:[undoDepth(left.view.state),undoDepth(right.view.state)]};
});
await test('stale window transaction rejected without applying old offsets',()=>{
 const b=makeBuffer('stale','abc'),a=mount('stale-a',b),z=mount('stale-z',b);
 const stale=z.view.state.update({changes:{from:1,to:2,insert:'WRONG'}});a.edit(0,0,'prefix');const state=b.state,rev=b.revision;
 assert.throws(()=>z.dispatch(stale),/stale view/);assert.equal(b.state,state);assert.equal(b.revision,rev);assert.equal(raw(z.view.state),'prefixabc');
 // ABA: original text restored does not make the old transaction current again.
 a.undo();assert.equal(raw(b.state),'abc');assert.throws(()=>z.dispatch(stale),/stale view/);
 const other=makeBuffer('stale-other','abc');z.attach(other);assert.throws(()=>z.dispatch(stale),/stale view/);
 return {rejectedAfterEdit:true,rejectedAfterABA:true,rejectedAfterBufferSwitch:true,noMutationOnReject:true};
});
await test('revision-checked external conflict never overwrites dirty buffer',async()=>{
 const b=makeBuffer('conflict','disk'),w=mount('conflict-w',b);w.edit(4,4,'+local');files.put(b.key,'external');
 assert.deepEqual(b.externalCheck(),{changed:true,conflict:true,revision:2});const state=b.state;const result=await b.save();assert.equal(result.result.conflict,true);assert.equal(b.state,state);assert.equal(raw(b.state),'disk+local');assert.ok(b.dirty);assert.equal(files.read(b.key).body,'external');
 return {externalConflict:true,dirtySourceUntouched:true,failedSaveDoesNotAdvanceBaseline:b.saved==='disk'};
});
await test('save captures source; newer edit while completion pending remains dirty',async()=>{
 const b=makeBuffer('race','base'),w=mount('race-w',b);w.edit(4,4,'1');let release;const gate=new Promise(r=>release=r);const pending=b.save(gate);w.edit(5,5,'2');release();const result=await pending;
 assert.ok(result.result.ok);assert.equal(files.read(b.key).body,'base1');assert.equal(b.saved,'base1');assert.equal(raw(b.state),'base12');assert.ok(b.dirty);assert.ok(result.currentRevision>result.capturedRevision);await b.save();assert.equal(files.read(b.key).body,'base12');assert.equal(b.dirty,false);
 return {capturedSourceSaved:true,newerSourcePreserved:true,dirtyAfterOldCompletion:result.dirty,cleanAfterNextSave:true};
});
await test('save CAS checks revision at completion, not at capture',async()=>{
 const b=makeBuffer('cas-race','base'),w=mount('cas-w',b);w.edit(4,4,'local');let release;const pending=b.save(new Promise(r=>release=r));files.put(b.key,'external-during-save');release();const result=await pending;
 assert.ok(result.result.conflict);assert.equal(files.read(b.key).body,'external-during-save');assert.equal(raw(b.state),'baselocal');assert.ok(b.dirty);return {completionCASConflict:true};
});
await test('workspace + stable file identity; paths are labels, not keys',()=>{
 const a=makeBuffer('file-1','one','workspace-1','/same'),b=makeBuffer('file-1','two','workspace-2','/same'),c=makeBuffer('file-2','three','workspace-1','/same');
 assert.equal(new Set([a.key,b.key,c.key]).size,3);const w=mount('identity-w',a);w.edit(0,0,'dirty');assert.equal(raw(b.state),'two');assert.equal(raw(c.state),'three');const key=a.key;a.path='/renamed';assert.equal(a.key,key);assert.ok(a.dirty);return {samePathDistinctBuffers:3,renameRetainsIdentity:true};
});
await test('origin cursor movement after edit does not replace undo selection; multiple ranges map',()=>{
 const b=makeBuffer('multi','abcdefghij'),a=mount('multi-a',b),z=mount('multi-z',b);
 a.view.dispatch({selection:EditorSelection.create([EditorSelection.range(1,2),EditorSelection.range(4,5)],1)});
 const before=a.view.state.selection;
 z.view.dispatch({selection:EditorSelection.create([EditorSelection.cursor(7),EditorSelection.range(8,10)],1)});
 const otherBefore=z.view.state.selection;
 a.view.dispatch({changes:[{from:1,to:2,insert:'XX'},{from:4,to:5,insert:'YY'}],selection:EditorSelection.create([EditorSelection.cursor(3),EditorSelection.cursor(7)],1),userEvent:'input.type'});
 a.select(0);const canonicalBeforeUndo=b.state;assert.notDeepEqual(a.view.state.selection.toJSON(),canonicalBeforeUndo.selection.toJSON());
 assert.ok(z.undo());assert.equal(raw(b.state),'abcdefghij');assert.deepEqual(a.view.state.selection.toJSON(),before.toJSON());assert.deepEqual(z.view.state.selection.toJSON(),otherBefore.toJSON());
 return {originMovementIgnoredForHistory:true,multipleRangesRestored:true,otherMultipleRangesMapped:true};
});
const fixtures={LF:'α\n中😀\ntail\n',CRLF:'α\r\n中😀\r\ntail\r\n',loneCR:'α\r中😀\rtail\r',NUL:'a\0b\n中\0😀',Unicode:'中😀e\u0301\n𐐀尾',noFinalNewline:'alpha\nbeta',finalNewline:'alpha\nbeta\n',empty:'',mixed:'a\r\nb\nc\rd\0😀'};
for(const [label,body] of Object.entries(fixtures)) await test(`exact source preservation: ${label}`,async()=>{
 const b=makeBuffer(`raw-${label}`,body),a=mount(`raw-a-${label}`,b),z=mount(`raw-z-${label}`,b);
 assert.equal(raw(b.state),body);assert.equal(b.state.doc.length,body.length);z.select(body.length);a.select(0);const insert='Q\r\n中\0😀\rEND\n';a.edit(0,0,insert);assert.equal(raw(z.view.state),insert+body);assert.ok(z.undo());assert.equal(raw(b.state),body);
 const end=b.state.doc.length;a.edit(end,end,'尾\0😀');assert.equal(raw(b.state),body+'尾\0😀');assert.ok(z.undo());assert.equal(raw(b.state),body);
 // Delete whole source and undo: exact line terminators, EOF and nulls survive history.
 if(body.length){a.edit(0,b.state.doc.length,'');assert.equal(raw(b.state),'');assert.ok(z.undo());assert.equal(raw(b.state),body);}
 const saved=await b.save();assert.ok(saved.result.ok);assert.equal(files.read(b.key).body,body);assert.equal(b.dirty,false);
 return {utf16Units:body.length,utf8Bytes:BufferBytes(body),byteEqualAfterUndoAndSave:true,lineSeparator:'LF',cmLines:b.state.doc.lines};
});
function BufferBytes(text){return new TextEncoder().encode(text).length;}
await test('window selection movement cannot add independent history',()=>{
 const b=makeBuffer('selection-only','abcdef'),a=mount('select-a',b),z=mount('select-z',b);a.select(1,3);z.select(4,6);a.select(2);assert.equal(undoDepth(b.state),0);assert.equal(a.undo(),false);assert.equal(z.undo(),false);assert.equal(raw(b.state),'abcdef');return {canonicalHistoryDepth:0,windowHistoryDepth:0};
});
for(const w of windows)w.destroy();await new Promise(r=>setTimeout(r,30));dom.window.close();
const versions={node:process.version};for(const name of ['@codemirror/state','@codemirror/view','@codemirror/commands','jsdom'])versions[name]=JSON.parse(fs.readFileSync(new URL(`./node_modules/${name}/package.json`,import.meta.url))).version;
const output={scope:'Disposable public API jsdom correctness spike; no UX/performance/production claim',versions,summary:{passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length},tests:results};
fs.writeFileSync(new URL('./buffer-window.results.json',import.meta.url),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));process.exitCode=output.summary.failed?1:0;
