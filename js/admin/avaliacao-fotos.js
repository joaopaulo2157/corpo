(() => {
'use strict';

const VERSION='4.0.0';
const BUCKET='avaliacao-fotos';
const POS=[
  ['frente','Frente'],
  ['lado_direito','Lado direito'],
  ['costas','Costas'],
  ['lado_esquerdo','Lado esquerdo']
];

const state={
  alunoId:null,
  pending:new Map(),
  urls:new Map(),
  wrapped:false,
  booted:false
};

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
}[c]));

function toast(message,type=''){
  if(typeof window.showToast==='function') return window.showToast(message,type);
  if(type==='error') alert(message); else console.log('[Corpofitness]',message);
}

function injectStyle(){
  if(q('#cf-af-v4-style')) return;
  const style=document.createElement('style');
  style.id='cf-af-v4-style';
  style.textContent=`
  .cf-af-v4-overview{margin:0 0 20px;padding:18px;border:1px solid rgba(96,165,250,.30);border-radius:16px;background:linear-gradient(135deg,rgba(37,99,235,.14),rgba(30,30,30,.98));box-shadow:0 15px 35px rgba(0,0,0,.18)}
  .cf-af-v4-overview h3{margin:0 0 5px;font-size:1rem;color:var(--text-color,#fff)}
  .cf-af-v4-overview p{margin:0;color:var(--gray,#9e9e9e);font-size:.77rem;line-height:1.55}
  .cf-af-v4-features{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:14px}
  .cf-af-v4-feature{padding:11px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(7,16,35,.50)}
  .cf-af-v4-feature strong{display:block;font-size:.73rem;color:#fff}.cf-af-v4-feature span{display:block;color:#9e9e9e;font-size:.62rem;margin-top:3px;line-height:1.4}
  #modalAvaliacaoCorporalCompleta.cf-af-v4-modal>div{max-width:1180px!important;padding:22px!important}
  .cf-af-v4-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 16px;padding:10px;border:1px solid rgba(96,165,250,.25);border-radius:14px;background:rgba(37,99,235,.07)}
  .cf-af-v4-steps span{padding:9px;border-radius:10px;text-align:center;background:#121212;border:1px solid rgba(255,255,255,.1);font-size:.68rem;font-weight:800;color:#9e9e9e}
  .cf-af-v4-steps b{color:#64b5f6;margin-right:5px}
  .cf-af-v4-section{margin:16px 0;padding:17px;border-radius:15px;border:1px solid rgba(96,165,250,.30);background:linear-gradient(145deg,rgba(37,99,235,.11),#121212);box-shadow:0 12px 30px rgba(0,0,0,.18)}
  .cf-af-v4-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px}
  .cf-af-v4-head h4{margin:0;color:#fff;font-size:.96rem}.cf-af-v4-head p{margin:5px 0 0;color:#9e9e9e;font-size:.71rem;line-height:1.5;max-width:760px}
  .cf-af-v4-private{font-size:.64rem;font-weight:900;color:#fde68a;border:1px solid rgba(251,191,36,.28);background:rgba(251,191,36,.08);padding:7px 9px;border-radius:999px}
  .cf-af-v4-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  .cf-af-v4-slot{position:relative;min-height:245px;border:1px dashed rgba(148,163,184,.42);border-radius:13px;background:#071023;overflow:hidden}
  .cf-af-v4-slot img,.cf-af-v4-slot canvas{position:absolute;inset:0;width:100%;height:100%}.cf-af-v4-slot img{object-fit:cover;display:none}.cf-af-v4-slot.has-photo img{display:block}.cf-af-v4-slot canvas{pointer-events:none}
  .cf-af-v4-empty{position:absolute;inset:0;display:grid;place-items:center;text-align:center;color:#94a3b8;padding:14px}.cf-af-v4-empty i{display:block;color:#60a5fa;font-size:1.7rem;margin-bottom:8px}.cf-af-v4-slot.has-photo .cf-af-v4-empty{display:none}
  .cf-af-v4-tools{position:absolute;z-index:4;top:8px;left:8px;right:8px;display:flex;justify-content:space-between;gap:5px}.cf-af-v4-tools button{border:1px solid rgba(255,255,255,.22);border-radius:8px;background:rgba(7,16,35,.88);color:#fff;font-size:.61rem;font-weight:900;padding:7px 9px;cursor:pointer}.cf-af-v4-tools .ai{color:#bfdbfe;border-color:rgba(96,165,250,.38)}
  .cf-af-v4-label{position:absolute;z-index:3;left:0;right:0;bottom:0;padding:38px 8px 9px;background:linear-gradient(transparent,rgba(0,0,0,.94));text-align:center}.cf-af-v4-label strong{display:block;font-size:.73rem;color:#fff}.cf-af-v4-label small{font-size:.59rem;color:#cbd5e1}
  .cf-af-v4-ai{margin-top:11px;padding:11px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(7,16,35,.60);font-size:.68rem;line-height:1.5;color:#cbd5e1}
  .cf-af-v4-actions{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:12px}.cf-af-v4-status{flex:1;min-width:220px;color:#9e9e9e;font-size:.69rem;line-height:1.45}
  .cf-af-v4-release{border:0;border-radius:11px;padding:10px 13px;font-weight:900;background:linear-gradient(135deg,#2563eb,#60a5fa);color:#fff;cursor:pointer;min-width:250px}.cf-af-v4-release:disabled{opacity:.45;cursor:not-allowed}.cf-af-v4-release.live{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:#fecaca}
  .cf-af-v4-history{margin-top:13px;padding-top:11px;border-top:1px solid rgba(255,255,255,.1)}.cf-af-v4-history strong{font-size:.75rem;color:#fff}.cf-af-v4-chips{display:flex;gap:7px;overflow-x:auto;margin-top:8px;padding-bottom:3px}.cf-af-v4-chip{flex:0 0 auto;padding:7px 9px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#9e9e9e;font-size:.63rem}.cf-af-v4-chip.ok{color:#a7f3d0;border-color:rgba(52,211,153,.25)}.cf-af-v4-chip.live{color:#bfdbfe;border-color:rgba(96,165,250,.32)}
  .cf-af-v4-health{position:fixed;right:12px;bottom:12px;z-index:99999;padding:6px 9px;border-radius:999px;background:rgba(7,16,35,.86);border:1px solid rgba(96,165,250,.35);color:#93c5fd;font:700 10px Arial;opacity:.78;pointer-events:none}
  @media(max-width:900px){.cf-af-v4-features{grid-template-columns:repeat(2,1fr)}.cf-af-v4-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.cf-af-v4-steps{grid-template-columns:repeat(2,1fr)}.cf-af-v4-release{width:100%;min-width:0}.cf-af-v4-slot{min-height:210px}}
  `;
  document.head.appendChild(style);
}

function addHealthBadge(){
  if(q('#cfAfV4Health')) return;
  const b=document.createElement('div');
  b.id='cfAfV4Health';
  b.className='cf-af-v4-health';
  b.textContent='Avaliação Fotos V4 ativa';
  document.body.appendChild(b);
}

function addOverview(){
  const tab=q('#tab-alunos');
  if(!tab || q('#cfAfV4Overview')) return;
  const header=q('.page-header',tab);
  if(!header) return;
  const box=document.createElement('section');
  box.id='cfAfV4Overview';
  box.className='cf-af-v4-overview';
  box.innerHTML=`
    <h3>📸 Avaliação Física • Fotos • IA • Evolução</h3>
    <p>Registro fotográfico privado em quatro posições, análise visual assistida e comparativo antes/depois controlado pelo professor.</p>
    <div class="cf-af-v4-features">
      <div class="cf-af-v4-feature"><strong>1. 📏 Medidas</strong><span>Peso, altura, IMC, dobras e perímetros.</span></div>
      <div class="cf-af-v4-feature"><strong>2. 📷 Fotos</strong><span>Frente, lado direito, costas e lado esquerdo.</span></div>
      <div class="cf-af-v4-feature"><strong>3. ✨ IA visual</strong><span>Indicações visuais para revisão do professor.</span></div>
      <div class="cf-af-v4-feature"><strong>4. 🖼 Antes / Depois</strong><span>Liberação ao aluno após nova avaliação.</span></div>
    </div>`;
  header.insertAdjacentElement('afterend',box);
}

function sectionHTML(){
  return `
  <section class="cf-af-v4-section" id="cfAfV4Section">
    <div class="cf-af-v4-head">
      <div>
        <h4>📷 Fotos da Avaliação + IA Visual</h4>
        <p>Registre as quatro posições. As fotos permanecem privadas para professor/master até a liberação do comparativo.</p>
      </div>
      <span class="cf-af-v4-private">🔒 SOMENTE PROFESSOR</span>
    </div>
    <div class="cf-af-v4-grid">
      ${POS.map(([key,label])=>`
        <div class="cf-af-v4-slot" data-cf-pos="${key}">
          <img data-cf-img="${key}" alt="${esc(label)}">
          <canvas data-cf-canvas="${key}"></canvas>
          <div class="cf-af-v4-empty"><div><i class="fa-solid fa-camera"></i><strong>${esc(label)}</strong><small>Selecione a foto</small></div></div>
          <div class="cf-af-v4-tools">
            <button type="button" data-cf-pick="${key}">📷 Foto</button>
            <button type="button" class="ai" data-cf-ai="${key}">✨ IA</button>
          </div>
          <div class="cf-af-v4-label"><strong>${esc(label)}</strong><small data-cf-state="${key}">Nenhuma foto</small></div>
          <input hidden type="file" accept="image/jpeg,image/png,image/webp" data-cf-file="${key}">
        </div>`).join('')}
    </div>
    <div class="cf-af-v4-ai" id="cfAfV4Ai"><strong>IA visual:</strong> selecione uma foto e clique em <b>IA</b>.</div>
    <div class="cf-af-v4-actions">
      <div class="cf-af-v4-status" id="cfAfV4Status">As fotos serão vinculadas à nova avaliação quando você clicar em <strong>Salvar Avaliação</strong>.</div>
      <button type="button" class="cf-af-v4-release" id="cfAfV4Release" disabled>🔐 Aguardando próxima avaliação</button>
    </div>
    <div class="cf-af-v4-history">
      <strong>Histórico fotográfico</strong>
      <div class="cf-af-v4-chips" id="cfAfV4History"><span class="cf-af-v4-chip">Nenhum conjunto carregado.</span></div>
    </div>
  </section>`;
}

function ensureModalUI(){
  const modal=q('#modalAvaliacaoCorporalCompleta');
  if(!modal) return;
  modal.classList.add('cf-af-v4-modal');
  const panel=modal.firstElementChild;
  if(!panel) return;

  if(!q('#cfAfV4Steps',panel)){
    const steps=document.createElement('div');
    steps.id='cfAfV4Steps';
    steps.className='cf-af-v4-steps';
    steps.innerHTML='<span><b>1</b>Dados gerais</span><span><b>2</b>Medidas e dobras</span><span><b>3</b>Fotos + IA</span><span><b>4</b>Salvar / histórico</span>';
    const header=panel.firstElementChild;
    if(header) header.insertAdjacentElement('afterend',steps);
    else panel.prepend(steps);
  }

  let section=q('#cfAfV4Section',panel);
  if(!section){
    const holder=document.createElement('div');
    holder.innerHTML=sectionHTML();
    section=holder.firstElementChild;
    const save=q('button[onclick*="salvarAvaliacaoCorporalCompleta"]',panel);
    const bar=save?.parentElement;
    if(bar?.parentElement) bar.parentElement.insertBefore(section,bar);
    else panel.appendChild(section);
  }
  bindSection(section);
}

function bindSection(section){
  if(!section || section.dataset.bound==='1') return;
  section.dataset.bound='1';
  POS.forEach(([key])=>{
    const input=q(`[data-cf-file="${key}"]`,section);
    q(`[data-cf-pick="${key}"]`,section)?.addEventListener('click',()=>input?.click());
    input?.addEventListener('change',()=>selectPhoto(key,input.files?.[0]||null));
    q(`[data-cf-ai="${key}"]`,section)?.addEventListener('click',()=>runAI(key));
  });
  q('#cfAfV4Release',section)?.addEventListener('click',toggleRelease);
}

function selectPhoto(key,file){
  if(!file) return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)) return toast('Use JPG, PNG ou WEBP.','error');
  if(file.size>12*1024*1024) return toast('A foto deve ter no máximo 12 MB.','error');

  const old=state.urls.get(key);
  if(old) URL.revokeObjectURL(old);
  const url=URL.createObjectURL(file);
  state.urls.set(key,url);
  state.pending.set(key,file);

  const slot=q(`[data-cf-pos="${key}"]`);
  const img=q(`[data-cf-img="${key}"]`);
  const canvas=q(`[data-cf-canvas="${key}"]`);
  const status=q(`[data-cf-state="${key}"]`);
  if(img) img.src=url;
  if(canvas && window.CorpofitnessPoseAI) window.CorpofitnessPoseAI.clearCanvas(canvas);
  if(status) status.textContent='Selecionada';
  slot?.classList.add('has-photo');

  const total=q('#cfAfV4Status');
  if(total) total.innerHTML=`<strong>${state.pending.size}/4 fotos selecionadas.</strong> ${state.pending.size===4?'Conjunto completo pronto para salvar.':'Complete as quatro posições.'}`;
}

async function runAI(key){
  const img=q(`[data-cf-img="${key}"]`);
  const canvas=q(`[data-cf-canvas="${key}"]`);
  const box=q('#cfAfV4Ai');
  if(!img?.src) return toast('Selecione a foto primeiro.','error');
  if(!window.CorpofitnessPoseAI) return toast('O módulo de IA ainda está carregando.','error');
  try{
    if(box) box.innerHTML='<strong>IA visual:</strong> analisando no dispositivo...';
    const result=await window.CorpofitnessPoseAI.analyzeImage(img,canvas,key);
    if(box) box.innerHTML='<strong>IA visual — revisão do professor:</strong><br>'+result.messages.map(m=>`• ${esc(m.text)}`).join('<br>');
  }catch(err){
    console.error('[Avaliação IA]',err);
    if(box) box.textContent='Não foi possível analisar esta foto agora.';
  }
}

async function compress(file){
  const img=new Image();
  const url=URL.createObjectURL(file);
  try{
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
    const ratio=Math.min(1500/img.naturalWidth,2100/img.naturalHeight,1);
    const w=Math.max(1,Math.round(img.naturalWidth*ratio));
    const h=Math.max(1,Math.round(img.naturalHeight*ratio));
    const canvas=document.createElement('canvas');
    canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha ao processar foto.')),'image/jpeg',.84));
  }finally{
    URL.revokeObjectURL(url);
  }
}

async function latestEval(){
  if(!window._supabase || !state.alunoId) return null;
  const r=await _supabase.from('avaliacoes_fisicas').select('id,created_at,avaliado_em').eq('aluno_id',state.alunoId).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(r.error) throw r.error;
  return r.data||null;
}

async function waitNewEval(oldId){
  for(let i=0;i<15;i++){
    const n=await latestEval();
    if(n && String(n.id)!==String(oldId||'')) return n;
    await new Promise(r=>setTimeout(r,180));
  }
  return null;
}

async function uploadPending(evalId){
  if(!state.pending.size) return;
  if(state.pending.size!==4) throw new Error('Selecione as quatro fotos.');
  if(!window._supabase) throw new Error('Supabase não carregado.');

  const {data:{user}}=await _supabase.auth.getUser();
  if(!user?.id) throw new Error('Sessão do professor não encontrada.');

  let i=0;
  for(const [key,file] of state.pending){
    i++;
    const status=q('#cfAfV4Status');
    if(status) status.textContent=`Enviando foto ${i}/4...`;
    const blob=await compress(file);
    const name=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path=`${state.alunoId}/${evalId}/${key}-${name}.jpg`;

    const up=await _supabase.storage.from(BUCKET).upload(path,blob,{contentType:'image/jpeg',cacheControl:'3600'});
    if(up.error) throw up.error;

    const meta=await _supabase.from('avaliacao_fotos').insert({
      avaliacao_id:evalId,
      aluno_id:state.alunoId,
      posicao:key,
      storage_path:path,
      liberado_aluno:false,
      created_by:user.id
    });
    if(meta.error){
      try{ await _supabase.storage.from(BUCKET).remove([path]); }catch(_){}
      throw meta.error;
    }
  }

  clearPending();
  toast('Avaliação e fotos salvas com sucesso!');
  await refreshHistory();
}

function clearPending(){
  state.urls.forEach(u=>URL.revokeObjectURL(u));
  state.urls.clear(); state.pending.clear();
  POS.forEach(([key])=>{
    q(`[data-cf-pos="${key}"]`)?.classList.remove('has-photo');
    q(`[data-cf-img="${key}"]`)?.removeAttribute('src');
    const can=q(`[data-cf-canvas="${key}"]`);
    if(can && window.CorpofitnessPoseAI) window.CorpofitnessPoseAI.clearCanvas(can);
    const st=q(`[data-cf-state="${key}"]`);
    if(st) st.textContent='Nenhuma foto';
    const input=q(`[data-cf-file="${key}"]`);
    if(input) input.value='';
  });
  const status=q('#cfAfV4Status');
  if(status) status.innerHTML='As fotos serão vinculadas à nova avaliação quando você clicar em <strong>Salvar Avaliação</strong>.';
}

async function groups(){
  if(!window._supabase || !state.alunoId) return [];
  const p=await _supabase.from('avaliacao_fotos').select('avaliacao_id,posicao,liberado_aluno,created_at').eq('aluno_id',state.alunoId).order('created_at',{ascending:false});
  if(p.error) throw p.error;
  const map=new Map();
  for(const x of p.data||[]){
    if(!map.has(x.avaliacao_id)) map.set(x.avaliacao_id,{id:x.avaliacao_id,pos:new Set(),live:true,date:x.created_at});
    const g=map.get(x.avaliacao_id);
    g.pos.add(x.posicao);
    g.live=g.live&&!!x.liberado_aluno;
  }
  return [...map.values()]
    .map(g=>({...g,complete:POS.every(([k])=>g.pos.has(k))}))
    .sort((a,b)=>new Date(b.date)-new Date(a.date));
}

async function refreshHistory(){
  const list=q('#cfAfV4History');
  const btn=q('#cfAfV4Release');
  if(!list||!btn||!state.alunoId||!window._supabase) return;
  try{
    const gs=await groups();
    list.innerHTML=gs.length
      ? gs.map(g=>`<span class="cf-af-v4-chip ${g.complete?'ok':''} ${g.live?'live':''}">${new Date(g.date).toLocaleDateString('pt-BR')} · ${g.pos.size}/4 ${g.live?'· aluno':''}</span>`).join('')
      : '<span class="cf-af-v4-chip">Nenhum conjunto salvo.</span>';

    const complete=gs.filter(g=>g.complete);
    if(complete.length<2){
      btn.disabled=true;btn.classList.remove('live');btn.dataset.live='0';
      btn.innerHTML='🔐 Aguardando próxima avaliação';
      return;
    }
    const pair=complete.slice(0,2);
    const live=pair.every(g=>g.live);
    btn.disabled=false;btn.dataset.live=live?'1':'0';btn.classList.toggle('live',live);
    btn.innerHTML=live?'🙈 Ocultar comparativo do aluno':'🖼 Liberar antes/depois para o aluno';
  }catch(err){
    console.error('[Histórico Fotográfico]',err);
    list.innerHTML='<span class="cf-af-v4-chip">Erro ao carregar histórico.</span>';
  }
}

async function toggleRelease(){
  const btn=q('#cfAfV4Release');
  if(!btn || btn.disabled || !window._supabase) return;
  try{
    btn.disabled=true;
    const complete=(await groups()).filter(g=>g.complete);
    if(complete.length<2) throw new Error('São necessárias duas avaliações completas.');
    const pair=complete.slice(0,2);
    const live=btn.dataset.live==='1';

    if(live){
      const r=await _supabase.from('avaliacao_fotos').update({liberado_aluno:false}).eq('aluno_id',state.alunoId).in('avaliacao_id',pair.map(g=>g.id));
      if(r.error) throw r.error;
      toast('Comparativo ocultado do aluno.');
    }else{
      let r=await _supabase.from('avaliacao_fotos').update({liberado_aluno:false}).eq('aluno_id',state.alunoId);
      if(r.error) throw r.error;
      r=await _supabase.from('avaliacao_fotos').update({liberado_aluno:true}).eq('aluno_id',state.alunoId).in('avaliacao_id',pair.map(g=>g.id));
      if(r.error) throw r.error;
      toast('Comparativo antes/depois liberado para o aluno!');
    }
    await refreshHistory();
  }catch(err){
    console.error('[Liberação Fotos]',err);
    toast(err.message||'Erro ao alterar a liberação.','error');
    btn.disabled=false;
  }
}

function wrapExistingFunctions(){
  if(state.wrapped) return;
  const open=window.abrirModalAvaliacaoFisicaCompleta;
  const save=window.salvarAvaliacaoCorporalCompleta;
  if(typeof open!=='function' || typeof save!=='function') return;

  state.wrapped=true;

  window.abrirModalAvaliacaoFisicaCompleta=async function(id,nome,...rest){
    state.alunoId=id||q('#tr_aluno_id')?.value||q('#aval_aluno_id')?.value||null;
    clearPending();
    const result=await open.call(this,id,nome,...rest);
    setTimeout(()=>{
      ensureModalUI();
      const fromHidden=q('#aval_aluno_id')?.value;
      if(fromHidden) state.alunoId=fromHidden;
      refreshHistory();
    },30);
    return result;
  };

  window.salvarAvaliacaoCorporalCompleta=async function(...args){
    if(state.pending.size>0 && state.pending.size!==4){
      toast('Para salvar fotos, selecione as quatro posições.','error');
      return;
    }
    let before=null;
    try{ before=await latestEval(); }catch(_){}
    const hasPhotos=state.pending.size===4;
    const result=await save.apply(this,args);
    if(hasPhotos){
      try{
        const next=await waitNewEval(before?.id);
        if(!next) throw new Error('A nova avaliação não foi localizada após o salvamento.');
        await uploadPending(next.id);
      }catch(err){
        console.error('[Upload Fotos]',err);
        toast('A avaliação foi salva, mas houve erro ao enviar as fotos: '+err.message,'error');
      }
    }
    return result;
  };
}

function boot(){
  if(state.booted) return;
  state.booted=true;
  window.__CORPOFITNESS_AVALIACAO_FOTOS_VERSION__=VERSION;

  try{
    injectStyle();
    addHealthBadge();
    addOverview();
    ensureModalUI();
    wrapExistingFunctions();
  }catch(err){
    console.error('[Avaliação Fotos V4 - boot]',err);
  }

  const observer=new MutationObserver(()=>{
    try{
      injectStyle();
      addOverview();
      ensureModalUI();
      wrapExistingFunctions();
    }catch(err){
      console.error('[Avaliação Fotos V4 - observer]',err);
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  setInterval(()=>{
    try{
      addOverview();
      ensureModalUI();
      wrapExistingFunctions();
    }catch(err){
      console.error('[Avaliação Fotos V4 - interval]',err);
    }
  },1000);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot,{once:true});
}else{
  boot();
}
})();