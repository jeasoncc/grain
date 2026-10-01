import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const dom = new JSDOM('<!doctype html><body></body>', {pretendToBeVisual:true});
for (const name of ['window','Window','document','MutationObserver','HTMLElement','Node','Text','Event','KeyboardEvent','CustomEvent','DOMRect','Range','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']) Object.defineProperty(globalThis,name,{value: typeof dom.window[name] === 'function' && ['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(name) ? dom.window[name].bind(dom.window) : dom.window[name], configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
// jsdom has no layout; these stubs only unblock CM measurement, not UX validation.
dom.window.Range.prototype.getClientRects = () => [];
dom.window.Range.prototype.getBoundingClientRect = () => new dom.window.DOMRect(0,0,0,0);
const {EditorState} = await import('@codemirror/state');
const {EditorView,drawSelection,keymap} = await import('@codemirror/view');
const {history,undo,undoDepth,defaultKeymap} = await import('@codemirror/commands');
const {vim,Vim,getCM} = await import('@replit/codemirror-vim');
const results=[];
const lineSeparatorFor = content => content.includes('\r\n') ? '\r\n' : content.includes('\r') ? '\r' : '\n';
const state = text => EditorState.create({doc:text,extensions:[vim(),history({newGroupDelay:0}),EditorState.lineSeparator.of(lineSeparatorFor(text)),drawSelection(),keymap.of(defaultKeymap)]});
const mount = text => {const host=document.body.appendChild(document.createElement('div')); return new EditorView({state:state(text),parent:host});};
const raw = view => view.state.sliceDoc(); // repo's save serialization, NOT doc.toString()
const keys = (v,...ks) => { for (const k of ks) {const cm=getCM(v); cm.operation(()=>Vim.handleKey(cm,k,'user'));} };
function test(name,fn) {try {const details=fn(); results.push({name,status:'PASS',details});} catch(e) {results.push({name,status:'FAIL',error:e.stack});}}
const views=[]; const make = s => {const v=mount(s);views.push(v);return v;};
test('mount and DOM keydown normal -> insert -> normal; dd/u',()=>{
 const v=make('one\ntwo\nthree'); assert.ok(getCM(v)); assert.ok(v.contentDOM.isConnected);
 const dispatch = (key,code) => v.contentDOM.dispatchEvent(new KeyboardEvent('keydown',{key,code,bubbles:true,cancelable:true}));
 assert.equal(!!getCM(v).state.vim.insertMode,false);dispatch('i','KeyI');assert.equal(getCM(v).state.vim.insertMode,true);dispatch('Escape','Escape');assert.equal(getCM(v).state.vim.insertMode,false);
 dispatch('d','KeyD');dispatch('d','KeyD');assert.equal(raw(v),'two\nthree');dispatch('u','KeyU');assert.equal(raw(v),'one\ntwo\nthree'); return {text:raw(v),undoDepth:undoDepth(v.state)};
});
const fixtures={LF:'α\n中😀\ntail\n',CRLF:'α\r\n中😀\r\ntail\r\n',loneCR:'α\r中😀\rtail\r',NUL:'a\0b\n中\0😀',Unicode:'中😀e\u0301\n𐐀尾',noFinalNewline:'alpha\nbeta',finalNewline:'alpha\nbeta\n',empty:'',mixed:'a\r\nb\nc\rd\0😀'};
for(const [label,text] of Object.entries(fixtures)) {
 test(`raw preservation ${label}: insert/Vim undo + Vim delete/u`,()=>{
  const v=make(text); assert.equal(raw(v),text); const separator=v.state.lineBreak;
  keys(v,'i'); v.dispatch({changes:{from:0,insert:'Z中😀'},selection:{anchor:4},userEvent:'input.type'}); keys(v,'<Esc>'); assert.equal(raw(v),'Z中😀'+text);keys(v,'u');assert.equal(raw(v),text);
  // Controlled CM insertion, not browser text input/IME. Explicit separator in inserted text.
  keys(v,'i');v.dispatch({changes:{from:0,insert:'Q'+separator+'中\0😀'},userEvent:'input.type'});assert.equal(raw(v),'Q'+separator+'中\0😀'+text);assert.equal(undo(v),true);assert.equal(raw(v),text);keys(v,'<Esc>');
  v.dispatch({selection:{anchor:v.state.doc.length}});keys(v,'i');v.dispatch({changes:{from:v.state.doc.length,insert:'尾\0😀'},userEvent:'input.type'});assert.equal(raw(v),text+'尾\0😀');keys(v,'<Esc>','u');assert.equal(raw(v),text);
  // Last physical line deletion (including empty EOF line) and exact undo.
  if(text.length) {v.dispatch({selection:{anchor:v.state.doc.length}});keys(v,'d','d');if(raw(v)!==text) {keys(v,'u');assert.equal(raw(v),text);}}
  // Vim x for nonempty, then undo; dd exercises line boundaries except empty.
  if(text.length) {v.dispatch({selection:{anchor:0}});keys(v,'x');assert.notEqual(raw(v),text);keys(v,'u');assert.equal(raw(v),text);v.dispatch({selection:{anchor:0}});keys(v,'d','d');const deleted=raw(v);keys(v,'u');assert.equal(raw(v),text);return {separator:JSON.stringify(separator),original:JSON.stringify(text),afterDD:JSON.stringify(deleted)};}
  return {separator:JSON.stringify(separator),original:JSON.stringify(text)};
 });
}
test('two saved EditorStates retain independent history, NOT Vim mode on setState',()=>{
 const v=make('A1\nA2');keys(v,'d','d');keys(v,'i'); const a=v.state, aCM=getCM(v);assert.equal(aCM.state.vim.insertMode,true);
 v.setState(state('B1\nB2'));const bCM=getCM(v);assert.notEqual(aCM,bCM);assert.equal(!!bCM.state.vim.insertMode,false);keys(v,'d','d');const b=v.state;
 v.setState(a);const restoredMode=!!getCM(v).state.vim.insertMode;assert.equal(raw(v),'A2');keys(v,'u');assert.equal(raw(v),'A1\nA2');const aRestored=v.state;
 v.setState(b);assert.equal(raw(v),'B2');keys(v,'u');assert.equal(raw(v),'B1\nB2');v.setState(aRestored);assert.equal(raw(v),'A1\nA2');assert.equal(restoredMode,false);
 return {historyIndependent:true,insertModeSurvivesStateSwitch:restoredMode,adapterRecreated:true};
});
test('two live views retain separate modes; named register shared',()=>{
 const a=make('A1\nA2'),b=make('B1\nB2');keys(a,'i');assert.equal(getCM(a).state.vim.insertMode,true);assert.equal(!!getCM(b).state.vim.insertMode,false);keys(a,'<Esc>','"','a','y','y');keys(b,'"','a','p');assert.equal(raw(b),'B1\nA1\nB2');return {textB:raw(b),registerCrossView:true};
});
test('public Vim.handleKey named register yank/put',()=>{
 const v=make('one\ntwo');keys(v,'"','a','y','y','j','"','a','p');assert.equal(raw(v),'one\ntwo\none');return {text:raw(v)};
});
test('public Vim.handleKey dot repeats dd',()=>{
 const v=make('one\ntwo\nthree\nfour');keys(v,'d','d','.');assert.equal(raw(v),'three\nfour');return {text:raw(v)};
});
test('public Vim.handleKey macro qa dd q @a',()=>{
 const v=make('one\ntwo\nthree\nfour');keys(v,'q','a','d','d','q','@','a');assert.equal(raw(v),'three\nfour');return {text:raw(v)};
});
test('CRLF serialization requires sliceDoc, doc.toString differs',()=>{const v=make('a\r\nb\r\n');assert.equal(v.state.doc.toString(),'a\nb\n');assert.equal(raw(v),'a\r\nb\r\n');return {sliceDoc:JSON.stringify(raw(v)),toString:JSON.stringify(v.state.doc.toString())};});
for(const v of views)v.destroy();
await new Promise(resolve=>setTimeout(resolve,30));dom.window.close();
fs.writeFileSync(new URL('./vim-raw-source.results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2)); console.log(`${results.filter(r=>r.status==='PASS').length}/${results.length} pass`);
process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
