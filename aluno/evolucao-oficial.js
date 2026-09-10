(() => {
  'use strict';

  const BUCKET = 'avaliacao-fotos-oficial';
  const POS = [
    ['frente','Frente'],
    ['lado_direito','Lado direito'],
    ['costas','Costas'],
    ['lado_esquerdo','Lado esquerdo']
  ];

  const $ = (s,r=document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let current = 0;
  let pair = null;
  let signed = {};

  function injectStyle(){
    if($('#cfOficialAlunoStyle')) return;
    const style = document.createElement('style');
    style.id = 'cfOficialAlunoStyle';
    style.textContent = `
      .cfOficial-aluno{margin:22px 0;padding:18px;border:1px solid rgba(96,165,250,.28);border-radius:20px;background:linear-gradient(145deg,rgba(37,99,235,.12),rgba(7,16,35,.92));color:#f8fafc}
      .cfOficial-aluno h2{margin:0 0 6px;font-size:1rem}.cfOficial-aluno p{margin:0;color:#94a3b8;font-size:.76rem;line-height:1.5}
      .cfOficial-aluno-empty{text-align:center;padding:18px;color:#94a3b8}.cfOficial-aluno-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}
      .cfOficial-aluno-kpi{padding:10px;border-radius:14px;background:#081226;border:1px solid rgba(148,163,184,.2);text-align:center}.cfOficial-aluno-kpi small{display:block;color:#94a3b8;font-size:.62rem}.cfOficial-aluno-kpi strong{display:block;margin-top:3px}
      .cfOficial-aluno-nav{display:flex;justify-content:center;align-items:center;gap:10px;margin:14px 0}.cfOficial-aluno-nav button{width:40px;height:38px;border-radius:12px;border:1px solid rgba(148,163,184,.25);background:#081226;color:#fff;font-weight:900}.cfOficial-aluno-pos{min-width:130px;text-align:center;font-weight:900;font-size:.78rem}
      .cfOficial-aluno-compare{display:grid;grid-template-columns:1fr 1fr;gap:9px}.cfOficial-aluno-card small{display:block;margin:0 0 5px;color:#94a3b8;font-size:.65rem}.cfOficial-aluno-photo{aspect-ratio:3/4;border-radius:15px;overflow:hidden;background:#020617;border:1px solid rgba(148,163,184,.22)}.cfOficial-aluno-photo img{width:100%;height:100%;object-fit:cover;display:block}
      .cfOficial-aluno-report{margin-top:12px;padding:12px;border-radius:14px;background:#081226;border:1px solid rgba(148,163,184,.2);font-size:.72rem;line-height:1.55;color:#cbd5e1;white-space:pre-line}
      @media(max-width:460px){.cfOficial-aluno{padding:14px}.cfOficial-aluno-kpis{grid-template-columns:1fr}.cfOficial-aluno-compare{gap:6px}.cfOficial-aluno-photo{border-radius:11px}}
    `;
    document.head.appendChild(style);
  }

  function mount(){
    if($('#cfOficialMinhaEvolucao')) return $('#cfOficialMinhaEvolucao');
    const main = $('main') || $('#app') || document.body;
    const section = document.createElement('section');
    section.id = 'cfOficialMinhaEvolucao';
    section.className = 'cfOficial-aluno';
    section.innerHTML = `<h2>ðŸ“ˆ Minha EvoluÃ§Ã£o</h2><p>Comparativo liberado pelo professor.</p><div class="cfOficial-aluno-empty">Carregando evoluÃ§Ã£o...</div>`;
    main.appendChild(section);
    return section;
  }

  async function supa(){
    if(!window._supabase) throw new Error('Supabase nÃ£o carregado.');
    return window._supabase;
  }

  async function currentAluno(){
    const sb = await supa();
    const {data:{session}} = await sb.auth.getSession();
    const user = session?.user;
    if(!user) return null;

    let r = await sb.from('alunos').select('id,nome,email,auth_user_id').eq('auth_user_id', user.id).maybeSingle();
    if(!r.data && user.email) r = await sb.from('alunos').select('id,nome,email,auth_user_id').eq('email', user.email).maybeSingle();
    return r.data || null;
  }

  async function load(){
    injectStyle();
    const section = mount();
    try{
      const aluno = await currentAluno();
      if(!aluno){ section.innerHTML = `<h2>ðŸ“ˆ Minha EvoluÃ§Ã£o</h2><div class="cfOficial-aluno-empty">Entre na Ã¡rea do aluno para visualizar sua evoluÃ§Ã£o.</div>`; return; }
      const sb = await supa();
      const r = await sb.from('avaliacoes_oficiais')
        .select('id,data_avaliacao,peso,imc,gordura_percentual,ia_aluno,liberar_fotos,liberar_ia,created_at')
        .eq('aluno_id', aluno.id)
        .eq('liberado_aluno', true)
        .order('data_avaliacao', {ascending:false})
        .order('created_at', {ascending:false});
      if(r.error) throw r.error;

      const avaliacoes = r.data || [];
      if(avaliacoes.length < 2){
        section.innerHTML = `<h2>ðŸ“ˆ Minha EvoluÃ§Ã£o</h2><p>Comparativo liberado pelo professor.</p><div class="cfOficial-aluno-empty">Seu antes/depois aparecerÃ¡ aqui quando o professor liberar duas avaliaÃ§Ãµes.</div>`;
        return;
      }

      pair = { after:avaliacoes[0], before:avaliacoes[1] };
      const ids = [pair.before.id, pair.after.id];

      const p = await sb.from('avaliacao_fotos_oficiais').select('avaliacao_id,posicao,storage_path').in('avaliacao_id', ids).eq('released_to_student', true);
      if(p.error) throw p.error;

      signed = {};
      for(const photo of p.data || []){
        const side = photo.avaliacao_id === pair.before.id ? 'before' : 'after';
        const url = await sb.storage.from(BUCKET).createSignedUrl(photo.storage_path, 1200);
        if(!url.error) signed[`${side}:${photo.posicao}`] = url.data.signedUrl;
      }
      render();
    }catch(err){
      console.error('[Oficial aluno evoluÃ§Ã£o]',err);
      section.innerHTML = `<h2>ðŸ“ˆ Minha EvoluÃ§Ã£o</h2><div class="cfOficial-aluno-empty">NÃ£o foi possÃ­vel carregar a evoluÃ§Ã£o agora.</div>`;
    }
  }

  function render(){
    const section = mount();
    const [pos,label] = POS[current];
    const b = signed[`before:${pos}`] || '';
    const a = signed[`after:${pos}`] || '';
    const diffPeso = delta(pair.before.peso, pair.after.peso, 'kg');
    const diffGord = delta(pair.before.gordura_percentual, pair.after.gordura_percentual, '%');

    section.innerHTML = `
      <h2>ðŸ“ˆ Minha EvoluÃ§Ã£o</h2>
      <p>Antes e depois liberado pelo professor.</p>
      <div class="cfOficial-aluno-kpis">
        <div class="cfOficial-aluno-kpi"><small>Peso</small><strong>${pair.after.peso ?? 'â€”'} kg</strong></div>
        <div class="cfOficial-aluno-kpi"><small>IMC</small><strong>${pair.after.imc ?? 'â€”'}</strong></div>
        <div class="cfOficial-aluno-kpi"><small>Gordura</small><strong>${pair.after.gordura_percentual ?? 'â€”'}%</strong></div>
      </div>
      <div class="cfOficial-aluno-nav">
        <button type="button" id="cfOficialPrev">â€¹</button><div class="cfOficial-aluno-pos">${esc(label)}</div><button type="button" id="cfOficialNext">â€º</button>
      </div>
      <div class="cfOficial-aluno-compare">
        <div class="cfOficial-aluno-card"><small>ANTES Â· ${date(pair.before.data_avaliacao)}</small><div class="cfOficial-aluno-photo">${b?`<img src="${esc(b)}" alt="Antes ${esc(label)}">`:'<div class="cfOficial-aluno-empty">Sem foto</div>'}</div></div>
        <div class="cfOficial-aluno-card"><small>DEPOIS Â· ${date(pair.after.data_avaliacao)}</small><div class="cfOficial-aluno-photo">${a?`<img src="${esc(a)}" alt="Depois ${esc(label)}">`:'<div class="cfOficial-aluno-empty">Sem foto</div>'}</div></div>
      </div>
      <div class="cfOficial-aluno-report"><strong>Resumo:</strong>
${diffPeso ? 'Peso: '+diffPeso+'\n' : ''}${diffGord ? 'Gordura: '+diffGord+'\n' : ''}${pair.after.ia_aluno || 'Continue acompanhando sua evoluÃ§Ã£o com o professor.'}</div>
    `;
    $('#cfOficialPrev')?.addEventListener('click',()=>{ current = (current + POS.length - 1) % POS.length; render(); });
    $('#cfOficialNext')?.addEventListener('click',()=>{ current = (current + 1) % POS.length; render(); });
  }

  function delta(oldVal,newVal,suffix){
    const o = Number(oldVal), n = Number(newVal);
    if(!Number.isFinite(o) || !Number.isFinite(n)) return '';
    const d = n-o;
    if(Math.abs(d) < 0.01) return 'estÃ¡vel';
    return `${d > 0 ? '+' : ''}${d.toFixed(1).replace('.', ',')} ${suffix}`;
  }

  function date(v){
    if(!v) return 'â€”';
    return new Date(v + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(load, 900), {once:true});
  else setTimeout(load, 900);
})();
