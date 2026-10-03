(() => {
"use strict";
const KEY="englishPracticeStatic.v1";
const $=id=>document.getElementById(id);
const E={
 setup:$("setupView"),train:$("trainingView"),save:$("saveStatus"),
 select:$("materialSelect"),name:$("materialName"),input:$("materialInput"),
 newBtn:$("newMaterialBtn"),delBtn:$("deleteMaterialBtn"),analyse:$("analyseBtn"),
 start:$("startTrainingBtn"),summary:$("summaryGroups"),total:$("totalItemsStat"),
 unc:$("uncategorizedBox"),exportBtn:$("exportBtn"),importInput:$("importInput"),
 back:$("backSetupBtn"),trainName:$("trainingMaterialName"),progress:$("progressText"),
 level:$("levelSelect"),badge:$("levelBadge"),secNum:$("secondsNumber"),secRange:$("secondsRange"),
 auto:$("autoAdvanceCheck"),fontDown:$("fontDownBtn"),fontReset:$("fontResetBtn"),
 fontUp:$("fontUpBtn"),text:$("displayText"),hint:$("hiddenHint"),count:$("countdownText"),
 prev:$("prevItemBtn"),replay:$("replayBtn"),next:$("nextItemBtn"),
 prevLevel:$("prevLevelBtn"),nextLevel:$("nextLevelBtn"),pause:$("pauseBtn"),toast:$("toast")
};
let timers=[], parsed=null, paused=false, saveT=null;

const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const blank=(name="Meu material")=>({id:uid(),name,raw:"",settings:{seconds:3,fontBoost:0,autoAdvance:false},progress:{levelKey:"letters-2",index:0}});
function defaultState(){const m=blank();return{activeId:m.id,materials:[m]}}
function load(){
 try{
  const s=JSON.parse(localStorage.getItem(KEY));
  if(!s||!Array.isArray(s.materials)||!s.materials.length)return defaultState();
  s.materials.forEach(m=>{
   m.settings=Object.assign({seconds:3,fontBoost:0,autoAdvance:false},m.settings||{});
   m.progress=Object.assign({levelKey:"letters-2",index:0},m.progress||{});
  });
  if(!s.materials.some(m=>m.id===s.activeId))s.activeId=s.materials[0].id;
  return s;
 }catch{return defaultState()}
}
let state=load();
const active=()=>state.materials.find(m=>m.id===state.activeId)||state.materials[0];

function save(show=true){
 localStorage.setItem(KEY,JSON.stringify(state));
 if(show){E.save.textContent="✓ Salvo automaticamente";E.save.classList.remove("saving")}
}
function scheduleSave(){
 E.save.textContent="Salvando…";E.save.classList.add("saving");
 clearTimeout(saveT);saveT=setTimeout(()=>save(true),220);
}
function words(s){
 try{return s.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)||[]}
 catch{return s.match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g)||[]}
}
function letters(s){
 try{return (s.match(/\p{L}/gu)||[]).length}
 catch{return (s.match(/[A-Za-z]/g)||[]).length}
}
const clean=s=>s.replace(/\s+/g," ").trim();
function sentences(s){
 const a=(s.match(/[^.!?]+[.!?]+/g)||[]).map(clean).filter(Boolean);
 return a;
}
function parse(raw){
 const base=raw.split("|").map(clean).filter(Boolean),levels=[],map={};
 const add=(group,key,label,items)=>{const x={group,key,label,items};levels.push(x);map[key]=x};
 for(let n=2;n<=7;n++) add("letters",`letters-${n}`,`${n} letras`,base.filter(x=>{const w=words(x);return w.length===1&&letters(w[0])===n}));
 for(let n=2;n<=10;n++) add("words",`words-${n}`,`${n} palavras`,base.filter(x=>words(x).length===n));
 const allSent=[];base.forEach(x=>allSent.push(...sentences(x)));
 for(let n=1;n<=4;n++){
  const items=[];
  for(let i=0;i+n<=allSent.length;i++)items.push(allSent.slice(i,i+n).join(" "));
  add("sentences",`sentences-${n}`,n===1?"1 frase":`${n} frases`,items);
 }
 const unc=base.filter(x=>{
  const w=words(x), l=w.length===1?letters(w[0]):0;
  return !((w.length===1&&l>=2&&l<=7)||(w.length>=2&&w.length<=10)||sentences(x).length);
 });
 return{base,levels,map,unc};
}
const groupName=g=>g==="letters"?"🔤 Por número de letras":g==="words"?"🧠 Por número de palavras":"📝 Por número de frases";

function renderSelect(){
 E.select.innerHTML="";
 state.materials.forEach(m=>{
  const o=document.createElement("option");o.value=m.id;o.textContent=m.name||"Sem nome";o.selected=m.id===state.activeId;E.select.appendChild(o);
 });
}
function sync(){
 const m=active();m.name=E.name.value.trim()||"Meu material";m.raw=E.input.value;parsed=parse(m.raw);
 renderSelect();renderSummary();scheduleSave();
}
function loadForm(){
 const m=active();E.name.value=m.name||"";E.input.value=m.raw||"";renderSelect();parsed=parse(m.raw||"");renderSummary();
}
function renderSummary(){
 E.total.textContent=`${parsed.base.length} itens`;E.summary.innerHTML="";
 ["letters","words","sentences"].forEach(g=>{
  const s=document.createElement("div");s.className="summary-section";
  s.innerHTML=`<h3>${groupName(g)}</h3>`;const grid=document.createElement("div");grid.className="summary-grid";
  parsed.levels.filter(l=>l.group===g).forEach(l=>{
   const b=document.createElement("button");b.className="summary-tile";b.innerHTML=`<strong>${l.items.length}</strong><span>${l.label}</span>`;
   b.onclick=()=>{if(!l.items.length)return toast(`Ainda não há itens em “${l.label}”.`);active().progress={levelKey:l.key,index:0};save();startTraining()};
   grid.appendChild(b);
  });s.appendChild(grid);E.summary.appendChild(s);
 });
 if(parsed.unc.length){E.unc.classList.remove("hidden");E.unc.textContent=`${parsed.unc.length} item(ns) ficaram fora dos níveis 2–7 letras / 2–10 palavras. Eles continuam salvos.`}
 else E.unc.classList.add("hidden");
}
const available=()=>parsed.levels.filter(l=>l.items.length);
function currentLevel(){return parsed.map[active().progress.levelKey]||available()[0]||null}
function currentItem(){
 const l=currentLevel();if(!l)return"";
 const m=active();m.progress.index=Math.max(0,Math.min(m.progress.index,l.items.length-1));return l.items[m.progress.index]||"";
}
function levelSelect(){
 const m=active(), a=available();E.level.innerHTML="";
 if(!a.length){E.level.innerHTML="<option>Nenhum nível com conteúdo</option>";return}
 if(!a.some(x=>x.key===m.progress.levelKey)){m.progress.levelKey=a[0].key;m.progress.index=0}
 ["letters","words","sentences"].forEach(g=>{
  const xs=a.filter(x=>x.group===g);if(!xs.length)return;
  const og=document.createElement("optgroup");og.label=groupName(g).replace(/^[^ ]+ /,"");
  xs.forEach(x=>{const o=document.createElement("option");o.value=x.key;o.textContent=`${x.label} (${x.items.length})`;o.selected=x.key===m.progress.levelKey;og.appendChild(o)});
  E.level.appendChild(og);
 });
}
function clampSec(v){v=Math.round(Number(v)||3);return Math.max(1,Math.min(300,v))}
function fontSize(t){
 const wc=words(t).length, c=t.length, boost=Number(active().settings.fontBoost||0);
 let n=wc<=1?(c<=3?104:c<=5?92:c<=7?80:70):wc<=3?64:wc<=6?50:wc<=10?39:c<=180?30:c<=320?24:20;
 return Math.max(14,Math.min(116,n+boost));
}
function clearTimers(){timers.forEach(x=>{clearTimeout(x);clearInterval(x)});timers=[]}
function show(){
 clearTimers();paused=false;E.pause.textContent="⏸ Pausar";
 const l=currentLevel(), t=currentItem();if(!l||!t)return;
 E.badge.textContent=l.label;E.progress.textContent=`Item ${active().progress.index+1} de ${l.items.length}`;E.level.value=l.key;
 E.text.textContent=t;E.text.style.fontSize=fontSize(t)+"px";E.text.classList.remove("hidden");E.hint.classList.add("hidden");
 const sec=clampSec(active().settings.seconds);let left=sec;E.count.textContent=`${left}s`;
 const int=setInterval(()=>{left--;E.count.textContent=`${Math.max(left,0)}s`},1000);timers.push(int);
 const hide=setTimeout(()=>{clearTimers();E.text.classList.add("hidden");E.hint.classList.remove("hidden");E.count.textContent="oculto";
  if(active().settings.autoAdvance&&!paused)timers.push(setTimeout(next,650));
 },sec*1000);timers.push(hide);save(false);
}
function next(){
 clearTimers();const l=currentLevel();if(!l)return;const m=active();m.progress.index=(m.progress.index+1)%l.items.length;save(false);show();
}
function prev(){
 clearTimers();const l=currentLevel();if(!l)return;const m=active();m.progress.index=(m.progress.index-1+l.items.length)%l.items.length;save(false);show();
}
function moveLevel(d){
 clearTimers();const a=available(),m=active(),i=a.findIndex(x=>x.key===m.progress.levelKey);if(i<0)return;
 const j=(i+d+a.length)%a.length;m.progress.levelKey=a[j].key;m.progress.index=0;save(false);levelSelect();show();
}
function startTraining(){
 sync();parsed=parse(active().raw||"");if(!available().length)return toast("Coloque algum material válido antes de começar.");
 E.setup.classList.add("hidden");E.train.classList.remove("hidden");E.trainName.textContent=active().name;
 E.secNum.value=active().settings.seconds;E.secRange.value=active().settings.seconds;E.auto.checked=!!active().settings.autoAdvance;
 levelSelect();show();
}
function back(){clearTimers();E.train.classList.add("hidden");E.setup.classList.remove("hidden");loadForm()}
function toast(msg){E.toast.textContent=msg;E.toast.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>E.toast.classList.add("hidden"),2000)}
function setSec(v){const s=clampSec(v);active().settings.seconds=s;E.secNum.value=s;E.secRange.value=s;save();show()}
function pause(){
 if(paused){show();return}
 paused=true;clearTimers();E.pause.textContent="▶ Continuar";E.count.textContent="pausado";
}
function exportBackup(){
 sync();const b=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");
 a.href=u;a.download="english-practice-backup.json";a.click();URL.revokeObjectURL(u);
}
async function importBackup(file){
 if(!file)return;
 try{
  const x=JSON.parse(await file.text());if(!x.materials?.length)throw Error("backup inválido");
  if(!confirm("Importar vai substituir os dados atuais deste navegador. Continuar?"))return;
  state=x;if(!state.materials.some(m=>m.id===state.activeId))state.activeId=state.materials[0].id;save();loadForm();toast("Backup importado.");
 }catch(e){alert("Não consegui importar: "+e.message)}finally{E.importInput.value=""}
}

E.name.oninput=sync;E.input.oninput=sync;
E.select.onchange=()=>{state.activeId=E.select.value;save(false);loadForm()};
E.newBtn.onclick=()=>{const m=blank(`Material ${state.materials.length+1}`);state.materials.push(m);state.activeId=m.id;save();loadForm();E.name.focus();E.name.select()};
E.delBtn.onclick=()=>{if(!confirm(`Excluir “${active().name}”?`))return;if(state.materials.length===1){const m=blank();state.materials=[m];state.activeId=m.id}else{state.materials=state.materials.filter(m=>m.id!==state.activeId);state.activeId=state.materials[0].id}save();loadForm()};
E.analyse.onclick=()=>{sync();toast("Material organizado.")};E.start.onclick=startTraining;E.exportBtn.onclick=exportBackup;E.importInput.onchange=e=>importBackup(e.target.files[0]);
E.back.onclick=back;E.prev.onclick=prev;E.next.onclick=next;E.replay.onclick=show;E.prevLevel.onclick=()=>moveLevel(-1);E.nextLevel.onclick=()=>moveLevel(1);E.pause.onclick=pause;
E.level.onchange=()=>{active().progress={levelKey:E.level.value,index:0};save(false);show()};
E.secNum.onchange=e=>setSec(e.target.value);E.secRange.oninput=e=>E.secNum.value=e.target.value;E.secRange.onchange=e=>setSec(e.target.value);
document.querySelectorAll("[data-sec]").forEach(b=>b.onclick=()=>setSec(b.dataset.sec));
E.auto.onchange=()=>{active().settings.autoAdvance=E.auto.checked;save()};
E.fontDown.onclick=()=>{active().settings.fontBoost=Math.max(-50,active().settings.fontBoost-4);save(false);show()};
E.fontUp.onclick=()=>{active().settings.fontBoost=Math.min(50,active().settings.fontBoost+4);save(false);show()};
E.fontReset.onclick=()=>{active().settings.fontBoost=0;save(false);show()};
document.onkeydown=e=>{if(E.train.classList.contains("hidden"))return;if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName))return;
 if(e.key==="ArrowLeft"){e.preventDefault();prev()}else if(e.key==="ArrowRight"){e.preventDefault();next()}else if(e.code==="Space"){e.preventDefault();show()}
};
window.addEventListener("beforeunload",()=>save(false));
loadForm();
})();
