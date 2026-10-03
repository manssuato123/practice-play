(() => {
"use strict";
const STORAGE_KEY="englishPracticeStatic.v2", OLD_KEY="englishPracticeStatic.v1", $=id=>document.getElementById(id);
const el={setupView:$("setupView"),trainingView:$("trainingView"),saveStatus:$("saveStatus"),materialSelect:$("materialSelect"),materialName:$("materialName"),materialInput:$("materialInput"),newMaterialBtn:$("newMaterialBtn"),deleteMaterialBtn:$("deleteMaterialBtn"),analyseBtn:$("analyseBtn"),startTrainingBtn:$("startTrainingBtn"),summaryGroups:$("summaryGroups"),totalItemsStat:$("totalItemsStat"),uncategorizedBox:$("uncategorizedBox"),exportBtn:$("exportBtn"),importInput:$("importInput"),backSetupBtn:$("backSetupBtn"),trainingMaterialName:$("trainingMaterialName"),progressText:$("progressText"),levelSelect:$("levelSelect"),levelBadge:$("levelBadge"),secondsNumber:$("secondsNumber"),secondsRange:$("secondsRange"),autoAdvanceCheck:$("autoAdvanceCheck"),fontDownBtn:$("fontDownBtn"),fontResetBtn:$("fontResetBtn"),fontUpBtn:$("fontUpBtn"),stage:$("stage"),displayText:$("displayText"),answerPanel:$("answerPanel"),answerInput:$("answerInput"),checkBtn:$("checkBtn"),feedback:$("feedback"),countdownText:$("countdownText"),prevItemBtn:$("prevItemBtn"),replayBtn:$("replayBtn"),nextItemBtn:$("nextItemBtn"),prevLevelBtn:$("prevLevelBtn"),pauseBtn:$("pauseBtn"),nextLevelBtn:$("nextLevelBtn"),toast:$("toast")};

let state=loadState(),parsed=null,hideTimer=null,countTimer=null,advanceTimer=null,isPaused=false,saveTimer=null;

function uid(){return"m_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7)}
function newMaterial(name="Meu material"){return{id:uid(),name,raw:"",settings:{seconds:3,fontBoost:0,autoAdvance:false},progress:{levelKey:"letters-2",index:0,draft:""}}}
function defaultState(){const m=newMaterial();return{version:2,activeId:m.id,materials:[m]}}
function loadState(){try{const raw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem(OLD_KEY);if(!raw)return defaultState();const s=JSON.parse(raw);if(!Array.isArray(s.materials)||!s.materials.length)return defaultState();s.version=2;s.materials.forEach(m=>{m.settings=Object.assign({seconds:3,fontBoost:0,autoAdvance:false},m.settings||{});m.progress=Object.assign({levelKey:"letters-2",index:0,draft:""},m.progress||{})});if(!s.materials.some(m=>m.id===s.activeId))s.activeId=s.materials[0].id;return s}catch{return defaultState()}}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));el.saveStatus.textContent="✓ Salvo automaticamente";el.saveStatus.classList.remove("saving")}
function saveSoon(){el.saveStatus.textContent="Salvando…";el.saveStatus.classList.add("saving");clearTimeout(saveTimer);saveTimer=setTimeout(saveState,180)}
function active(){return state.materials.find(m=>m.id===state.activeId)||state.materials[0]}
function normItem(s){return s.replace(/\s+/g," ").trim()}
function words(s){try{return s.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)||[]}catch{return s.match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g)||[]}}
function letters(s){try{return(s.match(/\p{L}/gu)||[]).length}catch{return(s.match(/[A-Za-z]/g)||[]).length}}
function sentenceParts(text){const m=text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];return m.map(normItem).filter(Boolean)}
function uniqueItems(items){const seen=new Set();return items.filter(x=>{const k=normItem(x).toLocaleLowerCase();if(seen.has(k))return false;seen.add(k);return true})}

function parse(raw){
  const base=uniqueItems(raw.split("|").map(normItem).filter(Boolean)),levels=[],map={};
  const add=(g,k,l,items)=>{const v={group:g,key:k,label:l,items:uniqueItems(items)};levels.push(v);map[k]=v};

  for(let n=2;n<=7;n++)
    add("letters","letters-"+n,n+" letras",base.filter(x=>{const w=words(x);return w.length===1&&letters(w[0])===n}));

  for(let n=2;n<=10;n++)
    add("words","words-"+n,n+" palavras",base.filter(x=>words(x).length===n));

  let sentences=[];
  base.forEach(x=>sentences.push(...sentenceParts(x)));
  sentences=uniqueItems(sentences);

  for(let n=1;n<=4;n++){
    const items=[];
    for(let i=0;i+n<=sentences.length;i++)
      items.push(sentences.slice(i,i+n).join(" "));
    add("sentences","sentences-"+n,n===1?"1 frase":n+" frases",items);
  }

  const categorized=new Set();
  base.forEach(x=>{
    const w=words(x);
    if(w.length===1&&letters(w[0])>=2&&letters(w[0])<=7)categorized.add(x);
    if(w.length>=2&&w.length<=10)categorized.add(x);
    if(sentenceParts(x).length)categorized.add(x);
  });

  return{base,levels,map,uncategorized:base.filter(x=>!categorized.has(x))}
}

function groupTitle(g){return g==="letters"?"🔤 Por número de letras":g==="words"?"🧠 Por número de palavras":"📝 Por número de frases"}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function renderSelect(){el.materialSelect.innerHTML="";state.materials.forEach(m=>{const o=document.createElement("option");o.value=m.id;o.textContent=m.name||"Sem nome";o.selected=m.id===state.activeId;el.materialSelect.appendChild(o)})}
function loadForm(){const m=active();el.materialName.value=m.name||"";el.materialInput.value=m.raw||"";renderSelect();parsed=parse(m.raw||"");renderSummary()}
function sync(){const m=active();m.name=el.materialName.value.trim()||"Meu material";m.raw=el.materialInput.value;parsed=parse(m.raw);renderSelect();renderSummary();saveSoon()}

function renderSummary(){
  if(!parsed)parsed=parse(active().raw||"");
  el.totalItemsStat.textContent=parsed.base.length+" itens";
  el.summaryGroups.innerHTML="";

  ["letters","words","sentences"].forEach(g=>{
    const section=document.createElement("div");
    section.className="summary-section";

    const h=document.createElement("h3");
    h.textContent=groupTitle(g);
    section.appendChild(h);

    const grid=document.createElement("div");
    grid.className="summary-grid";

    parsed.levels.filter(l=>l.group===g).forEach(l=>{
      const b=document.createElement("button");
      b.className="summary-tile";
      b.type="button";
      b.innerHTML="<strong>"+l.items.length+"</strong><span>"+escapeHtml(l.label)+"</span>";

      b.onclick=()=>{
        if(!l.items.length)return toast("Ainda não há itens em "+l.label);
        active().progress.levelKey=l.key;
        active().progress.index=0;
        active().progress.draft="";
        saveState();
        startTraining();
      };

      grid.appendChild(b);
    });

    section.appendChild(grid);
    el.summaryGroups.appendChild(section);
  });

  if(parsed.uncategorized.length){
    el.uncategorizedBox.classList.remove("hidden");
    el.uncategorizedBox.textContent=parsed.uncategorized.length+" item(ns) fora dos níveis atuais.";
  }else{
    el.uncategorizedBox.classList.add("hidden");
  }
}

function available(){if(!parsed)parsed=parse(active().raw||"");return parsed.levels.filter(l=>l.items.length)}

function renderLevelSelect(){
  const levels=available(),m=active();
  el.levelSelect.innerHTML="";

  if(!levels.length)return;

  if(!levels.some(l=>l.key===m.progress.levelKey)){
    m.progress.levelKey=levels[0].key;
    m.progress.index=0;
  }

  ["letters","words","sentences"].forEach(g=>{
    const list=levels.filter(l=>l.group===g);
    if(!list.length)return;

    const og=document.createElement("optgroup");
    og.label=groupTitle(g).replace(/^[^ ]+ /,"");

    list.forEach(l=>{
      const o=document.createElement("option");
      o.value=l.key;
      o.textContent=l.label+" ("+l.items.length+")";
      o.selected=l.key===m.progress.levelKey;
      og.appendChild(o);
    });

    el.levelSelect.appendChild(og);
  });
}

function level(){return parsed.map[active().progress.levelKey]||available()[0]||null}

function item(){
  const l=level();
  if(!l)return"";

  const m=active();
  m.progress.index=Math.max(0,Math.min(m.progress.index,l.items.length-1));

  return l.items[m.progress.index];
}

function clamp(v){
  v=Math.round(Number(v)||3);
  return Math.max(1,Math.min(300,v));
}

function fontSize(text){
  const boost=Number(active().settings.fontBoost||0),wc=words(text).length,ch=text.length;
  let s;

  if(wc<=1)s=ch<=3?104:ch<=5?92:ch<=7?80:70;
  else if(wc<=3)s=64;
  else if(wc<=6)s=50;
  else if(wc<=10)s=39;
  else if(ch<=180)s=30;
  else if(ch<=320)s=24;
  else s=20;

  return Math.max(14,Math.min(116,s+boost));
}

function fitDisplayText(text){
  let size=fontSize(text);

  el.displayText.style.fontSize=size+"px";

  requestAnimationFrame(()=>{
    if(!el.stage||el.displayText.classList.contains("hidden"))return;

    const s=getComputedStyle(el.stage);

    const maxW=
      el.stage.clientWidth-
      parseFloat(s.paddingLeft)-
      parseFloat(s.paddingRight);

    const maxH=
      el.stage.clientHeight-
      parseFloat(s.paddingTop)-
      parseFloat(s.paddingBottom);

    let guard=100;

    while(
      guard-->0 &&
      size>14 &&
      (
        el.displayText.scrollWidth>maxW ||
        el.displayText.scrollHeight>maxH
      )
    ){
      size-=2;
      el.displayText.style.fontSize=size+"px";
    }
  });
}

function clearTimers(){
  clearTimeout(hideTimer);
  clearInterval(countTimer);
  clearTimeout(advanceTimer);

  hideTimer=null;
  countTimer=null;
  advanceTimer=null;
}

function updateMeta(){
  const l=level(),m=active();
  if(!l)return;

  el.levelBadge.textContent=l.label;
  el.progressText.textContent="Item "+(m.progress.index+1)+" de "+l.items.length;
  el.levelSelect.value=l.key;
}

function showCurrent(){
  clearTimers();

  isPaused=false;
  el.pauseBtn.textContent="⏸ Pausar";

  const x=item(),l=level();

  if(!l||!x)return;

  updateMeta();

  el.feedback.textContent="";
  el.feedback.className="feedback";

  el.answerPanel.classList.add("hidden");

  el.displayText.textContent=x;
  el.displayText.classList.remove("hidden");

  fitDisplayText(x);

  const sec=clamp(active().settings.seconds);
  let remain=sec;

  el.countdownText.textContent=remain+"s";

  countTimer=setInterval(()=>{
    remain--;
    el.countdownText.textContent=Math.max(0,remain)+"s";
  },1000);

  hideTimer=setTimeout(showAnswerBox,sec*1000);

  saveState();
}

function showAnswerBox(){
  clearTimeout(hideTimer);
  clearInterval(countTimer);

  hideTimer=null;
  countTimer=null;

  el.displayText.classList.add("hidden");
  el.answerPanel.classList.remove("hidden");

  el.countdownText.textContent="escreva";

  el.answerInput.value=active().progress.draft||"";

  el.feedback.textContent="";
  el.feedback.className="feedback";

  setTimeout(()=>el.answerInput.focus(),30);
}

function normalizeAnswer(s){
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[“”]/g,'"')
    .replace(/[‘’]/g,"'")
    .replace(/[.!?,;:]+$/g,"")
    .replace(/\s+/g," ")
    .trim();
}

function isCorrectAnswer(given){
  return normalizeAnswer(given)===normalizeAnswer(item());
}

function checkAnswer(){
  const given=el.answerInput.value;

  active().progress.draft=given;
  saveState();

  if(!given.trim()){
    el.feedback.textContent="Escreva sua resposta.";
    el.feedback.className="feedback error";
    return false;
  }

  if(isCorrectAnswer(given)){
    el.feedback.textContent="✅ Certo!";
    el.feedback.className="feedback ok";

    active().progress.draft="";
    saveState();

    if(active().settings.autoAdvance){
      clearTimeout(advanceTimer);
      advanceTimer=setTimeout(nextItem,250);
    }

    return true;
  }

  el.feedback.textContent="❌ Ainda não. Tente novamente ou use “Mostrar de novo”.";
  el.feedback.className="feedback error";

  return false;
}

function checkWhileTyping(){
  clearTimeout(advanceTimer);
  advanceTimer=null;

  const given=el.answerInput.value;

  active().progress.draft=given;
  saveSoon();

  el.feedback.textContent="";
  el.feedback.className="feedback";

  if(
    active().settings.autoAdvance &&
    given.trim() &&
    isCorrectAnswer(given)
  ){
    el.feedback.textContent="✅ Certo!";
    el.feedback.className="feedback ok";

    active().progress.draft="";
    saveState();

    advanceTimer=setTimeout(nextItem,250);
  }
}

function startTraining(){
  sync();

  parsed=parse(active().raw||"");

  if(!available().length)
    return toast("Coloque material válido primeiro.");

  el.setupView.classList.add("hidden");
  el.trainingView.classList.remove("hidden");

  const m=active();

  el.trainingMaterialName.textContent=m.name;

  el.secondsNumber.value=clamp(m.settings.seconds);
  el.secondsRange.value=clamp(m.settings.seconds);
  el.autoAdvanceCheck.checked=!!m.settings.autoAdvance;

  renderLevelSelect();
  showCurrent();
}

function nextItem(){
  clearTimers();

  const l=level(),m=active();

  if(!l)return;

  m.progress.index=
    m.progress.index<l.items.length-1
      ?m.progress.index+1
      :0;

  m.progress.draft="";

  saveState();
  showCurrent();
}

function prevItem(){
  clearTimers();

  const l=level(),m=active();

  if(!l)return;

  m.progress.index=
    m.progress.index>0
      ?m.progress.index-1
      :l.items.length-1;

  m.progress.draft="";

  saveState();
  showCurrent();
}

function moveLevel(d){
  const levels=available(),m=active();

  const i=levels.findIndex(x=>x.key===m.progress.levelKey);

  if(i<0)return;

  const n=(i+d+levels.length)%levels.length;

  m.progress.levelKey=levels[n].key;
  m.progress.index=0;
  m.progress.draft="";

  saveState();
  renderLevelSelect();
  showCurrent();
}

function setSeconds(v){
  v=clamp(v);

  active().settings.seconds=v;

  el.secondsNumber.value=v;
  el.secondsRange.value=v;

  saveState();

  if(!el.trainingView.classList.contains("hidden"))
    showCurrent();
}

function togglePause(){
  if(isPaused){
    isPaused=false;
    showCurrent();
  }else{
    isPaused=true;
    clearTimers();

    el.pauseBtn.textContent="▶ Continuar";
    el.countdownText.textContent="pausado";
  }
}

function toast(t){
  el.toast.textContent=t;
  el.toast.classList.remove("hidden");

  clearTimeout(toast.t);

  toast.t=setTimeout(
    ()=>el.toast.classList.add("hidden"),
    1800
  );
}

function exportBackup(){
  sync();

  const blob=new Blob(
    [JSON.stringify(state,null,2)],
    {type:"application/json"}
  );

  const u=URL.createObjectURL(blob);
  const a=document.createElement("a");

  a.href=u;
  a.download="english-practice-backup.json";
  a.click();

  URL.revokeObjectURL(u);
}

async function importBackup(file){
  if(!file)return;

  try{
    const s=JSON.parse(await file.text());

    if(!s.materials?.length)
      throw Error("Backup inválido");

    state=s;
    state.version=2;

    state.materials.forEach(m=>{
      m.settings=Object.assign(
        {seconds:3,fontBoost:0,autoAdvance:false},
        m.settings||{}
      );

      m.progress=Object.assign(
        {levelKey:"letters-2",index:0,draft:""},
        m.progress||{}
      );
    });

    if(!state.materials.some(m=>m.id===state.activeId))
      state.activeId=state.materials[0].id;

    saveState();
    loadForm();
    toast("Backup importado.");

  }catch(e){
    alert("Não consegui importar: "+e.message);
  }finally{
    el.importInput.value="";
  }
}

el.materialSelect.onchange=()=>{
  sync();
  state.activeId=el.materialSelect.value;
  saveState();
  loadForm();
};

el.materialName.oninput=sync;
el.materialInput.oninput=sync;

el.newMaterialBtn.onclick=()=>{
  const m=newMaterial("Material "+(state.materials.length+1));

  state.materials.push(m);
  state.activeId=m.id;

  saveState();
  loadForm();
};

el.deleteMaterialBtn.onclick=()=>{
  const m=active();

  if(!confirm("Excluir ‘"+m.name+"’?"))return;

  if(state.materials.length===1){
    const n=newMaterial();

    state.materials=[n];
    state.activeId=n.id;
  }else{
    state.materials=
      state.materials.filter(x=>x.id!==m.id);

    state.activeId=
      state.materials[0].id;
  }

  saveState();
  loadForm();
};

el.analyseBtn.onclick=()=>{
  sync();
  toast("Material organizado.");
};

el.startTrainingBtn.onclick=startTraining;
el.exportBtn.onclick=exportBackup;

el.importInput.onchange=
  e=>importBackup(e.target.files[0]);

el.backSetupBtn.onclick=()=>{
  clearTimers();

  el.trainingView.classList.add("hidden");
  el.setupView.classList.remove("hidden");

  loadForm();
};

el.levelSelect.onchange=()=>{
  active().progress.levelKey=el.levelSelect.value;
  active().progress.index=0;
  active().progress.draft="";

  saveState();
  showCurrent();
};

el.secondsNumber.onchange=
  e=>setSeconds(e.target.value);

el.secondsRange.oninput=
  e=>el.secondsNumber.value=e.target.value;

el.secondsRange.onchange=
  e=>setSeconds(e.target.value);

document
  .querySelectorAll("[data-sec]")
  .forEach(
    b=>b.onclick=()=>setSeconds(b.dataset.sec)
  );

el.autoAdvanceCheck.onchange=()=>{
  active().settings.autoAdvance=
    el.autoAdvanceCheck.checked;

  saveState();

  if(
    el.autoAdvanceCheck.checked &&
    !el.answerPanel.classList.contains("hidden") &&
    el.answerInput.value.trim() &&
    isCorrectAnswer(el.answerInput.value)
  ){
    checkWhileTyping();
  }
};

el.fontDownBtn.onclick=()=>{
  active().settings.fontBoost=
    Math.max(
      -50,
      Number(active().settings.fontBoost||0)-4
    );

  saveState();
  showCurrent();
};

el.fontResetBtn.onclick=()=>{
  active().settings.fontBoost=0;

  saveState();
  showCurrent();
};

el.fontUpBtn.onclick=()=>{
  active().settings.fontBoost=
    Math.min(
      50,
      Number(active().settings.fontBoost||0)+4
    );

  saveState();
  showCurrent();
};

el.prevItemBtn.onclick=prevItem;
el.nextItemBtn.onclick=nextItem;
el.replayBtn.onclick=showCurrent;

el.prevLevelBtn.onclick=()=>moveLevel(-1);
el.nextLevelBtn.onclick=()=>moveLevel(1);

el.pauseBtn.onclick=togglePause;

el.checkBtn.onclick=checkAnswer;

el.answerInput.oninput=checkWhileTyping;

el.answerInput.onkeydown=e=>{
  if(e.key==="Enter"){
    e.preventDefault();
    checkAnswer();
  }
};

document.addEventListener("keydown",e=>{
  if(el.trainingView.classList.contains("hidden"))return;

  if(document.activeElement===el.answerInput)return;

  if(e.key==="ArrowLeft"){
    e.preventDefault();
    prevItem();
  }else if(e.key==="ArrowRight"){
    e.preventDefault();
    nextItem();
  }else if(e.code==="Space"){
    e.preventDefault();
    showCurrent();
  }
});

window.addEventListener("resize",()=>{
  if(
    !el.trainingView.classList.contains("hidden") &&
    !el.displayText.classList.contains("hidden")
  ){
    fitDisplayText(item());
  }
});

window.addEventListener("beforeunload",saveState);

loadForm();
})();
