(() => {
  'use strict';

  const BUCKET = 'avaliacao-fotos-v7';
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
    if($('#cfv7AlunoStyle')) return;
    const style = document.createElement('style');
    style.id = 'cfv7AlunoStyle';
    style.textContent = `
      .cfv7-aluno{margin:22px 0;padding:18px;border:1px solid rgba(96,165,250,.28);border-radius:20px;background:linear-gradient(145deg,rgba(37,99,235,.12),rgba(7,16,35,.92));color:#f8fafc}
      .cfv7-aluno h2{margin:0 0 6px;font-size:1rem}.cfv7-aluno p{margin:0;color:#94a3b8;font-size:.76rem;line-height:1.5}
      .cfv7-aluno-empty{text-align:center;padding:18px;color:#94a3b8}.cfv7-aluno-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}
      .cfv7-aluno-kpi{padding:10px;border-radius:14px;background:#081226;border:1px solid rgba(148,163,184,.2);text-align:center}.cfv7-aluno-kpi small{display:block;color:#94a3b8;font-size:.62rem}.cfv7-aluno-kpi strong{display:block;margin-top:3px}
      .cfv7-aluno-nav{display:flex;justify-content:center;align-items:center;gap:10px;margin:14px 0}.cfv7-aluno-nav button{width:40px;height:38px;border-radius:12px;border:1px solid rgba(148,163,184,.25);background:#081226;color:#fff;font-weight:900}.cfv7-aluno-pos{min-width:130px;text-align:center;font-weight:900;font-size:.78rem}
      .cfv7-aluno-compare{display:grid;grid-template-columns:1fr 1fr;gap:9px}.cfv7-aluno-card small{display:block;margin:0 0 5px;color:#94a3b8;font-size:.65rem}.cfv7-aluno-photo{aspect-ratio:3/4;border-radius:15px;overflow:hidden;background:#020617;border:1px solid rgba(148,163,184,.22)}.cfv7-aluno-photo img{width:100%;height:100%;object-fit:cover;display:block}
      .cfv7-aluno-report{margin-top:12px;padding:12px;border-radius:14px;background:#081226;border:1px solid rgba(148,163,184,.2);font-size:.72rem;line-height:1.55;color:#cbd5e1;white-space:pre-line}
      @media(max-width:460px){.cfv7-aluno{padding:14px}.cfv7-aluno-kpis{grid-template-columns:1fr}.cfv7-aluno-compare{gap:6px}.cfv7-aluno-photo{border-radius:11px}}
    `;
    document.head.appendChild(style);
  }

  function mount(){
    if($('#cfv7MinhaEvolucao')) return $('#cfv7MinhaEvolucao');
    const main = $('main') || $('#app') || document.body;
    const section = document.createElement('section');
    section.id = 'cfv7MinhaEvolucao';
    section.className = 'cfv7-aluno';
    section.innerHTML = `<h2>📈 Minha Evolução</h2><p>Comparativo liberado pelo professor.</p><div class="cfv7-aluno-empty">Carregando evolução...</div>`;
    main.appendChild(section);
    return section;
  }

  async function supa(){
    if(!window._supabase) throw new Error('Supabase não carregado.');
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
      if(!aluno){ section.innerHTML = `<h2>📈 Minha Evolução</h2><div class="cfv7-aluno-empty">Entre na área do aluno para visualizar sua evolução.</div>`; return; }
      const sb = await supa();
      const r = await sb.from('v7_assessments')
        .select('id,data_avaliacao,peso,imc,gordura_percentual,ia_aluno,liberar_fotos,liberar_ia,created_at')
        .eq('aluno_id', aluno.id)
        .eq('liberado_aluno', true)
        .order('data_avaliacao', {ascending:false})
        .order('created_at', {ascending:false});
      if(r.error) throw r.error;

      const assessments = r.data || [];
      if(assessments.length < 2){
        section.innerHTML = `<h2>📈 Minha Evolução</h2><p>Comparativo liberado pelo professor.</p><div class="cfv7-aluno-empty">Seu antes/depois aparecerá aqui quando o professor liberar duas avaliações.</div>`;
        return;
      }

      pair = { after:assessments[0], before:assessments[1] };
      const ids = [pair.before.id, pair.after.id];

      const p = await sb.from('v7_assessment_photos').select('assessment_id,posicao,storage_path').in('assessment_id', ids).eq('released_to_student', true);
      if(p.error) throw p.error;

      signed = {};
      for(const photo of p.data || []){
        const side = photo.assessment_id === pair.before.id ? 'before' : 'after';
        const url = await sb.storage.from(BUCKET).createSignedUrl(photo.storage_path, 1200);
        if(!url.error) signed[`${side}:${photo.posicao}`] = url.data.signedUrl;
      }
      render();
    }catch(err){
      console.error('[V7 aluno evolução]',err);
      section.innerHTML = `<h2>📈 Minha Evolução</h2><div class="cfv7-aluno-empty">Não foi possível carregar a evolução agora.</div>`;
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
      <h2>📈 Minha Evolução</h2>
      <p>Antes e depois liberado pelo professor.</p>
      <div class="cfv7-aluno-kpis">
        <div class="cfv7-aluno-kpi"><small>Peso</small><strong>${pair.after.peso ?? '—'} kg</strong></div>
        <div class="cfv7-aluno-kpi"><small>IMC</small><strong>${pair.after.imc ?? '—'}</strong></div>
        <div class="cfv7-aluno-kpi"><small>Gordura</small><strong>${pair.after.gordura_percentual ?? '—'}%</strong></div>
      </div>
      <div class="cfv7-aluno-nav">
        <button type="button" id="cfv7Prev">‹</button><div class="cfv7-aluno-pos">${esc(label)}</div><button type="button" id="cfv7Next">›</button>
      </div>
      <div class="cfv7-aluno-compare">
        <div class="cfv7-aluno-card"><small>ANTES · ${date(pair.before.data_avaliacao)}</small><div class="cfv7-aluno-photo">${b?`<img src="${esc(b)}" alt="Antes ${esc(label)}">`:'<div class="cfv7-aluno-empty">Sem foto</div>'}</div></div>
        <div class="cfv7-aluno-card"><small>DEPOIS · ${date(pair.after.data_avaliacao)}</small><div class="cfv7-aluno-photo">${a?`<img src="${esc(a)}" alt="Depois ${esc(label)}">`:'<div class="cfv7-aluno-empty">Sem foto</div>'}</div></div>
      </div>
      <div class="cfv7-aluno-report"><strong>Resumo:</strong>
${diffPeso ? 'Peso: '+diffPeso+'\n' : ''}${diffGord ? 'Gordura: '+diffGord+'\n' : ''}${pair.after.ia_aluno || 'Continue acompanhando sua evolução com o professor.'}</div>
    `;
    $('#cfv7Prev')?.addEventListener('click',()=>{ current = (current + POS.length - 1) % POS.length; render(); });
    $('#cfv7Next')?.addEventListener('click',()=>{ current = (current + 1) % POS.length; render(); });
  }

  function delta(oldVal,newVal,suffix){
    const o = Number(oldVal), n = Number(newVal);
    if(!Number.isFinite(o) || !Number.isFinite(n)) return '';
    const d = n-o;
    if(Math.abs(d) < 0.01) return 'estável';
    return `${d > 0 ? '+' : ''}${d.toFixed(1).replace('.', ',')} ${suffix}`;
  }

  function date(v){
    if(!v) return '—';
    return new Date(v + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(load, 900), {once:true});
  else setTimeout(load, 900);
})();
