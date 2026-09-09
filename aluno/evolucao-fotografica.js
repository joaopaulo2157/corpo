(() => {
  'use strict';

  const BUCKET='avaliacao-fotos';
  const POSITIONS=[
    ['frente','Frente'],
    ['lado_direito','Lado direito'],
    ['costas','Costas'],
    ['lado_esquerdo','Lado esquerdo']
  ];
  let section=null,index=0,pair=null,urls=new Map(),analysisCache=new Map(),touchStart=0;

  const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt=(v)=>{const d=new Date(v||0);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('pt-BR')};

  function styles(){
    if(document.getElementById('cf-evolucao-fotos-style'))return;
    const s=document.createElement('style');s.id='cf-evolucao-fotos-style';s.textContent=`
      .cf-evolution{margin:22px 0;border:1px solid rgba(96,165,250,.25);background:linear-gradient(145deg,rgba(37,99,235,.10),rgba(16,27,53,.88));border-radius:20px;padding:18px;overflow:hidden}
      .cf-evo-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}.cf-evo-head h2{font-size:1rem;margin:0;display:flex;gap:8px;align-items:center}.cf-evo-head p{margin:5px 0 0;color:var(--muted);font-size:.72rem;line-height:1.45}.cf-evo-lock{font-size:.62rem;font-weight:900;color:#bfdbfe;border:1px solid rgba(96,165,250,.25);background:rgba(37,99,235,.10);padding:7px 9px;border-radius:999px}
      .cf-evo-empty{padding:20px 8px;text-align:center;color:var(--muted);font-size:.78rem;line-height:1.6}.cf-evo-empty i{display:block;font-size:1.6rem;color:var(--blue2);margin-bottom:8px}
      .cf-evo-nav{display:flex;justify-content:center;align-items:center;gap:8px;margin:4px 0 12px}.cf-evo-nav button{border:1px solid var(--border);background:#0a142a;color:#fff;width:38px;height:38px;border-radius:11px}.cf-evo-pos{min-width:120px;text-align:center;font-size:.75rem;font-weight:900}
      .cf-evo-pair{display:grid;grid-template-columns:1fr 1fr;gap:9px;touch-action:pan-y}.cf-evo-card{min-width:0}.cf-evo-label{display:flex;justify-content:space-between;gap:5px;align-items:center;margin-bottom:6px;font-size:.68rem}.cf-evo-label b{font-size:.72rem}.cf-evo-label span{color:var(--muted);font-size:.60rem}
      .cf-evo-photo{position:relative;width:100%;aspect-ratio:3/4;border-radius:14px;overflow:hidden;background:#071023;border:1px solid var(--border)}.cf-evo-photo img{width:100%;height:100%;object-fit:cover;display:block}.cf-evo-photo canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
      .cf-evo-hint{text-align:center;color:var(--muted);font-size:.64rem;margin:9px 0 0}.cf-evo-dots{display:flex;justify-content:center;gap:6px;margin-top:8px}.cf-evo-dot{width:7px;height:7px;border-radius:50%;background:#334155}.cf-evo-dot.active{background:var(--blue2)}
      .cf-evo-ai{margin-top:13px;border-top:1px solid var(--border);padding-top:12px}.cf-evo-ai button{width:100%;border:1px solid rgba(96,165,250,.30);background:rgba(37,99,235,.10);color:#bfdbfe;border-radius:11px;min-height:43px;font-weight:900}.cf-evo-ai-result{display:none;margin-top:10px;padding:11px;border-radius:11px;background:#0a142a;border:1px solid var(--border);font-size:.69rem;line-height:1.55;color:#cbd5e1}.cf-evo-ai-result.show{display:block}.cf-evo-ai-result .better{color:#a7f3d0}.cf-evo-ai-result .attention{color:#fde68a}.cf-evo-ai-result .stable{color:#bfdbfe}
      .cf-evo-disclaimer{font-size:.59rem;color:#64748b;margin-top:8px;line-height:1.45;text-align:center}
      @media(max-width:420px){.cf-evolution{padding:14px}.cf-evo-pair{gap:6px}.cf-evo-photo{border-radius:11px}.cf-evo-label{flex-direction:column;align-items:flex-start;gap:1px}}
    `;document.head.appendChild(s);
  }

  function createSection(){
    const main=document.querySelector('#app main')||document.querySelector('main');if(!main)return null;
    const el=document.createElement('section');el.className='cf-evolution';el.id='cfEvolucaoFotografica';el.innerHTML=`
      <div class="cf-evo-head"><div><h2><i class="fa-solid fa-images" style="color:var(--blue2)"></i> Evolução Fotográfica</h2><p>Comparativo antes e depois liberado pelo seu professor.</p></div><span class="cf-evo-lock"><i class="fa-solid fa-shield-halved"></i> PRIVADO</span></div>
      <div id="cfEvoBody" class="cf-evo-empty"><i class="fa-solid fa-lock"></i>Seu comparativo aparecerá aqui após uma nova avaliação com fotos e liberação do professor.</div>`;
    const metrics=main.querySelector('.metrics');if(metrics)metrics.insertAdjacentElement('afterend',el);else main.appendChild(el);return el;
  }

  async function ownGroups(){
    const r=await _supabase.from('avaliacao_fotos').select('id,avaliacao_id,posicao,storage_path,liberado_aluno,created_at').eq('liberado_aluno',true).order('created_at',{ascending:true});
    if(r.error)throw r.error;
    const ids=[...new Set((r.data||[]).map(x=>x.avaliacao_id))],evalMap=new Map();
    if(ids.length){const e=await _supabase.from('avaliacoes_fisicas').select('id,created_at,avaliado_em').in('id',ids);if(e.error)throw e.error;(e.data||[]).forEach(x=>evalMap.set(x.id,x))}
    const m=new Map();
    for(const x of r.data||[]){if(!m.has(x.avaliacao_id))m.set(x.avaliacao_id,{id:x.avaliacao_id,rows:[],pos:new Set(),evaluation:evalMap.get(x.avaliacao_id)});const g=m.get(x.avaliacao_id);g.rows.push(x);g.pos.add(x.posicao)}
    return [...m.values()].filter(g=>POSITIONS.every(([k])=>g.pos.has(k))).sort((a,b)=>new Date(a.evaluation?.avaliado_em||a.evaluation?.created_at||a.rows[0]?.created_at)-new Date(b.evaluation?.avaliado_em||b.evaluation?.created_at||b.rows[0]?.created_at));
  }

  async function signed(path){const r=await _supabase.storage.from(BUCKET).createSignedUrl(path,1200);if(r.error)throw r.error;return r.data.signedUrl}

  async function loadPair(){
    const gs=await ownGroups();if(gs.length<2)return false;
    pair={before:gs[gs.length-2],after:gs[gs.length-1]};
    for(const side of ['before','after'])for(const row of pair[side].rows)urls.set(`${side}:${row.posicao}`,await signed(row.storage_path));
    return true;
  }

  function row(group,pos){return group.rows.find(x=>x.posicao===pos)}

  function render(){
    const body=document.getElementById('cfEvoBody');if(!body||!pair)return;
    const [pos,label]=POSITIONS[index],before=row(pair.before,pos),after=row(pair.after,pos);
    body.className='';
    body.innerHTML=`
      <div class="cf-evo-nav"><button type="button" id="cfEvoPrev" aria-label="Foto anterior">‹</button><div class="cf-evo-pos">${esc(label)}</div><button type="button" id="cfEvoNext" aria-label="Próxima foto">›</button></div>
      <div class="cf-evo-pair" id="cfEvoPair">
        <div class="cf-evo-card"><div class="cf-evo-label"><b>ANTES</b><span>${fmt(pair.before.evaluation?.avaliado_em||pair.before.evaluation?.created_at)}</span></div><div class="cf-evo-photo"><img crossorigin="anonymous" id="cfEvoBeforeImg" src="${esc(urls.get(`before:${pos}`)||'')}" alt="Antes - ${esc(label)}"><canvas id="cfEvoBeforeCanvas"></canvas></div></div>
        <div class="cf-evo-card"><div class="cf-evo-label"><b>DEPOIS</b><span>${fmt(pair.after.evaluation?.avaliado_em||pair.after.evaluation?.created_at)}</span></div><div class="cf-evo-photo"><img crossorigin="anonymous" id="cfEvoAfterImg" src="${esc(urls.get(`after:${pos}`)||'')}" alt="Depois - ${esc(label)}"><canvas id="cfEvoAfterCanvas"></canvas></div></div>
      </div>
      <div class="cf-evo-hint"><i class="fa-solid fa-arrow-left"></i> deslize para trocar a posição <i class="fa-solid fa-arrow-right"></i></div>
      <div class="cf-evo-dots">${POSITIONS.map((_,i)=>`<span class="cf-evo-dot ${i===index?'active':''}"></span>`).join('')}</div>
      <div class="cf-evo-ai"><button type="button" id="cfEvoAiBtn"><i class="fa-solid fa-wand-magic-sparkles"></i> Ver análise visual do antes/depois</button><div class="cf-evo-ai-result" id="cfEvoAiResult"></div><div class="cf-evo-disclaimer">Análise fotográfica orientativa. Não é diagnóstico e deve ser interpretada pelo professor junto à avaliação presencial.</div></div>`;
    document.getElementById('cfEvoPrev')?.addEventListener('click',()=>move(-1));document.getElementById('cfEvoNext')?.addEventListener('click',()=>move(1));document.getElementById('cfEvoAiBtn')?.addEventListener('click',analyzeComparison);
    const stage=document.getElementById('cfEvoPair');stage?.addEventListener('touchstart',e=>{touchStart=e.changedTouches[0].clientX},{passive:true});stage?.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchStart;if(Math.abs(dx)>45)move(dx<0?1:-1)},{passive:true});
  }

  function move(dir){index=(index+dir+POSITIONS.length)%POSITIONS.length;render()}

  async function analyzeComparison(){
    const box=document.getElementById('cfEvoAiResult'),btn=document.getElementById('cfEvoAiBtn'),[pos,label]=POSITIONS[index];
    if(!window.CorpofitnessPoseAI)return;
    try{
      btn.disabled=true;box.classList.add('show');box.innerHTML='<strong>Análise visual:</strong> processando as duas fotos no aparelho...';
      let cached=analysisCache.get(pos);
      if(!cached){
        const b=await window.CorpofitnessPoseAI.analyzeImage(document.getElementById('cfEvoBeforeImg'),document.getElementById('cfEvoBeforeCanvas'),pos);
        const a=await window.CorpofitnessPoseAI.analyzeImage(document.getElementById('cfEvoAfterImg'),document.getElementById('cfEvoAfterCanvas'),pos);
        cached={b,a,compare:window.CorpofitnessPoseAI.compare(b,a)};analysisCache.set(pos,cached);
      }
      const msgs=cached.compare;
      box.innerHTML=`<strong>${esc(label)} — evolução visual:</strong><br>${msgs.map(m=>`<span class="${esc(m.level)}">• ${esc(m.text)}</span>`).join('<br>')}`;
    }catch(err){console.error(err);box.innerHTML='<strong>Análise visual:</strong> não foi possível comparar estas fotos agora.'}
    finally{btn.disabled=false}
  }

  async function init(){
    styles();section=createSection();if(!section)return;
    try{
      const {data:{session}}=await _supabase.auth.getSession();if(!session?.user)return;
      const ok=await loadPair();if(ok)render();
    }catch(err){console.error('[Evolução Fotográfica]',err)}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,500),{once:true});else setTimeout(init,500);
})();