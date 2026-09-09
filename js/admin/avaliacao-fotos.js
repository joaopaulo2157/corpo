(() => {
  'use strict';

  const BUCKET = 'avaliacao-fotos';
  const POS = [
    ['frente','Frente'],
    ['lado_direito','Lado direito'],
    ['costas','Costas'],
    ['lado_esquerdo','Lado esquerdo']
  ];
  const state = { alunoId:null, pending:new Map(), urls:new Map(), wrapped:false };
  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const toast = (m,t='') => window.showToast ? window.showToast(m,t) : (t==='error' ? alert(m) : console.log(m));

  function css(){
    if($('#cf-af-v2-style')) return;
    const s=document.createElement('style'); s.id='cf-af-v2-style';
    s.textContent=`
      .cf-af-overview{margin:0 0 20px;padding:18px;border:1px solid rgba(96,165,250,.28);border-radius:16px;background:linear-gradient(135deg,rgba(37,99,235,.13),rgba(30,30,30,.97));box-shadow:0 14px 34px rgba(0,0,0,.16)}
      .cf-af-overview-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.cf-af-overview h3{margin:0 0 5px;font-size:1rem}.cf-af-overview p{margin:0;color:var(--gray);font-size:.76rem;line-height:1.55;max-width:800px}.cf-af-badge{padding:7px 10px;border-radius:999px;border:1px solid rgba(52,211,153,.28);background:rgba(52,211,153,.09);color:#a7f3d0;font-size:.65rem;font-weight:900}
      .cf-af-features{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:14px}.cf-af-feature{padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(7,16,35,.42)}.cf-af-feature strong{display:block;font-size:.73rem}.cf-af-feature span{display:block;margin-top:3px;color:var(--gray);font-size:.63rem;line-height:1.42}.cf-af-feature i{color:#60a5fa;margin-right:5px}
      #modalAvaliacaoCorporalCompleta.cf-af-modal>div{max-width:1180px!important;padding:22px!important}.cf-af-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:-3px 0 16px;padding:10px;border:1px solid var(--border-color);border-radius:14px;background:rgba(37,99,235,.07)}.cf-af-steps span{padding:8px;border-radius:10px;text-align:center;background:var(--bg-surface);border:1px solid var(--border-color);font-size:.68rem;font-weight:800;color:var(--text-muted)}.cf-af-steps b{color:#60a5fa;margin-right:5px}
      .cf-af-section{margin:0 0 16px;padding:17px;border-radius:15px;border:1px solid rgba(96,165,250,.28);background:linear-gradient(145deg,rgba(37,99,235,.10),var(--bg-surface));box-shadow:0 10px 28px rgba(0,0,0,.16)}.cf-af-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px}.cf-af-head h4{margin:0;font-size:.94rem;color:#fff}.cf-af-head p{margin:5px 0 0;color:var(--text-muted);font-size:.71rem;line-height:1.5;max-width:740px}.cf-af-private{font-size:.64rem;font-weight:900;color:#fde68a;border:1px solid rgba(251,191,36,.28);background:rgba(251,191,36,.08);padding:7px 9px;border-radius:999px}
      .cf-af-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.cf-af-slot{position:relative;min-height:230px;border:1px dashed rgba(148,163,184,.38);border-radius:13px;background:#071023;overflow:hidden}.cf-af-slot img,.cf-af-slot canvas{position:absolute;inset:0;width:100%;height:100%}.cf-af-slot img{object-fit:cover;display:none}.cf-af-slot.has img{display:block}.cf-af-slot canvas{pointer-events:none}.cf-af-empty{position:absolute;inset:0;display:grid;place-items:center;text-align:center;color:#94a3b8;padding:14px}.cf-af-empty i{display:block;color:#60a5fa;font-size:1.55rem;margin-bottom:7px}.cf-af-slot.has .cf-af-empty{display:none}.cf-af-tools{position:absolute;z-index:4;top:7px;left:7px;right:7px;display:flex;justify-content:space-between;gap:5px}.cf-af-tools button{border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(7,16,35,.86);color:#fff;font-size:.61rem;font-weight:900;padding:7px;cursor:pointer}.cf-af-tools .ai{color:#bfdbfe;border-color:rgba(96,165,250,.38)}.cf-af-label{position:absolute;z-index:3;left:0;right:0;bottom:0;padding:34px 8px 8px;background:linear-gradient(transparent,rgba(0,0,0,.92));text-align:center}.cf-af-label strong{display:block;font-size:.72rem}.cf-af-label small{font-size:.59rem;color:#cbd5e1}
      .cf-af-ai{margin-top:11px;padding:10px;border:1px solid var(--border-color);border-radius:10px;background:rgba(7,16,35,.55);font-size:.68rem;line-height:1.5;color:#cbd5e1}.cf-af-actions{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:12px}.cf-af-status{flex:1;min-width:220px;color:var(--text-muted);font-size:.69rem;line-height:1.45}.cf-af-release{border:0;border-radius:11px;padding:10px 13px;font-weight:900;background:linear-gradient(135deg,#2563eb,#60a5fa);color:#fff;cursor:pointer;min-width:245px}.cf-af-release:disabled{opacity:.42;cursor:not-allowed}.cf-af-release.live{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:#fecaca}.cf-af-history{margin-top:13px;padding-top:11px;border-top:1px solid var(--border-color)}.cf-af-history strong{font-size:.75rem}.cf-af-chips{display:flex;gap:7px;overflow-x:auto;margin-top:8px;padding-bottom:3px}.cf-af-chip{flex:0 0 auto;padding:7px 9px;border-radius:9px;border:1px solid var(--border-color);background:rgba(255,255,255,.03);color:var(--text-muted);font-size:.63rem}.cf-af-chip.ok{color:#a7f3d0;border-color:rgba(52,211,153,.25)}.cf-af-chip.live{color:#bfdbfe;border-color:rgba(96,165,250,.32)}
      @media(max-width:900px){.cf-af-features{grid-template-columns:repeat(2,1fr)}.cf-af-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.cf-af-steps{grid-template-columns:repeat(2,1fr)}.cf-af-release{width:100%;min-width:0}}`;
    document.head.appendChild(s);
  }

  function overview(){
    const tab=$('#tab-alunos'); if(!tab || $('#cfAfOverview')) return;
    const header=$('.page-header',tab); if(!header) return;
    const box=document.createElement('section'); box.id='cfAfOverview'; box.className='cf-af-overview';
    box.innerHTML=`<div class="cf-af-overview-head"><div><h3><i class="fa-solid fa-person-circle-check" style="color:#60a5fa"></i> Avaliação Física • Fotos • IA • Evolução</h3><p>Fluxo de avaliação com registro fotográfico privado em quatro posições, análise visual assistida e comparativo antes/depois controlado pelo professor.</p></div><span class="cf-af-badge"><i class="fa-solid fa-shield-halved"></i> FOTOS PRIVADAS</span></div><div class="cf-af-features"><div class="cf-af-feature"><strong><i class="fa-solid fa-ruler-combined"></i>1. Medidas</strong><span>Peso, altura, IMC, dobras e perímetros.</span></div><div class="cf-af-feature"><strong><i class="fa-solid fa-camera-retro"></i>2. Fotos</strong><span>Frente, lado direito, costas e lado esquerdo.</span></div><div class="cf-af-feature"><strong><i class="fa-solid fa-wand-magic-sparkles"></i>3. IA visual</strong><span>Pontos visuais para revisão técnica do professor.</span></div><div class="cf-af-feature"><strong><i class="fa-solid fa-images"></i>4. Antes / Depois</strong><span>Liberação ao aluno somente após nova avaliação.</span></div></div>`;
    header.insertAdjacentElement('afterend',box);
  }

  function organize(){
    const modal=$('#modalAvaliacaoCorporalCompleta'); if(!modal) return;
    modal.classList.add('cf-af-modal'); const panel=modal.firstElementChild; if(!panel) return;
    if(!$('.cf-af-steps',panel)){
      const steps=document.createElement('div'); steps.className='cf-af-steps';
      steps.innerHTML='<span><b>1</b>Dados gerais</span><span><b>2</b>Medidas e dobras</span><span><b>3</b>Fotos + IA</span><span><b>4</b>Salvar / histórico</span>';
      panel.firstElementChild?.insertAdjacentElement('afterend',steps);
    }
  }

  function sectionHTML(){
    return `<section class="cf-af-section" id="cfAfSection"><div class="cf-af-head"><div><h4><i class="fa-solid fa-camera-retro" style="color:#60a5fa"></i> Fotos da Avaliação + IA Visual</h4><p>As imagens ficam privadas para professor/master. A IA é apenas uma indicação visual para apoiar a revisão profissional e não substitui avaliação presencial.</p></div><span class="cf-af-private"><i class="fa-solid fa-lock"></i> SOMENTE PROFESSOR</span></div><div class="cf-af-grid">${POS.map(([k,l])=>`<div class="cf-af-slot" data-pos="${k}"><img data-img="${k}" alt="${esc(l)}"><canvas data-canvas="${k}"></canvas><div class="cf-af-empty"><div><i class="fa-solid fa-camera"></i><strong>${esc(l)}</strong><small>Selecione a foto</small></div></div><div class="cf-af-tools"><button type="button" data-pick="${k}"><i class="fa-solid fa-image"></i> Foto</button><button type="button" class="ai" data-ai="${k}">✨ IA</button></div><div class="cf-af-label"><strong>${esc(l)}</strong><small data-state="${k}">Nenhuma foto</small></div><input hidden type="file" accept="image/jpeg,image/png,image/webp" data-file="${k}"></div>`).join('')}</div><div class="cf-af-ai" id="cfAfAi"><strong>IA visual:</strong> selecione uma foto e toque em <b>IA</b> para marcar pontos visuais.</div><div class="cf-af-actions"><div class="cf-af-status" id="cfAfStatus">As fotos serão vinculadas à próxima avaliação quando você clicar em <strong>Salvar Avaliação</strong>.</div><button type="button" class="cf-af-release" id="cfAfRelease" disabled><i class="fa-solid fa-user-lock"></i> Aguardando próxima avaliação</button></div><div class="cf-af-history"><strong>Histórico fotográfico</strong><div class="cf-af-chips" id="cfAfHistory"><span class="cf-af-chip">Nenhum conjunto carregado.</span></div></div></section>`;
  }

  function bindSection(section){
    if(!section || section.dataset.cfBound==='1') return;
    section.dataset.cfBound='1';

    POS.forEach(([k])=>{
      const input=$(`[data-file="${k}"]`,section);
      $(`[data-pick="${k}"]`,section)?.addEventListener('click',()=>input?.click());
      input?.addEventListener('change',()=>choose(k,input.files?.[0]||null));
      $(`[data-ai="${k}"]`,section)?.addEventListener('click',()=>runAI(k));
    });

    $('#cfAfRelease',section)?.addEventListener('click',toggleRelease);
  }

  function ensureSection(){
    const modal=$('#modalAvaliacaoCorporalCompleta'); 
    if(!modal) return;

    const existing=$('#cfAfSection',modal);
    if(existing){
      bindSection(existing);
      return;
    }

    const panel=modal.firstElementChild; 
    if(!panel) return;

    const saveBtn=$('button[onclick*="salvarAvaliacaoCorporalCompleta"]',modal);
    const bar=saveBtn?.parentElement;
    const holder=document.createElement('div'); 
    holder.innerHTML=sectionHTML(); 
    const section=holder.firstElementChild;

    if(bar?.parentElement) bar.parentElement.insertBefore(section,bar); 
    else panel.appendChild(section);

    bindSection(section);
  }

  function resetPending(){
    state.urls.forEach(URL.revokeObjectURL); state.urls.clear(); state.pending.clear();
    POS.forEach(([k])=>{ const slot=$(`.cf-af-slot[data-pos="${k}"]`),img=$(`[data-img="${k}"]`),can=$(`[data-canvas="${k}"]`),st=$(`[data-state="${k}"]`),inp=$(`[data-file="${k}"]`); slot?.classList.remove('has'); img?.removeAttribute('src'); if(can) window.CorpofitnessPoseAI?.clearCanvas(can); if(st) st.textContent='Nenhuma foto'; if(inp) inp.value=''; });
    const s=$('#cfAfStatus'); if(s) s.innerHTML='As fotos serão vinculadas à próxima avaliação quando você clicar em <strong>Salvar Avaliação</strong>.';
  }

  function choose(k,file){
    if(!file) return; if(!['image/jpeg','image/png','image/webp'].includes(file.type)) return toast('Use JPG, PNG ou WEBP.','error'); if(file.size>12*1024*1024) return toast('A foto deve ter no máximo 12 MB.','error');
    if(state.urls.get(k)) URL.revokeObjectURL(state.urls.get(k)); const u=URL.createObjectURL(file); state.urls.set(k,u); state.pending.set(k,file);
    const slot=$(`.cf-af-slot[data-pos="${k}"]`),img=$(`[data-img="${k}"]`),can=$(`[data-canvas="${k}"]`),st=$(`[data-state="${k}"]`); if(img) img.src=u; if(can) window.CorpofitnessPoseAI?.clearCanvas(can); if(st) st.textContent='Selecionada'; slot?.classList.add('has');
    const status=$('#cfAfStatus'); if(status) status.innerHTML=`<strong>${state.pending.size}/4 fotos selecionadas.</strong> ${state.pending.size===4?'Conjunto completo pronto para salvar.':'Complete as quatro posições.'}`;
  }

  async function runAI(k){
    const img=$(`[data-img="${k}"]`),can=$(`[data-canvas="${k}"]`),box=$('#cfAfAi'); if(!img?.src) return toast('Selecione a foto primeiro.','error'); if(!window.CorpofitnessPoseAI) return toast('A IA ainda está carregando. Tente novamente.','error');
    try{ box.innerHTML='<strong>IA visual:</strong> analisando...'; const r=await window.CorpofitnessPoseAI.analyzeImage(img,can,k); box.innerHTML='<strong>IA visual — revisão do professor:</strong><br>'+r.messages.map(m=>`• ${esc(m.text)}`).join('<br>'); }catch(e){ console.error(e); box.textContent='Não foi possível analisar esta foto agora.'; }
  }

  async function compress(file){
    const img=new Image(),u=URL.createObjectURL(file); try{ await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=u}); const ratio=Math.min(1500/img.naturalWidth,2100/img.naturalHeight,1),w=Math.round(img.naturalWidth*ratio),h=Math.round(img.naturalHeight*ratio),c=document.createElement('canvas'); c.width=w;c.height=h;const x=c.getContext('2d',{alpha:false});x.fillStyle='#000';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h); return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('Falha ao processar foto.')),'image/jpeg',.84)); } finally { URL.revokeObjectURL(u); }
  }

  async function latestEval(){ const r=await _supabase.from('avaliacoes_fisicas').select('id,created_at,avaliado_em').eq('aluno_id',state.alunoId).order('created_at',{ascending:false}).limit(1).maybeSingle(); if(r.error) throw r.error; return r.data||null; }
  async function waitEval(oldId){ for(let i=0;i<15;i++){ const n=await latestEval(); if(n&&String(n.id)!==String(oldId||'')) return n; await new Promise(r=>setTimeout(r,180)); } return null; }

  async function upload(evalId){
    if(!state.pending.size) return; if(state.pending.size!==4) throw new Error('Selecione as quatro fotos.'); const {data:{user}}=await _supabase.auth.getUser(); if(!user?.id) throw new Error('Sessão do professor não encontrada.'); let i=0;
    for(const [k,file] of state.pending){ i++; const st=$('#cfAfStatus'); if(st) st.textContent=`Enviando foto ${i}/4...`; const blob=await compress(file),name=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`,path=`${state.alunoId}/${evalId}/${k}-${name}.jpg`; const up=await _supabase.storage.from(BUCKET).upload(path,blob,{contentType:'image/jpeg',cacheControl:'3600'}); if(up.error) throw up.error; const m=await _supabase.from('avaliacao_fotos').insert({avaliacao_id:evalId,aluno_id:state.alunoId,posicao:k,storage_path:path,liberado_aluno:false,created_by:user.id}); if(m.error){ await _supabase.storage.from(BUCKET).remove([path]); throw m.error; } }
    resetPending(); toast('Avaliação e fotos salvas!'); await history();
  }

  async function groups(){
    const p=await _supabase.from('avaliacao_fotos').select('avaliacao_id,posicao,liberado_aluno,created_at').eq('aluno_id',state.alunoId).order('created_at',{ascending:false}); if(p.error) throw p.error; const map=new Map(); for(const x of p.data||[]){ if(!map.has(x.avaliacao_id)) map.set(x.avaliacao_id,{id:x.avaliacao_id,pos:new Set(),live:true,date:x.created_at}); const g=map.get(x.avaliacao_id); g.pos.add(x.posicao); g.live=g.live&&!!x.liberado_aluno; }
    return [...map.values()].map(g=>({...g,complete:POS.every(([k])=>g.pos.has(k))})).sort((a,b)=>new Date(b.date)-new Date(a.date));
  }

  async function history(){
    const list=$('#cfAfHistory'),btn=$('#cfAfRelease'); if(!list||!btn||!state.alunoId) return; try{ const gs=await groups(); list.innerHTML=gs.length?gs.map(g=>`<span class="cf-af-chip ${g.complete?'ok':''} ${g.live?'live':''}">${new Date(g.date).toLocaleDateString('pt-BR')} · ${g.pos.size}/4 ${g.live?'· aluno':''}</span>`).join(''):'<span class="cf-af-chip">Nenhum conjunto salvo.</span>'; const complete=gs.filter(g=>g.complete); if(complete.length<2){btn.disabled=true;btn.classList.remove('live');btn.innerHTML='<i class="fa-solid fa-user-lock"></i> Aguardando próxima avaliação';return;} const pair=complete.slice(0,2),live=pair.every(g=>g.live); btn.disabled=false;btn.dataset.live=live?'1':'0';btn.classList.toggle('live',live);btn.innerHTML=live?'<i class="fa-solid fa-eye-slash"></i> Ocultar comparativo do aluno':'<i class="fa-solid fa-images"></i> Liberar antes/depois para o aluno'; }catch(e){console.error(e);list.innerHTML='<span class="cf-af-chip">Erro ao carregar histórico.</span>';}
  }

  async function toggleRelease(){
    const btn=$('#cfAfRelease'); if(!btn||btn.disabled) return; try{ btn.disabled=true; const complete=(await groups()).filter(g=>g.complete); if(complete.length<2) throw new Error('São necessárias duas avaliações completas.'); const pair=complete.slice(0,2),live=btn.dataset.live==='1'; if(live){ const r=await _supabase.from('avaliacao_fotos').update({liberado_aluno:false}).eq('aluno_id',state.alunoId).in('avaliacao_id',pair.map(g=>g.id)); if(r.error) throw r.error; toast('Comparativo ocultado do aluno.'); }else{ let r=await _supabase.from('avaliacao_fotos').update({liberado_aluno:false}).eq('aluno_id',state.alunoId); if(r.error) throw r.error; r=await _supabase.from('avaliacao_fotos').update({liberado_aluno:true}).eq('aluno_id',state.alunoId).in('avaliacao_id',pair.map(g=>g.id)); if(r.error) throw r.error; toast('Comparativo liberado para o aluno!'); } await history(); }catch(e){console.error(e);toast(e.message||'Erro ao alterar liberação.','error');btn.disabled=false;}
  }

  function wrap(){
    if(state.wrapped) return; if(typeof window.abrirModalAvaliacaoFisicaCompleta!=='function'||typeof window.salvarAvaliacaoCorporalCompleta!=='function') return; state.wrapped=true;
    const open=window.abrirModalAvaliacaoFisicaCompleta; window.abrirModalAvaliacaoFisicaCompleta=async function(id,nome,...rest){ state.alunoId=id||$('#tr_aluno_id')?.value||null; resetPending(); const r=await open.call(this,id,nome,...rest); setTimeout(()=>{organize();ensureSection();history();},50); return r; };
    const save=window.salvarAvaliacaoCorporalCompleta; window.salvarAvaliacaoCorporalCompleta=async function(...args){ if(state.pending.size>0&&state.pending.size!==4) return toast('Selecione as quatro fotos antes de salvar.','error'); let before=null;try{before=await latestEval();}catch(_){} const has=state.pending.size===4; const r=await save.apply(this,args); if(has){ try{ const n=await waitEval(before?.id); if(!n) throw new Error('Nova avaliação não localizada.'); await upload(n.id); }catch(e){console.error(e);toast('A avaliação foi salva, mas as fotos não foram enviadas: '+e.message,'error');} } return r; };
  }

  function boot(){
    css();overview();organize();ensureSection();bindSection($('#cfAfSection'));wrap();
    const mo=new MutationObserver(()=>{
      overview();organize();ensureSection();bindSection($('#cfAfSection'));wrap();
    });
    mo.observe(document.body,{childList:true,subtree:true});
    [250,700,1400,2600].forEach(ms=>setTimeout(()=>{
      overview();organize();ensureSection();bindSection($('#cfAfSection'));wrap();
    },ms));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
