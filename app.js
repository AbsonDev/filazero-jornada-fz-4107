/* Réplica do protótipo Carteira de Jornadas — Filazero. */

const icons={building:'<path d="M4 21V4h16v17M1 21h22M8 8h2m4 0h2M8 12h2m4 0h2M10 21v-5h4v5"/>',wallet:'<path d="M20 8V5H5a2 2 0 0 1 0-4h13v4M3 3v16a2 2 0 0 0 2 2h15V8H5a2 2 0 0 1-2-2"/><path d="M20 12h-5v5h5m-3-2.5h.1"/>',pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01"/>',shield:'<path d="m12 2 8 3v6c0 6-8 11-8 11S4 17 4 11V5l8-3Z"/><path d="m8 12 3 3 5-6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',check:'<path d="m5 12 4 4L19 6"/>',left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m9 6 6 6-6 6"/>',down:'<path d="m6 9 6 6 6-6"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',heart:'<path d="M20 13 12 21 4 13a5 5 0 0 1 8-6 5 5 0 0 1 8 6Z"/><path d="M2 12h5l2-3 4 7 2-4h7"/>',lab:'<path d="M9 3h6M10 3v7L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M8 15h8"/>',scan:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h3m-3 4h8m-1-4h1"/>',receipt:'<path d="M6 3h12v19l-3-2-3 2-3-2-3 2V3ZM9 7h6m-6 4h6m-6 4h4"/>',qr:'<path d="M3 3h6v6H3Zm12 0h6v6h-6ZM3 15h6v6H3Zm12 0h2v2h-2Zm4 4h2v2h-2Zm0-6v2h2m-6 4v2m-4-10h2"/>',reset:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>'};
const svg=(name,extra)=>'<svg class="od-icon'+(extra?' '+extra:'')+'" viewBox="0 0 24 24" aria-hidden="true">'+(icons[name]||icons.info)+'</svg>';
function hydrateIcons(){document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=svg(el.dataset.icon))}
const stages=[{name:'Recepção',title:'Tudo começa por aqui.'},{name:'Atendimentos',title:'Seus atendimentos'},{name:'Exames',title:'Exames complementares'},{name:'Procedimentos',title:'Procedimentos e orientações'},{name:'Encerramento',title:'Para concluir sua visita'}];
/* O bilhete não tem numeração: o serviço é identificado pelo nome. */
const initial=[{id:'triage',stage:0,name:'Acolhimento e triagem',icon:'heart',status:'completed',place:'Recepção · térreo',time:'Concluído às 09:10',required:true},{id:'consult',stage:1,name:'Consulta clínica',icon:'heart',status:'completed',place:'Consultório 03 · 1º andar',time:'Concluído às 09:42',required:true},{id:'lab',stage:1,name:'Coleta de sangue',icon:'lab',status:'waiting',place:'Laboratório · sala 05',time:'1º andar · setor B',minutes:8,position:3,required:true},{id:'image',stage:1,name:'Ultrassonografia',icon:'scan',status:'waiting',place:'Diagnóstico por imagem · sala 08',time:'1º andar · setor C',minutes:22,position:5,required:true},{id:'xray',stage:2,name:'Raio-X de tórax',icon:'scan',status:'future',place:'Diagnóstico por imagem · sala 02',time:'Após os atendimentos da etapa 2',required:true},{id:'medication',stage:3,name:'Aplicação de medicação',icon:'lab',status:'future',place:'Enfermagem · sala 03',time:'Após os exames da etapa 3',required:true},{id:'checkout',stage:4,name:'Orientações e saída',icon:'receipt',status:'future',place:'Recepção · térreo',time:'Após os procedimentos da etapa 4',required:true}];
const storageKey='filazero-wallet-demo-v2';
let scannedId="lab";
let tickets=structuredClone(initial),selectedStage=1,expanded={0:'triage',1:'lab',2:'xray',3:'medication',4:'checkout'},drafts={},feedbackOpen=new Set(),scrollPositions={},toastTimer;

/* —— Status da jornada · FZ-4107 §6 ——
   O status vem do backend (journey.status) e o cliente só traduz o rótulo.
   render() nunca recalcula a partir dos tickets; syncJourneyStatus() é a
   simulação do backend e roda apenas no boot e nas mutações de demonstração. */
const JOURNEY_STATUS_LABEL={Waiting:'Em andamento',InProgress:'Em andamento',Completed:'Jornada concluída',PartiallyCompleted:'Concluída parcialmente',Canceled:'Jornada cancelada'};
const journey={code:'J-00123',status:'InProgress'};
function syncJourneyStatus(){
  const all=tickets.length>0;
  const completed=tickets.filter(t=>t.status==='completed').length;
  const resolved=tickets.every(t=>['completed','canceled','skipped'].includes(t.status));
  if(all&&tickets.every(t=>t.status==='canceled'))journey.status='Canceled';
  else if(all&&completed===tickets.length)journey.status='Completed';
  else if(all&&resolved)journey.status='PartiallyCompleted';
  else journey.status='InProgress';
}

/* —— Parâmetros ——
   FZ-4107 §7: a URL vai por query param (?etapa=N&ticket=code); o hash
   #etapa-N/id quebra o accessKey no shouldUseCustomInterface e só é lido
   como legado, normalizado para query com replaceState.
   ?tab=a–f continua atendendo às pranchas de variante (comparação). */
let demoState=null; /* 'loading' | 'error' | 'empty' */
const prefersReduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollBehavior=()=>prefersReduced()?'auto':'smooth';
function readParams(){
  try{
    const params=new URLSearchParams(location.search);
    if(params.get('motion')==='off')document.documentElement.dataset.motion='off';
    const cardParam=params.get('card');
    const cardVariant=cardParam&&/^[a-f]$/.test(cardParam)?cardParam:localStorage.getItem('fz-stage-card');
    if(cardVariant&&/^[a-f]$/.test(cardVariant)){document.documentElement.dataset.stageCard=cardVariant;try{localStorage.setItem('fz-stage-card',cardVariant)}catch{}}
    const tabParam=params.get('tab');
    if(tabParam&&/^[a-f]$/.test(tabParam))document.documentElement.dataset.stageTab=tabParam;
    const navParam=params.get('nav');
    if(navParam&&/^[a-i]$/.test(navParam)){document.documentElement.dataset.stageNav=navParam;const link=document.querySelector('.toolbar-link');if(link)link.textContent='Nav · '+navParam.toUpperCase()}
    const stateParam=params.get('state');
    if(['loading','error','empty'].includes(stateParam))demoState=stateParam;
    const demoParam=params.get('demo');
    if(demoParam==='skipped')tickets.find(t=>t.id==='xray').status='skipped';
    if(demoParam==='confirmed')tickets.find(t=>t.id==='medication').status='confirmed';
  }catch{}
}
/* Lê etapa/ticket da query (1-based) e do hash legado. */
function applyLocationRoute(){
  const params=new URLSearchParams(location.search);
  const numeric=params.get('etapa');
  let stage=null,ticketId=params.get('ticket')||null,legacy=false;
  if(numeric&&/^\d+$/.test(numeric))stage=Number(numeric)-1;
  const hash=location.hash.match(/etapa-(\d)(?:\/([a-z]+))?/);
  if(hash){stage=Number(hash[1])-1;ticketId=hash[2]||ticketId;legacy=true}
  /* FZ-4107 §7: etapa válida é 1..N. Fora disso (ou ausente), fica a etapa
     ativa padrão e o primeiro cartão dela aberto — sem erro, sem tela vazia. */
  const hadRoute=stage!==null||!!ticketId;
  if(stage!==null&&stage>=0&&stage<stages.length)selectedStage=stage;
  const validTicket=ticketId?tickets.find(x=>x.id===ticketId):null;
  if(validTicket){selectedStage=validTicket.stage;expanded[validTicket.stage]=validTicket.id}
  /* O fallback só age em rota explícita e inválida: no boot limpo o cartão
     aberto continua sendo o padrão aprovado (lab na etapa 2). */
  else if(hadRoute){
    const group=tickets.filter(t=>t.stage===selectedStage);
    if(group[0])expanded[selectedStage]=group[0].id;
  }
  if(legacy)syncUrl('replace');
}
try{const saved=JSON.parse(sessionStorage.getItem(storageKey));if(saved){tickets=saved.tickets;drafts=saved.drafts||{}}}catch{}
readParams();
applyLocationRoute();
syncJourneyStatus();

const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{sessionStorage.setItem(storageKey,JSON.stringify({tickets,drafts}))}catch{}}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3600)}
/* FZ-4107 §6: etapa resolvida = todos Completed/Canceled; Skipped também resolve.
   Cancelamento não conta como conclusão — quem conta é o contador de concluídos. */
function stageDone(i){return tickets.filter(t=>t.stage===i).every(t=>['completed','canceled','skipped'].includes(t.status))}
function updateEligibility(){for(let i=1;i<stages.length;i++){if(!stageDone(i-1))continue;tickets.filter(t=>t.stage===i&&t.status==='future').forEach(t=>t.status='waiting')}}
const labels={completed:'Concluído',waiting:'Na fila',called:'É a sua vez',started:'Em atendimento',future:'Etapa futura',canceled:'Cancelado',confirmed:'Confirmado',skipped:'Não necessária'};
/* —— Motion · uma linguagem só: assentamento ——
   render() recria a faixa e os cards a cada chamada (innerHTML), então a
   chegada de um estado novo é @keyframes em nó recém-criado. O que sobrevive
   entre renders — o indicador de etapa e a barra fixa — usa transição.
   Nada anima largura, altura, top ou left: só transform, opacity e cor. */
let renderedStage=null;
const navEnter={isEntering:false,index:0};
/* O trilho rola durante o gesto: as abas são criadas uma vez em syncTabs()
   e depois só trocam de estado, para que o arrasto não perca a rolagem. */
let doneSnapshot=stages.map((_,i)=>stageDone(i));
function replayMotion(el,cls){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls)}
/* As abas são reaproveitadas entre renders. Recriar a faixa a cada gesto
   mataria a rolagem no meio do arrasto e o snap voltaria ao início. */
function syncTabs(rail,changed,dir,born){
  if(rail.childElementCount!==stages.length){
    rail.innerHTML=stages.map((_,i)=>'<button role="tab" id="tab-'+i+'" aria-controls="stage-panel" onclick="selectStage('+i+')"><span class="step-number"></span><span class="tab-text">Etapa '+(i+1)+'<small></small></span></button>').join('');
  }
  [...rail.children].forEach((tab,i)=>{
    const s=stages[i],done=stageDone(i),selected=i===selectedStage;
    tab.setAttribute('aria-selected',String(selected));
    tab.setAttribute('tabindex',selected?'0':'-1');
    tab.className='tab '+(done?'finished':'');
    tab.dataset.dir=dir||'';
    const num=tab.firstElementChild;
    if(num.dataset.done!==String(done)){num.dataset.done=String(done);num.innerHTML=done?svg('check'):('0'+(i+1))}
    tab.lastElementChild.lastElementChild.textContent=s.name;
  });
  if(changed||born.some(Boolean)){
    void rail.offsetWidth;
    [...rail.children].forEach((tab,i)=>{
      if(changed&&i===selectedStage)tab.classList.add('settling');
      if(born[i])tab.classList.add('just-done');
    });
  }
}
function renderNavProgress(mode){
  const el=document.querySelector('.nav-progress');
  if(!el)return;
  if(mode!=='h'){if(el.childElementCount)el.replaceChildren();return}
  if(!el.firstElementChild){
    el.style.setProperty('--nav-count',stages.length);
    el.style.setProperty('--nav-i',selectedStage);
    el.innerHTML=stages.map(()=>'<i></i>').join('')+'<span class="nav-progress-thumb" aria-hidden="true"></span>';
    el.dataset.enter='init';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{delete el.dataset.enter}));
  }
  el.querySelectorAll('i').forEach((seg,i)=>seg.classList.toggle('done',stageDone(i)));
  if(el.dataset.stage!==String(selectedStage)){
    el.dataset.stage=String(selectedStage);
    el.style.setProperty('--nav-i',selectedStage);
  }
}
/* FZ-4107 §5: abaixo de 370px o número da etapa some por decisão de spec. */
const skeletonHTML=()=>'<div class="skeleton-stack" aria-hidden="true"><div class="skeleton-card"><span class="sk sk-eyebrow"></span><span class="sk sk-title"></span><span class="sk sk-meta"></span></div><div class="skeleton-card"><span class="sk sk-eyebrow"></span><span class="sk sk-title"></span><span class="sk sk-meta"></span></div><div class="skeleton-card"><span class="sk sk-eyebrow"></span><span class="sk sk-title"></span><span class="sk sk-meta"></span></div></div>';
const errorHTML=()=>'<div class="state-panel" role="alert"><span class="state-icon">'+svg('info')+'</span><h3>Não foi possível atualizar sua jornada.</h3><p>Seus atendimentos continuam disponíveis. Tente de novo em instantes.</p><button class="primary" onclick="retryState()">Tentar de novo</button></div>';
const emptyHTML=()=>'<div class="state-panel"><span class="state-icon">'+svg('clock')+'</span><h3>Nenhum atendimento nesta etapa.</h3><p>Assim que houver um atendimento, ele aparece aqui.</p></div>';
function render(){
  updateEligibility();
  const changed=renderedStage!==null&&renderedStage!==selectedStage;
  const dir=changed?Math.sign(selectedStage-renderedStage):0;
  const born=stages.map((_,i)=>stageDone(i)&&!doneSnapshot[i]);
  renderedStage=selectedStage;
  doneSnapshot=stages.map((_,i)=>stageDone(i));
  const completed=tickets.filter(t=>t.status==='completed').length;
  document.getElementById('progress-label').textContent=completed+' de '+tickets.length+' atendimentos concluídos';
  /* FZ-4107 §6 — o cliente apenas lê journey.status; não recalcula o rótulo. */
  document.getElementById('global-status').textContent=JOURNEY_STATUS_LABEL[journey.status]||JOURNEY_STATUS_LABEL.InProgress;
  document.getElementById('progress-track').innerHTML=tickets.map(t=>'<span class="'+(t.status==='completed'?'done':'')+'"></span>').join('');
  const tabsEl=document.getElementById('tabs');tabsEl.classList.toggle('many',stages.length>3);syncTabs(tabsEl,changed,dir,born);
  document.getElementById('stage-panel').setAttribute('aria-labelledby','tab-'+selectedStage);
  document.getElementById('prev').innerHTML=svg('left');
  document.getElementById('next').innerHTML=svg('right');
  document.getElementById('prev').disabled=selectedStage===0;
  document.getElementById('next').disabled=selectedStage===stages.length-1;
  const navMode=document.documentElement.dataset.stageNav;const navCounter=document.querySelector('.nav-counter');
  renderNavProgress(navMode);
  if(navCounter){if(navMode==='f')navCounter.textContent='Etapa '+(selectedStage+1)+' · '+stages[selectedStage].name;else if(navMode==='i')updateNavWindow();else navCounter.textContent='Etapa '+(selectedStage+1)+' de '+stages.length}
  const group=tickets.filter(t=>t.stage===selectedStage);
  const titleEl=document.getElementById('stage-title'),countEl=document.getElementById('stage-count'),cardsEl=document.getElementById('cards'),noticeEl=document.getElementById('notice-container');
  const panel=document.getElementById('stage-panel');
  const enterEls=[titleEl,countEl,cardsEl];
  enterEls.forEach(el=>el.classList.remove('stage-enter'));
  noticeEl.classList.remove('panel-enter');
  titleEl.textContent=stages[selectedStage].title;
  countEl.textContent=group.length+(group.length===1?' atendimento':' atendimentos');
  navEnter.isEntering=changed;
  navEnter.index=0;
  panel.setAttribute('aria-busy',String(demoState==='loading'));
  if(demoState==='loading'){
    cardsEl.innerHTML=skeletonHTML();
    noticeEl.innerHTML='';
    navEnter.isEntering=false;
  }else if(demoState==='error'){
    cardsEl.innerHTML='';
    noticeEl.innerHTML=errorHTML();
    navEnter.isEntering=false;
  }else{
    const isEmpty=demoState==='empty'||group.length===0;
    cardsEl.innerHTML=isEmpty?'':group.map(card).join('');
    navEnter.isEntering=false;
    if(isEmpty){noticeEl.innerHTML=emptyHTML();}
    else{renderNotice();}
  }
  if(changed){
    const side=dir>0?'right':'left';
    enterEls.forEach((el,i)=>{el.dataset.dir=side;el.style.setProperty('--enter-delay',(i*20)+'ms');void el.offsetWidth;el.classList.add('stage-enter')})
    if(demoState===null)replayMotion(noticeEl,'panel-enter');
    const ann=document.getElementById('stage-announcer');
    if(ann)ann.textContent='Etapa '+(selectedStage+1)+' de '+stages.length+' · '+stages[selectedStage].title+' · '+group.length+(group.length===1?' atendimento':' atendimentos');
  }
  measureNoticeHeight();
  hydrateIcons();
  save();
  requestAnimationFrame(()=>revealTab(selectedStage));
}
/* Altura real do aviso: o offset sticky dos cartões depende dela (FZ-4107 §8). */
function measureNoticeHeight(){
  requestAnimationFrame(()=>{
    const el=document.getElementById('notice-container');
    document.documentElement.style.setProperty('--notice-h',(el?el.offsetHeight:0)+'px');
  });
}
function summary(t){if(t.feedback)return 'Você avaliou este atendimento · '+t.feedback.rating+'/5';if(t.status==='completed')return t.time;if(t.status==='called')return 'Dirija-se a '+t.place;if(t.status==='started')return 'Seu atendimento está em andamento';if(t.status==='future')return 'Disponível após a etapa anterior';if(t.status==='skipped')return 'Dispensado nesta jornada';if(t.status==='canceled')return 'Este atendimento foi cancelado';if(t.status==='confirmed')return 'Confirmado para hoje';return t.minutes?'Previsão em '+t.minutes+' min · '+t.position+'º na fila':'Disponível para continuar'}
function card(t){
  const open=expanded[selectedStage]===t.id;
  const stagger=navEnter.isEntering?' style="--i:'+(navEnter.index++)+'"':'';
  const hint=(t.status==='completed'&&!t.feedback)?'<button class="text-button small-action" onclick="openFeedback(\''+t.id+'\')">Avaliar '+svg('right')+'</button>':'<span class="ticket-hint" aria-hidden="true">Ver bilhete</span>';
  return '<article class="ticket '+t.status+(open?' expanded':'')+(navEnter.isEntering?' stage-card':'')+'" id="ticket-'+t.id+'"'+stagger+'><button class="ticket-top" aria-expanded="'+open+'" aria-controls="detail-'+t.id+'" onclick="toggleCard(\''+t.id+'\')"><span class="ticket-info"><span class="eyebrow">'+(t.id===scannedId?'Bilhete do seu QR code':'Atendimento')+'</span><h3>'+t.name+'</h3></span><span class="ticket-head-right"><span class="status '+t.status+'">'+labels[t.status]+'</span></span>'+svg('down','chevron')+'</button><div class="card-summary"><span>'+summary(t)+'</span>'+hint+'</div><div class="ticket-detail" id="detail-'+t.id+'" '+(!open?'hidden':'')+'>'+detail(t)+'</div></article>';
}
/* FZ-4107 §7: para um bilhete futuro, a etapa anterior em 1-based é exatamente
   t.stage (índice 0-based). Não somar 1: seria a etapa em que o paciente já está. */
function detail(t){
  let content='';
  if(t.status==='waiting'){
    content='<div class="queue-status"><div><h3>Seu tempo é seu.</h3><p>Você está na fila. Acompanhe por aqui.</p></div><span class="live">Atualizado agora</span></div>'+(t.minutes?'<div class="numbers"><div class="number"><span class="eyebrow">Previsão de espera</span><div class="number-value od-nowrap">'+String(t.minutes).padStart(2,'0')+' <small>min</small></div><p>Uma estimativa, pode variar</p></div><div class="number"><span class="eyebrow">Posição na fila</span><div class="number-value od-nowrap">'+String(t.position).padStart(2,'0')+'<small class="ordinal">º</small></div><p>Na fila deste serviço</p></div></div>':'<p class="card-header-note">A recepção está pronta para orientar você.</p>')+ticketLocation(t)+'<button class="cancel-link" onclick="askCancel(\''+t.id+'\')">Sair apenas desta fila</button>';
  }
  else if(t.status==='called'||t.status==='started'){content='<div class="queue-status"><div><h3>'+(t.status==='called'?'Marina, é a sua vez.':'Você está em atendimento.')+'</h3><p>'+(t.status==='called'?'Tenha seu bilhete em mãos.':'Os próximos passos continuam aqui.')+'</p></div></div>'+ticketLocation(t)+'<div class="numbers single"><div class="number"><span class="eyebrow">Destino</span><div class="number-value od-nowrap" style="font-size:20px">'+(t.id==='lab'?'Sala 05':t.id==='image'?'Sala 08':'Recepção')+'</div></div></div>'}
  else if(t.status==='completed'){content='<div class="queue-status"><div><h3>Atendimento realizado.</h3><p>'+t.time+' · '+t.place+'</p></div>'+svg('check')+'</div>'+(t.feedback?'<div class="feedback-success">'+svg('check')+' Avaliação enviada · '+t.feedback.rating+' de 5 estrelas. Obrigado!</div>':feedbackOpen.has(t.id)?feedbackForm(t):'<div class="actions"><button class="primary" onclick="openFeedback(\''+t.id+'\')">Avaliar este atendimento '+svg('right')+'</button></div><p class="card-header-note" style="margin:12px 0 0">Sua avaliação é opcional. Você pode continuar e voltar depois.</p>')}
  else if(t.status==='future'){content='<div class="empty-detail">'+svg('clock')+' Esta etapa será liberada quando os atendimentos obrigatórios da etapa '+t.stage+' estiverem resolvidos. Você pode acompanhar este atendimento por aqui.</div><div style="margin-top:20px">'+ticketLocation(t)+'</div>'}
  else if(t.status==='skipped'){content='<div class="empty-detail">'+svg('check')+' Este atendimento não será necessário nesta jornada. Nada a fazer por aqui.</div><div style="margin-top:20px">'+ticketLocation(t)+'</div>'}
  else if(t.status==='confirmed'){content='<div class="queue-status"><div><h3>Presença confirmada.</h3><p>Chegue com alguns minutos de antecedência.</p></div>'+svg('check')+'</div>'+ticketLocation(t)}
  else{content='<div class="empty-detail">Atendimento cancelado. Os demais bilhetes continuam disponíveis na sua jornada.</div>'}
  return content+'<details class="additional"><summary>Informações e histórico do bilhete</summary><p><strong>'+t.name+'</strong><br>'+t.place+'<br>Clínica Horizonte · Unidade Jardins</p><p class="mono">Jornada J-00123</p><p>09:00 · Atendimento registrado<br>09:05 · Entrada na jornada'+(t.status==='completed'?'<br>'+t.time:'')+'</p><button class="text-button" onclick="showHelp()">Preciso de ajuda '+svg('right')+'</button></details>'
}
function ticketLocation(t){return '<div class="location">'+svg('pin')+'<div>'+t.place+'<small>Clínica Horizonte · Unidade Jardins</small></div></div>'}
function feedbackForm(t){const d=drafts[t.id]||{rating:0,comment:''};return '<div class="feedback"><h3>Como foi seu atendimento?</h3><p>Conte como foi a experiência com '+t.name.toLowerCase()+'.</p><div class="stars" role="group" aria-label="Nota do atendimento">'+[1,2,3,4,5].map(n=>'<button class="'+(n<=d.rating?'on':'')+'" aria-label="'+n+(n===1?' estrela':' estrelas')+'" aria-pressed="'+(n===d.rating)+'" onclick="rate(\''+t.id+'\','+n+')">★</button>').join('')+'</div><label class="muted" for="comment-'+t.id+'">Quer contar um pouco mais? (opcional)</label><textarea id="comment-'+t.id+'" placeholder="O que podemos fazer melhor?" oninput="comment(\''+t.id+'\',this.value)">'+escapeHTML(d.comment)+'</textarea><div class="actions"><button class="primary" '+(!d.rating?'disabled':'')+' onclick="submitFeedback(\''+t.id+'\')">Enviar avaliação</button></div></div>'}
/* FZ-4107 §6 e §8 — o banner descreve o estado real da jornada/etapa.
   Cancelado resolve a etapa, mas não é conclusão; skipped tem precedência. */
function finishedBanner(){
  const group=tickets.filter(t=>t.stage===selectedStage);
  const completed=group.filter(t=>t.status==='completed').length;
  const canceled=group.filter(t=>t.status==='canceled').length;
  const skipped=group.filter(t=>t.status==='skipped').length;
  const pending=group.length-completed-canceled-skipped;
  const next=stages[selectedStage+1];
  let eyebrow,title,body;
  if(journey.status==='Completed'){eyebrow='Jornada concluída';title='Tudo certo por aqui.';body='Sua jornada foi finalizada. Você ainda pode consultar os bilhetes e revisar suas avaliações.'}
  else if(journey.status==='Canceled'){eyebrow='Jornada cancelada';title='Sua jornada foi cancelada.';body='Nenhum atendimento foi realizado. Se precisar, procure a recepção.'}
  else if(journey.status==='PartiallyCompleted'){const missing=tickets.filter(t=>t.status!=='completed').length;eyebrow='Concluída parcialmente';title='Sua jornada foi encerrada com pendências.';body=missing+(missing===1?' atendimento não foi realizado.':' atendimentos não foram realizados.')+' Você ainda pode consultar os bilhetes.'}
  else if(pending===0&&completed===group.length){eyebrow='Tudo certo';title='Etapa resolvida.';body='Você pode consultar os bilhetes desta etapa e seguir para a próxima quando quiser.'}
  else if(pending===0&&completed===0&&skipped===group.length){eyebrow='Nada pendente';title='Etapa não necessária.';body='Nenhum atendimento desta etapa é necessário para você.'}
  else if(pending===0&&completed===0){eyebrow='Nada pendente';title='Etapa encerrada sem atendimentos realizados.';body='Você pode consultar os bilhetes desta etapa e seguir para a próxima quando quiser.'}
  else{eyebrow='Etapa encerrada';title=completed+' de '+group.length+' atendimentos realizados.';body='Você pode consultar os bilhetes desta etapa e seguir para a próxima quando quiser.'}
  const cta=next&&journey.status==='InProgress'?'<button class="finished-action" onclick="goToStage('+(selectedStage+1)+')">Ir para '+next.name+' '+svg('right')+'</button>':'';
  return '<div class="finished-banner"><span class="finished-icon">'+svg('check')+'</span><div class="finished-copy"><span class="eyebrow">'+eyebrow+'</span><h3>'+title+'</h3><p>'+body+'</p></div>'+cta+'</div>';
}
function renderNotice(){
  const calls=tickets.filter(t=>t.status==='called');
  const live=calls[0]||tickets.find(t=>t.status==='started');
  const closest=tickets.filter(t=>t.stage===selectedStage&&t.status==='waiting').sort((a,b)=>(a.minutes??Infinity)-(b.minutes??Infinity))[0];
  const target=live||closest;
  const el=document.getElementById('notice-container');
  el.classList.toggle('has-call',target?.status==='called');
  document.body.classList.toggle('call-present',target?.status==='called');
  if(!target){el.innerHTML=stageDone(selectedStage)?finishedBanner():'';return}
  const called=target.status==='called';
  const action=calls.length>1
    ?'<button onclick="openCalls()">Ver todos ('+calls.length+')</button>'
    :'<button onclick="focusTicket(\''+target.id+'\')">Ver bilhete '+(target.stage!==selectedStage?'↗':'→')+'</button>';
  el.innerHTML='<div class="notice"><span class="notice-icon">'+svg(called?'bell':target.status==='started'?'heart':'clock')+'</span><div><strong>'+(called?(calls.length>1?calls.length+' atendimentos chamando você':'É a sua vez · '+target.name):target.status==='started'?'Em atendimento · '+target.name:'Mais próximo · '+target.name)+'</strong><p>'+(called?target.place:target.status==='started'?target.place:target.minutes?'Previsão em '+target.minutes+' min · nesta etapa':'Consulte as orientações para continuar')+'</p></div>'+action+'</div>';
}
/* P1-7 · várias chamadas ao mesmo tempo: todas alcançáveis num modal. */
function openCalls(){
  const calls=tickets.filter(t=>t.status==='called');
  openModal('<span class="eyebrow muted">Agora</span><h2 id="modal-title">'+(calls.length)+' atendimentos chamando você</h2><p>Você pode abrir cada bilhete. Os demais continuam disponíveis.</p>'+calls.map(t=>'<button class="secondary qr-option" onclick="closeModal();focusTicket(\''+t.id+'\')"><span>'+t.name+'<small>'+t.place+'</small></span>'+svg('right')+'</button>').join(''));
}
function selectStage(i,fromHistory=false){
  if(i<0||i>=stages.length)return;
  railArmed=false;clearTimeout(railSettleTimer);
  if(i===selectedStage){if(!fromHistory){syncUrl('push');window.scrollTo({top:scrollPositions[i]??0,behavior:'auto'})}return}
  scrollPositions[selectedStage]=window.scrollY;
  selectedStage=i;
  render();
  if(!fromHistory)syncUrl('push');
  window.scrollTo({top:scrollPositions[i]??0,behavior:'auto'});
}
function revealTab(i){railArmed=false;if(railSettling){railSettling=false;return}const rail=document.getElementById('tabs'),tab=document.getElementById('tab-'+i);if(!rail||!tab||rail.scrollWidth<=rail.clientWidth)return;const r=rail.getBoundingClientRect(),t=tab.getBoundingClientRect(),pad=2;if(t.left<r.left+pad)rail.scrollBy({left:t.left-r.left-pad,behavior:'smooth'});else if(t.right>r.right-pad)rail.scrollBy({left:t.right-r.right+pad,behavior:'smooth'})}
function changeStage(d){selectStage(selectedStage+d)}
function goToStage(i){selectStage(i);requestAnimationFrame(()=>document.getElementById('tab-'+i)?.focus())}
/* P0-4 · o header é recriado por render(): devolver o foco ao mesmo cartão. */
function toggleCard(id){expanded[selectedStage]=expanded[selectedStage]===id?null:id;render();syncUrl('push');requestAnimationFrame(()=>{document.getElementById('ticket-'+id)?.querySelector('.ticket-top')?.focus({preventScroll:true})})}
function focusTicket(id){
  const t=tickets.find(x=>x.id===id);
  if(!t)return;
  selectedStage=t.stage;expanded[t.stage]=id;render();syncUrl('push');
  requestAnimationFrame(()=>{const btn=document.getElementById('ticket-'+id)?.querySelector('.ticket-top');btn?.scrollIntoView({behavior:scrollBehavior(),block:'start'});btn?.focus({preventScroll:true})});
}
function openFeedback(id){feedbackOpen.add(id);expanded[selectedStage]=id;render();requestAnimationFrame(()=>document.querySelector('#ticket-'+id+' .stars button')?.focus({preventScroll:true}))}
function rate(id,n){drafts[id]||={rating:0,comment:''};drafts[id].rating=n;render();document.querySelectorAll('#ticket-'+id+' .stars button')[n-1]?.focus({preventScroll:true})}
function comment(id,value){drafts[id]||={rating:0,comment:''};drafts[id].comment=value;save()}
function submitFeedback(id){const t=tickets.find(x=>x.id===id);if(!drafts[id]?.rating)return;t.feedback={...drafts[id]};feedbackOpen.delete(id);render();toast('Avaliação enviada. Obrigado por compartilhar!')}
function openModal(html){document.getElementById('modal-body').innerHTML=html;document.getElementById('modal').showModal()}
function closeModal(){document.getElementById('modal').close()}
function scanTicket(id){scannedId=id;focusTicket(id)}
function openQR(){openModal('<div class="qr-illustration">'+svg('qr')+'</div><span class="eyebrow muted">Demonstração · dados fictícios</span><h2 id="modal-title">Um bilhete. Sua jornada inteira.</h2><p>Escolha um QR de exemplo. A carteira abre na etapa e no atendimento correspondente.</p>'+tickets.map(t=>'<button class="secondary qr-option" onclick="closeModal();scanTicket(\''+t.id+'\');toast(\'Jornada encontrada a partir deste atendimento\')"><span>'+t.name+'</span>'+svg('right')+'</button>').join(''))}
function simulateCall(){let t=tickets.find(t=>t.id==='image'&&t.status==='waiting')||tickets.find(t=>t.status==='waiting');if(!t){toast('Não há bilhetes aguardando. Reinicie para explorar novamente.');return}t.status='called';render();toast('Chamada recebida para '+t.name+'. Sua navegação foi preservada.')}
function simulateComplete(){const id=expanded[selectedStage];const t=tickets.find(t=>t.id===id&&['waiting','called','started'].includes(t.status))||tickets.find(t=>t.status==='called');if(!t){toast('Abra um bilhete disponível para simular a conclusão.');return}t.status='completed';t.time='Concluído agora';syncJourneyStatus();render();toast(t.name+' concluído. Você já pode avaliar este atendimento.')}
function askCancel(id){const t=tickets.find(x=>x.id===id);openModal('<span class="eyebrow muted">Apenas este atendimento</span><h2 id="modal-title">Sair desta fila?</h2><p>Você vai cancelar '+t.name+'. Os demais atendimentos da sua jornada serão mantidos.</p><div class="actions"><button class="secondary" onclick="closeModal()">Continuar na fila</button><button class="primary" onclick="cancelTicket(\''+id+'\')">Sim, sair desta fila</button></div>')}
function cancelTicket(id){tickets.find(t=>t.id===id).status='canceled';closeModal();syncJourneyStatus();render();syncUrl('replace');toast('Atendimento cancelado. Sua jornada foi preservada.')}
function showVisit(){openModal('<span class="eyebrow muted">Sua visita</span><h2 id="modal-title">Clínica Horizonte</h2><p>Unidade Jardins<br>Av. das Palmeiras, 240 · térreo<br>19 de outubro de 2026<br>Jornada J-00123</p><p>Serviços distribuídos entre a recepção e o primeiro andar. Consulte o local indicado em cada bilhete.</p><p class="fine-print">Endereço e atendimentos fictícios para demonstração.</p><button class="primary" onclick="closeModal()">Voltar à minha jornada</button>')}
function showHelp(){openModal('<span class="eyebrow muted">Estamos por perto</span><h2 id="modal-title">Precisa de uma orientação?</h2><p>Procure a equipe da recepção no térreo e informe a jornada <strong>J-00123</strong>. Você também pode mostrar esta tela com seus atendimentos.</p><button class="primary" onclick="closeModal()">Entendi</button>')}
/* P1-2 · retry do estado de erro volta ao ready. */
function retryState(){demoState=null;const p=new URLSearchParams(location.search);p.delete('state');history.replaceState(null,'','?'+p.toString()+location.hash);render()}
function goCurrent(){const next=tickets.find(t=>t.status==='called')||tickets.find(t=>t.status==='started')||tickets.find(t=>t.status==='waiting');if(next)focusTicket(next.id)}
function resetDemo(){
  tickets=structuredClone(initial);drafts={};feedbackOpen.clear();scannedId='lab';renderedStage=null;
  doneSnapshot=stages.map((_,i)=>stageDone(i));selectedStage=1;
  expanded={0:'triage',1:'lab',2:'xray',3:'medication',4:'checkout'};
  demoState=null;syncJourneyStatus();render();syncUrl('replace');
  window.scrollTo(0,0);toast('Demonstração reiniciada · dados fictícios');
}
/* —— URL · FZ-4107 §7 ——
   ?etapa=N (1-based) e ?ticket=friendlyCode. pushState em ações do usuário;
   replaceState em normalização. Params de demonstração são preservados. */
function syncUrl(mode='push'){
  const p=new URLSearchParams(location.search);
  p.set('etapa',String(selectedStage+1));
  const open=expanded[selectedStage];
  if(open)p.set('ticket',open);else p.delete('ticket');
  const url=location.pathname+'?'+p.toString();
  const state={etapa:selectedStage,ticket:open||null};
  if(mode==='push'){if(location.pathname+location.search!==url)history.pushState(state,'',url)}
  else history.replaceState(state,'',url);
}
window.addEventListener('popstate',()=>{
  const p=new URLSearchParams(location.search);
  const n=Number(p.get('etapa'));
  if(Number.isInteger(n)&&n>=1&&n<=stages.length){selectedStage=n-1;scrollPositions[selectedStage]=scrollPositions[selectedStage]||0}
  const id=p.get('ticket');
  Object.keys(expanded).forEach(k=>{if(expanded[k]===id)expanded[k]=null});
  if(id){const t=tickets.find(x=>x.id===id);if(t){selectedStage=t.stage;expanded[t.stage]=id}}
  render();
});
/* Arrastar o trilho é navegar: a etapa ativa acompanha a rolagem.
   O snap já garante que a parada cai no começo de um card; aqui só se
   decide qual card está na borda de início — o mesmo critério do
   updateNavWindow(). Sem isso, o trilho rolava e o painel não mudava:
   só o clique e as setas trocavam de etapa.
   A troca acontece ao fim do gesto (scrollend, com debounce de 140ms como
   rede para navegadores sem ele), não a cada quadro: cada troca re-renderiza
   os cards, e re-renderizar a cada pixel tornaria o arrasto pesado e
   reanimaria a entrada do painel sem parar. */
let railSettleTimer,railArmed=false,railSettling=false;
let railDrag=null,railDragging=false,railJustDragged=false;
function railIndexAtStart(){
  const rail=document.getElementById('tabs');
  const tabs=[...rail.querySelectorAll('.tab')];
  if(!tabs.length)return selectedStage;
  if(rail.scrollLeft>=rail.scrollWidth-rail.clientWidth-1)return tabs.length-1;
  const railLeft=rail.getBoundingClientRect().left+parseFloat(getComputedStyle(rail).paddingLeft)+4;
  let best=0,bestGap=Infinity;
  tabs.forEach((el,i)=>{const gap=Math.abs(el.getBoundingClientRect().left-railLeft);if(gap<bestGap){bestGap=gap;best=i}});
  return best;
}
function settleRail(final){
  clearTimeout(railSettleTimer);
  if(!railArmed)return;
  const rail=document.getElementById('tabs');
  if(final)railArmed=false;
  if(rail.scrollWidth<=rail.clientWidth+1)return;
  const next=railIndexAtStart();
  if(next!==selectedStage){railSettling=true;selectStage(next)}
}
const tabsRail=document.getElementById('tabs');
tabsRail.addEventListener('scroll',()=>{if(!railArmed||railDragging)return;clearTimeout(railSettleTimer);railSettleTimer=setTimeout(()=>settleRail(false),140)},{passive:true});
tabsRail.addEventListener('scrollend',()=>{if(!railDragging)settleRail(true)},{passive:true});
['pointerdown','touchstart','wheel'].forEach(type=>tabsRail.addEventListener(type,()=>{railArmed=true},{passive:true}));
tabsRail.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;railDrag={x:e.clientX,left:tabsRail.scrollLeft,moved:false,id:e.pointerId}});
window.addEventListener('pointermove',e=>{
  if(!railDrag||e.pointerId!==railDrag.id)return;
  const dx=e.clientX-railDrag.x;
  if(!railDrag.moved){if(Math.abs(dx)<4)return;railDrag.moved=true;railDragging=true;tabsRail.style.userSelect='none';document.documentElement.classList.add('rail-dragging')}
  e.preventDefault();
  tabsRail.scrollLeft=railDrag.left-dx;
});
function endRailDrag(){
  if(!railDrag)return;
  if(railDrag.moved){
    railDragging=false;tabsRail.style.userSelect='';document.documentElement.classList.remove('rail-dragging');
    railJustDragged=true;
    requestAnimationFrame(()=>settleRail(false));
  }
  setTimeout(()=>{railDrag=null},0);
}
window.addEventListener('pointerup',endRailDrag);
window.addEventListener('pointercancel',endRailDrag);
window.addEventListener('click',e=>{if(!railJustDragged)return;railJustDragged=false;if(tabsRail.contains(e.target)){e.preventDefault();e.stopPropagation()}},{capture:true});
tabsRail.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const last=stages.length-1;const next=e.key==='Home'?0:e.key==='End'?last:Math.max(0,Math.min(last,selectedStage+(e.key==='ArrowRight'?1:-1)));railArmed=false;selectStage(next);document.getElementById('tab-'+next).focus()}});
let touchStart;document.getElementById('stage-panel').addEventListener('touchstart',e=>{if(e.target.closest('textarea,input,.feedback,details'))return;touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY}},{passive:true});document.getElementById('stage-panel').addEventListener('touchend',e=>{if(!touchStart)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.7)changeStage(dx<0?1:-1)},{passive:true});
document.getElementById('modal').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal()}});
render();
/* No boot o trilho precisa abrir com a etapa atual no começo da janela. */
function alignRailToStage(){
  const rail=document.getElementById('tabs'),tab=document.getElementById('tab-'+selectedStage);
  if(!rail||!tab||rail.scrollWidth<=rail.clientWidth+1)return;
  rail.scrollLeft=tab.offsetLeft-(parseFloat(getComputedStyle(rail).paddingLeft)||0);
}
requestAnimationFrame(alignRailToStage);
function updateNavWindow(){const rail=document.getElementById('tabs'),counter=document.querySelector('.nav-counter');if(!rail||!counter)return;if(rail.scrollWidth<=rail.clientWidth+1){counter.textContent='Etapa '+(selectedStage+1)+' de '+stages.length;return}const tabs=[...rail.querySelectorAll('.tab')];if(!tabs.length)return;const railLeft=rail.getBoundingClientRect().left+rail.clientLeft+parseFloat(getComputedStyle(rail).paddingLeft);let first=tabs.findIndex(el=>el.getBoundingClientRect().left>=railLeft-0.5);if(first<0)first=tabs.length-1;const size=Math.min(3,tabs.length),start=Math.min(first,Math.max(tabs.length-size,0));counter.textContent='Etapas '+(start+1)+'–'+(start+size)+' de '+tabs.length}
let navScrollTick;document.getElementById('tabs').addEventListener('scroll',()=>{if(document.documentElement.dataset.stageNav!=='i')return;cancelAnimationFrame(navScrollTick);navScrollTick=requestAnimationFrame(updateNavWindow)},{passive:true});
/* P0-3 · a barra de etapas não tem altura fixa em todos os breakpoints; medir
   a altura real mantém o aviso e o scroll-margin dos cartões no mesmo pixel. */
const stageNavEl=document.querySelector('.stage-navigation');
if(stageNavEl){
  const setNavH=()=>document.documentElement.style.setProperty('--stage-nav-h',stageNavEl.offsetHeight+'px');
  setNavH();
  if('ResizeObserver'in window)new ResizeObserver(setNavH).observe(stageNavEl);
  addEventListener('resize',setNavH,{passive:true});
  const navSentinel=document.getElementById('nav-sentinel');
  if(navSentinel&&'IntersectionObserver'in window){
    let navIO;
    const watchNav=()=>{
      navIO?.disconnect();
      const h=document.querySelector('.top')?.offsetHeight||0;
      navIO=new IntersectionObserver(([entry])=>{stageNavEl.classList.toggle('is-stuck',!entry.isIntersecting)},{threshold:0,rootMargin:`-${h}px 0px 0px 0px`});
      navIO.observe(navSentinel);
      document.documentElement.style.setProperty('--top-h',h+'px');
    };
    watchNav();
    addEventListener('resize',watchNav,{passive:true});
  }
}
