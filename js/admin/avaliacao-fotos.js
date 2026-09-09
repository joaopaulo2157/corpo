(() => {
  'use strict';

  const BUCKET='avaliacao-fotos';
  const POSITIONS=[
    ['frente','Frente'],
    ['lado_direito','Lado direito'],
    ['costas','Costas'],
    ['lado_esquerdo','Lado esquerdo']
  ];

  const state={
    alunoId:null,
    alunoNome:'',
    pending:new Map(),
    previewUrls:new Map(),
    wrapped:false
  };

  const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function toast(msg,type=''){
    if(window.showToast)return window.showToast(msg,type);
    if(type==='error')alert(msg);else console.log(msg);
  }

  function injectStyles(){
    if(document.getElementById('cf-avaliacao-fotos-style'))return;
    const s=document.createElement('style');
    s.id='cf-avaliacao-fotos-style';
    s.textContent=`
      #modalAvaliacaoCorporalCompleta .cf-eval-guide{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:-4px 0 16px;padding:10px;border:1px solid var(--border-color);border-radius:14px;background:rgba(30,136,229,.06)}
      #modalAvaliacaoCorporalCompleta .cf-eval-guide span{padding:8px;border-radius:10px;background:var(--bg-surface);color:var(--text-muted);font-size:.68rem;font-weight:800;text-align:center;border:1px solid var(--border-color)}
      #modalAvaliacaoCorporalCompleta .cf-eval-guide b{color:var(--primary-light);margin-right:5px}
      .cf-photo-section{background:linear-gradient(145deg,rgba(30,136,229,.09),var(--bg-surface));padding:16px;border-radius:14px;border:1px solid rgba(100,181,246,.25);margin:0 0 16px}
      .cf-photo-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px}
      .cf-photo-head h4{margin:0;color:var(--text-main);font-size:.94rem}.cf-photo-head p{margin:5px 0 0;color:var(--text-muted);font-size:.72rem;line-height:1.5;max-width:680px}
      .cf-private-badge{font-size:.66rem;font-weight:900;color:#fde68a;background:rgba(251,191,36,.10);border:1px solid rgba(251,191,36,.25);padding:7px 9px;border-radius:999px;white-space:nowrap}
      .cf-photo-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .cf-photo-slot{position:relative;min-width:0;border:1px dashed rgba(148,163,184,.35);border-radius:13px;background:rgba(7,16,35,.40);overflow:hidden;min-height:220px}
      .cf-photo-stage{position:absolute;inset:0}.cf-photo-preview{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none}.cf-photo-ai-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
      .cf-photo-slot.has-photo .cf-photo-preview{display:block}.cf-photo-placeholder{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:14px;color:var(--text-muted)}
      .cf-photo-placeholder i{font-size:1.6rem;color:var(--primary-light);margin-bottom:8px}.cf-photo-slot.has-photo .cf-photo-placeholder{display:none}
      .cf-photo-slot-overlay{position:absolute;z-index:3;inset:auto 0 0;padding:35px 8px 8px;background:linear-gradient(transparent,rgba(0,0,0,.90));text-align:center}
      .cf-photo-slot strong{display:block;font-size:.73rem}.cf-photo-slot small{display:block;color:#cbd5e1;font-size:.60rem;margin-top:2px}
      .cf-photo-buttons{position:absolute;z-index:4;top:7px;left:7px;right:7px;display:flex;justify-content:space-between;gap:5px}
      .cf-photo-buttons button{border:1px solid rgba(255,255,255,.22);border-radius:8px;background:rgba(7,16,35,.82);color:#fff;font-size:.62rem;font-weight:900;padding:7px;cursor:pointer;backdrop-filter:blur(8px)}
      .cf-photo-buttons button.ai{color:#bfdbfe;border-color:rgba(96,165,250,.35)}
      .cf-photo-actions{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:14px}
      .cf-photo-status{font-size:.70rem;color:var(--text-muted);line-height:1.5;flex:1;min-width:220px}
      .cf-compare-btn{border:0;border-radius:11px;padding:10px 13px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#2563eb,#60a5fa);color:#fff;min-width:240px}
      .cf-compare-btn:disabled{opacity:.42;cursor:not-allowed}.cf-compare-btn.is-live{background:rgba(248,113,113,.12);color:#fecaca;border:1px solid rgba(248,113,113,.28)}
      .cf-ai-result{margin-top:10px;padding:10px;border-radius:10px;background:rgba(7,16,35,.58);border:1px solid var(--border-color);font-size:.68rem;line-height:1.5;color:#cbd5e1}
      .cf-ai-result strong{color:#fff}.cf-ai-result .att{color:#fde68a}.cf-ai-result .ok{color:#a7f3d0}
      .cf-photo-history{margin-top:14px;padding-top:12px;border-top:1px solid var(--border-color)}.cf-photo-history-title{display:flex;justify-content:space-between;gap:10px;margin-bottom:8px}.cf-photo-history-title strong{font-size:.76rem}
      .cf-photo-history-list{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}.cf-photo-eval-chip{flex:0 0 auto;border:1px solid var(--border-color);border-radius:10px;background:rgba(255,255,255,.03);padding:8px 10px;font-size:.65rem;color:var(--text-muted);cursor:pointer}
      .cf-photo-eval-chip.complete{border-color:rgba(52,211,153,.25);color:#a7f3d0}.cf-photo-eval-chip.live{border-color:rgba(96,165,250,.34);background:rgba(37,99,235,.10);color:#bfdbfe}
      .cf-saved-viewer{position:fixed;inset:0;z-index:9100;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:15px}
      .cf-saved-panel{width:min(100%,1000px);max-height:92vh;overflow:auto;background:#121212;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:16px}
      .cf-saved-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.cf-saved-card{position:relative;aspect-ratio:3/4;background:#071023;border-radius:13px;overflow:hidden}.cf-saved-card img{width:100%;height:100%;object-fit:cover}.cf-saved-card canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.cf-saved-card button{position:absolute;top:7px;right:7px;z-index:3;border:1px solid rgba(96,165,250,.4);background:rgba(7,16,35,.85);color:#bfdbfe;border-radius:8px;padding:7px;font-size:.65rem;font-weight:900}
      @media(max-width:760px){#modalAvaliacaoCorporalCompleta .cf-eval-guide{grid-template-columns:repeat(2,1fr)}.cf-photo-grid,.cf-saved-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:420px){.cf-photo-grid{grid-template-columns:1fr 1fr;gap:7px}.cf-photo-slot{min-height:190px}.cf-compare-btn{width:100%;min-width:0}}
    `;
    document.head.appendChild(s);
  }

  function organizeModal(){
    const modal=document.getElementById('modalAvaliacaoCorporalCompleta');
    if(!modal)return;
    const panel=modal.firstElementChild;
    if(!panel)return;
    if(!panel.querySelector('.cf-eval-guide')){
      const header=panel.firstElementChild;
      const guide=document.createElement('div');
      guide.className='cf-eval-guide';
      guide.innerHTML='<span><b>1</b>Dados gerais</span><span><b>2</b>Medidas e dobras</span><span><b>3</b>Fotos + IA</span><span><b>4</b>Salvar / histórico</span>';
      header?.insertAdjacentElement('afterend',guide);
    }
  }

  function sectionHtml(){
    return `<section class="cf-photo-section" id="cfAvaliacaoFotos">
      <div class="cf-photo-head"><div><h4><i class="fa-solid fa-camera-retro" style="color:var(--primary-light)"></i> Fotos da Avaliação + Análise Visual Assistida</h4>
      <p>Frente, lado direito, costas e lado esquerdo. As fotos ficam privadas. A IA marca apenas pontos visuais orientativos para revisão do professor; não faz diagnóstico.</p></div>
      <span class="cf-private-badge"><i class="fa-solid fa-lock"></i> SOMENTE PROFESSOR</span></div>
      <div class="cf-photo-grid">${POSITIONS.map(([key,label])=>`
        <div class="cf-photo-slot" data-position="${key}">
          <div class="cf-photo-stage">
            <img class="cf-photo-preview" data-preview="${key}" alt="${esc(label)}">
            <canvas class="cf-photo-ai-canvas" data-canvas="${key}"></canvas>
            <div class="cf-photo-placeholder"><div><i class="fa-solid fa-camera"></i><strong>${esc(label)}</strong><small>Selecione a foto</small></div></div>
          </div>
          <div class="cf-photo-buttons">
            <button type="button" data-pick="${key}"><i class="fa-solid fa-image"></i> Foto</button>
            <button type="button" class="ai" data-ai="${key}"><i class="fa-solid fa-wand-magic-sparkles"></i> IA</button>
          </div>
          <div class="cf-photo-slot-overlay"><strong>${esc(label)}</strong><small data-slot-status="${key}">Nenhuma foto</small></div>
          <input hidden type="file" accept="image/jpeg,image/png,image/webp" data-file="${key}">
        </div>`).join('')}</div>
      <div class="cf-ai-result" id="cfAiResult"><strong>IA visual:</strong> selecione uma foto e clique em <b>IA</b>. A análise considera alinhamentos aparentes e deve ser confirmada pelo professor.</div>
      <div class="cf-photo-actions"><div class="cf-photo-status" id="cfPhotoStatus">As fotos serão vinculadas à nova avaliação ao clicar em <strong>Salvar Avaliação</strong>.</div>
        <button class="cf-compare-btn" id="cfLiberarComparativo" type="button" disabled><i class="fa-solid fa-user-lock"></i> Aguardando próxima avaliação</button></div>
      <div class="cf-photo-history"><div class="cf-photo-history-title"><strong>Histórico fotográfico</strong><small style="color:var(--text-muted)">Clique em uma avaliação para visualizar</small></div>
        <div class="cf-photo-history-list" id="cfPhotoHistory"><span class="cf-photo-eval-chip">Carregando...</span></div></div>
    </section>`;
  }

  function ensureSection(){
    const modal=document.getElementById('modalAvaliacaoCorporalCompleta');
    if(!modal||document.getElementById('cfAvaliacaoFotos'))return;
    const saveBtn=modal.querySelector('button[onclick*="salvarAvaliacaoCorporalCompleta"]');
    if(!saveBtn)return;
    const bar=saveBtn.parentElement;
    const holder=document.createElement('div');holder.innerHTML=sectionHtml();
    bar.parentElement.insertBefore(holder.firstElementChild,bar);

    POSITIONS.forEach(([key])=>{
      const input=document.querySelector(`[data-file="${key}"]`);
      document.querySelector(`[data-pick="${key}"]`)?.addEventListener('click',()=>input?.click());
      input?.addEventListener('change',()=>selectFile(key,input.files?.[0]||null));
      document.querySelector(`[data-ai="${key}"]`)?.addEventListener('click',()=>runAi(key));
    });
    document.getElementById('cfLiberarComparativo')?.addEventListener('click',toggleComparisonAccess);
  }

  function clearPending(){
    for(const url of state.previewUrls.values())URL.revokeObjectURL(url);
    state.previewUrls.clear();state.pending.clear();
    POSITIONS.forEach(([key])=>{
      const slot=document.querySelector(`.cf-photo-slot[data-position="${key}"]`);
      const img=document.querySelector(`[data-preview="${key}"]`);
      const canvas=document.querySelector(`[data-canvas="${key}"]`);
      const st=document.querySelector(`[data-slot-status="${key}"]`);
      const input=document.querySelector(`[data-file="${key}"]`);
      slot?.classList.remove('has-photo');
      img?.removeAttribute('src');
      if(canvas)window.CorpofitnessPoseAI?.clearCanvas(canvas);
      if(st)st.textContent='Nenhuma foto';
      if(input)input.value='';
    });
    const status=document.getElementById('cfPhotoStatus');
    if(status)status.innerHTML='As fotos serão vinculadas à nova avaliação ao clicar em <strong>Salvar Avaliação</strong>.';
  }

  function selectFile(position,file){
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))return toast('Use JPG, PNG ou WEBP.','error');
    if(file.size>12*1024*1024)return toast('A foto original deve ter no máximo 12 MB.','error');
    const old=state.previewUrls.get(position);if(old)URL.revokeObjectURL(old);
    const url=URL.createObjectURL(file);state.previewUrls.set(position,url);state.pending.set(position,file);
    const slot=document.querySelector(`.cf-photo-slot[data-position="${position}"]`);
    const img=document.querySelector(`[data-preview="${position}"]`);
    const canvas=document.querySelector(`[data-canvas="${position}"]`);
    const st=document.querySelector(`[data-slot-status="${position}"]`);
    if(img)img.src=url;if(canvas)window.CorpofitnessPoseAI?.clearCanvas(canvas);if(st)st.textContent='Selecionada';slot?.classList.add('has-photo');
    const status=document.getElementById('cfPhotoStatus');
    if(status)status.innerHTML=`<strong>${state.pending.size}/4 fotos selecionadas.</strong> ${state.pending.size===4?'Conjunto completo pronto para salvar.':'Complete as quatro posições.'}`;
  }

  async function runAi(position){
    const img=document.querySelector(`[data-preview="${position}"]`);
    const canvas=document.querySelector(`[data-canvas="${position}"]`);
    const box=document.getElementById('cfAiResult');
    if(!img?.src)return toast('Selecione a foto primeiro.','error');
    if(!window.CorpofitnessPoseAI)return toast('Módulo de IA ainda está carregando. Tente novamente.','error');
    try{
      if(box)box.innerHTML='<strong>IA visual:</strong> analisando a foto no dispositivo...';
      const result=await window.CorpofitnessPoseAI.analyzeImage(img,canvas,position);
      if(box)box.innerHTML='<strong>IA visual — revisão do professor:</strong><br>'+result.messages.map(m=>`<span class="${m.level==='attention'?'att':'ok'}">• ${esc(m.text)}</span>`).join('<br>');
    }catch(err){
      console.error(err);if(box)box.innerHTML='<strong>IA visual:</strong> não foi possível analisar esta foto. Verifique enquadramento, iluminação e conexão para carregar o modelo.';
    }
  }

  async function compress(file){
    const img=new Image(),url=URL.createObjectURL(file);
    try{
      await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});
      const ratio=Math.min(1500/img.naturalWidth,2100/img.naturalHeight,1),w=Math.max(1,Math.round(img.naturalWidth*ratio)),h=Math.max(1,Math.round(img.naturalHeight*ratio));
      const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{alpha:false});x.fillStyle='#000';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
      return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('Falha ao processar foto.')),'image/jpeg',.84));
    }finally{URL.revokeObjectURL(url)}
  }

  async function latestEval(){
    const {data,error}=await _supabase.from('avaliacoes_fisicas').select('id,created_at,avaliado_em').eq('aluno_id',state.alunoId).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error)throw error;return data||null;
  }

  async function waitNewEval(oldId){
    for(let i=0;i<12;i++){
      const latest=await latestEval();
      if(latest&&String(latest.id)!==String(oldId||''))return latest;
      await new Promise(r=>setTimeout(r,180));
    }
    return null;
  }

  async function uploadPending(evalId){
    if(!state.pending.size)return;
    if(state.pending.size!==4)throw new Error('Selecione as quatro fotos ou remova as fotos selecionadas antes de salvar.');
    const {data:{user}}=await _supabase.auth.getUser();if(!user?.id)throw new Error('Sessão do professor não encontrada.');
    let i=0;
    for(const [position,file] of state.pending.entries()){
      i++;const status=document.getElementById('cfPhotoStatus');if(status)status.textContent=`Enviando foto ${i}/4...`;
      const blob=await compress(file),random=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`,path=`${state.alunoId}/${evalId}/${position}-${random}.jpg`;
      const up=await _supabase.storage.from(BUCKET).upload(path,blob,{contentType:'image/jpeg',cacheControl:'3600',upsert:false});if(up.error)throw up.error;
      const meta=await _supabase.from('avaliacao_fotos').insert({avaliacao_id:evalId,aluno_id:state.alunoId,posicao:position,storage_path:path,liberado_aluno:false,created_by:user.id});
      if(meta.error){await _supabase.storage.from(BUCKET).remove([path]).catch(()=>{});throw meta.error}
    }
    clearPending();toast('Avaliação e fotos salvas com segurança!');await refreshHistory();
  }

  async function groups(){
    const p=await _supabase.from('avaliacao_fotos').select('id,avaliacao_id,posicao,storage_path,liberado_aluno,created_at').eq('aluno_id',state.alunoId).order('created_at',{ascending:false});
    if(p.error)throw p.error;
    const ids=[...new Set((p.data||[]).map(x=>x.avaliacao_id))],evals=new Map();
    if(ids.length){
      const a=await _supabase.from('avaliacoes_fisicas').select('id,created_at,avaliado_em').in('id',ids);if(a.error)throw a.error;(a.data||[]).forEach(x=>evals.set(x.id,x));
    }
    const m=new Map();
    for(const x of p.data||[]){
      if(!m.has(x.avaliacao_id))m.set(x.avaliacao_id,{id:x.avaliacao_id,rows:[],pos:new Set(),live:true,evaluation:evals.get(x.avaliacao_id)});
      const g=m.get(x.avaliacao_id);g.rows.push(x);g.pos.add(x.posicao);g.live=g.live&&!!x.liberado_aluno;
    }
    return [...m.values()].map(g=>({...g,complete:POSITIONS.every(([k])=>g.pos.has(k))})).sort((a,b)=>new Date(b.evaluation?.avaliado_em||b.evaluation?.created_at||b.rows[0]?.created_at)-new Date(a.evaluation?.avaliado_em||a.evaluation?.created_at||a.rows[0]?.created_at));
  }

  const fmt=(v)=>{const d=new Date(v||0);return Number.isNaN(d.getTime())?'Sem data':d.toLocaleDateString('pt-BR')};

  async function refreshHistory(){
    const list=document.getElementById('cfPhotoHistory'),btn=document.getElementById('cfLiberarComparativo');if(!list||!btn||!state.alunoId)return;
    try{
      const gs=await groups();
      list.innerHTML=gs.length?gs.map(g=>`<button type="button" class="cf-photo-eval-chip ${g.complete?'complete':''} ${g.live?'live':''}" data-group="${g.id}">${fmt(g.evaluation?.avaliado_em||g.evaluation?.created_at)} · ${g.pos.size}/4 ${g.live?'· aluno':''}</button>`).join(''):'<span class="cf-photo-eval-chip">Nenhum conjunto fotográfico salvo.</span>';
      list.querySelectorAll('[data-group]').forEach(b=>b.addEventListener('click',()=>openGroup(gs.find(g=>String(g.id)===String(b.dataset.group)))));
      const complete=gs.filter(g=>g.complete);
      if(complete.length<2){btn.disabled=true;btn.classList.remove('is-live');btn.innerHTML='<i class="fa-solid fa-user-lock"></i> Aguardando próxima avaliação';return}
      const pair=complete.slice(0,2),live=pair.every(g=>g.rows.every(r=>r.liberado_aluno));
      btn.disabled=false;btn.dataset.live=live?'1':'0';btn.classList.toggle('is-live',live);btn.innerHTML=live?'<i class="fa-solid fa-eye-slash"></i> Ocultar comparativo do aluno':'<i class="fa-solid fa-images"></i> Liberar antes/depois para o aluno';
    }catch(err){console.error(err);list.innerHTML='<span class="cf-photo-eval-chip">Erro ao carregar histórico.</span>'}
  }

  async function toggleComparisonAccess(){
    const btn=document.getElementById('cfLiberarComparativo');if(!btn||btn.disabled)return;
    try{
      btn.disabled=true;
      const gs=await groups(),complete=gs.filter(g=>g.complete);
      if(complete.length<2)throw new Error('São necessários dois conjuntos completos.');
      const pair=complete.slice(0,2),currently=pair.every(g=>g.rows.every(r=>r.liberado_aluno));
      if(currently){
        const ids=pair.map(g=>g.id);const r=await _supabase.from('avaliacao_fotos').update({liberado_aluno:false}).eq('aluno_id',state.alunoId).in('avaliacao_id',ids);if(r.error)throw r.error;
        toast('Comparativo ocultado da Área do Aluno.');
      }else{
        let r=await _supabase.from('avaliacao_fotos').update({liberado_aluno:false}).eq('aluno_id',state.alunoId);if(r.error)throw r.error;
        r=await _supabase.from('avaliacao_fotos').update({liberado_aluno:true}).eq('aluno_id',state.alunoId).in('avaliacao_id',pair.map(g=>g.id));if(r.error)throw r.error;
        toast('Comparativo antes/depois liberado para este aluno!');
      }
      await refreshHistory();
    }catch(err){console.error(err);toast(err.message||'Erro ao alterar liberação.','error');btn.disabled=false}
  }

  async function signed(path){
    const r=await _supabase.storage.from(BUCKET).createSignedUrl(path,900);if(r.error)throw r.error;return r.data.signedUrl;
  }

  async function openGroup(g){
    if(!g)return;
    const modal=document.createElement('div');modal.className='cf-saved-viewer';
    modal.innerHTML=`<div class="cf-saved-panel"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:12px"><div><strong>Fotos da avaliação · ${fmt(g.evaluation?.avaliado_em||g.evaluation?.created_at)}</strong><div style="font-size:.68rem;color:#94a3b8;margin-top:4px">Clique em IA para marcar pontos visuais orientativos.</div></div><button type="button" data-close style="border:1px solid #333;background:#181818;color:#fff;border-radius:9px;padding:8px 10px">✕ Fechar</button></div><div class="cf-saved-grid">${POSITIONS.map(([k,l])=>`<div><div class="cf-saved-card"><img data-saved-img="${k}" alt="${esc(l)}"><canvas data-saved-canvas="${k}"></canvas><button type="button" data-saved-ai="${k}">✨ IA</button></div><div style="text-align:center;font-size:.7rem;margin-top:5px;color:#cbd5e1">${esc(l)}</div></div>`).join('')}</div><div id="cfSavedAiText" class="cf-ai-result"><strong>IA visual:</strong> selecione uma foto acima.</div></div>`;
    document.body.appendChild(modal);modal.querySelector('[data-close]')?.addEventListener('click',()=>modal.remove());modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
    for(const row of g.rows){
      const img=modal.querySelector(`[data-saved-img="${row.posicao}"]`);if(img){img.crossOrigin='anonymous';img.src=await signed(row.storage_path)}
    }
    modal.querySelectorAll('[data-saved-ai]').forEach(b=>b.addEventListener('click',async()=>{
      const k=b.dataset.savedAi,img=modal.querySelector(`[data-saved-img="${k}"]`),canvas=modal.querySelector(`[data-saved-canvas="${k}"]`),box=modal.querySelector('#cfSavedAiText');
      try{box.innerHTML='<strong>IA visual:</strong> analisando...';const res=await window.CorpofitnessPoseAI.analyzeImage(img,canvas,k);box.innerHTML='<strong>IA visual — revisão do professor:</strong><br>'+res.messages.map(m=>`• ${esc(m.text)}`).join('<br>')}catch(err){box.textContent='Não foi possível analisar esta foto.'}
    }));
  }

  function wrapFunctions(){
    if(state.wrapped)return;
    if(typeof window.abrirModalAvaliacaoFisicaCompleta!=='function'||typeof window.salvarAvaliacaoCorporalCompleta!=='function')return;
    state.wrapped=true;

    const open=window.abrirModalAvaliacaoFisicaCompleta;
    window.abrirModalAvaliacaoFisicaCompleta=async function(idParam=null,nomeParam=null,...rest){
      state.alunoId=idParam||document.getElementById('tr_aluno_id')?.value||null;
      state.alunoNome=nomeParam||document.getElementById('tr_nome')?.value||'Aluno';
      clearPending();
      const out=await open.call(this,idParam,nomeParam,...rest);
      setTimeout(()=>{organizeModal();ensureSection();refreshHistory()},40);
      return out;
    };

    const save=window.salvarAvaliacaoCorporalCompleta;
    window.salvarAvaliacaoCorporalCompleta=async function(...args){
      if(state.pending.size>0&&state.pending.size!==4){toast('Para salvar fotos, selecione as quatro posições.','error');return}
      let before=null;try{before=await latestEval()}catch(_){}
      const hadPhotos=state.pending.size===4;
      const out=await save.apply(this,args);
      if(hadPhotos){
        try{
          const next=await waitNewEval(before?.id);
          if(!next)throw new Error('A avaliação não foi localizada após o salvamento.');
          await uploadPending(next.id);
        }catch(err){console.error(err);toast('A avaliação foi salva, mas houve erro ao enviar as fotos: '+err.message,'error')}
      }
      return out;
    };
  }

  function init(){
    injectStyles();organizeModal();ensureSection();wrapFunctions();
    setInterval(()=>{wrapFunctions();organizeModal();ensureSection()},1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();