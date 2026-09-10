(() => {
  'use strict';

  const BUCKET = 'avaliacao-fotos-oficial';
  const POSICOES = [
    ['frente', 'Frente'],
    ['lado_direito', 'Lado direito'],
    ['costas', 'Costas'],
    ['lado_esquerdo', 'Lado esquerdo']
  ];

  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[c]));

  let posicaoAtual = 0;
  let par = null;
  let urlsAssinadas = {};

  function dataLocalHoje() {
    const d = new Date();
    const a = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${a}-${m}-${dia}`;
  }

  function fmtNumero(v, casas = 1) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return '—';
    return n.toFixed(casas).replace('.', ',');
  }

  function injectStyle() {
    if ($('#cfOficialAlunoStyle')) return;

    const style = document.createElement('style');
    style.id = 'cfOficialAlunoStyle';
    style.textContent = `
      .cfOficial-aluno{margin:22px 0;padding:18px;border:1px solid rgba(96,165,250,.28);border-radius:20px;background:linear-gradient(145deg,rgba(37,99,235,.12),rgba(7,16,35,.92));color:#f8fafc}
      .cfOficial-aluno h2{margin:0 0 6px;font-size:1rem;display:flex;align-items:center;gap:8px}
      .cfOficial-aluno h2 i{color:#60a5fa}
      .cfOficial-aluno p{margin:0;color:#94a3b8;font-size:.76rem;line-height:1.5}
      .cfOficial-aluno-empty{text-align:center;padding:18px;color:#94a3b8}
      .cfOficial-aluno-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}
      .cfOficial-aluno-kpi{padding:10px;border-radius:14px;background:#081226;border:1px solid rgba(148,163,184,.2);text-align:center}
      .cfOficial-aluno-kpi small{display:block;color:#94a3b8;font-size:.62rem}
      .cfOficial-aluno-kpi strong{display:block;margin-top:3px}
      .cfOficial-aluno-nav{display:flex;justify-content:center;align-items:center;gap:10px;margin:14px 0}
      .cfOficial-aluno-nav button{width:40px;height:38px;border-radius:12px;border:1px solid rgba(148,163,184,.25);background:#081226;color:#fff;font-weight:900;cursor:pointer}
      .cfOficial-aluno-pos{min-width:130px;text-align:center;font-weight:900;font-size:.78rem}
      .cfOficial-aluno-compare{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .cfOficial-aluno-card small{display:block;margin:0 0 5px;color:#94a3b8;font-size:.65rem}
      .cfOficial-aluno-photo{aspect-ratio:3/4;border-radius:15px;overflow:hidden;background:#020617;border:1px solid rgba(148,163,184,.22)}
      .cfOficial-aluno-photo img{width:100%;height:100%;object-fit:cover;display:block}
      .cfOficial-aluno-report{margin-top:12px;padding:12px;border-radius:14px;background:#081226;border:1px solid rgba(148,163,184,.2);font-size:.72rem;line-height:1.55;color:#cbd5e1;white-space:pre-line}
      @media(max-width:700px){.cfOficial-aluno-kpis{grid-template-columns:1fr 1fr}}
      @media(max-width:460px){.cfOficial-aluno{padding:14px}.cfOficial-aluno-compare{gap:6px}.cfOficial-aluno-photo{border-radius:11px}}
    `;
    document.head.appendChild(style);
  }

  function titulo() {
    return '<h2><i class="fa-solid fa-chart-line"></i> Minha Evolução</h2>';
  }

  function mount() {
    if ($('#cfOficialMinhaEvolucao')) return $('#cfOficialMinhaEvolucao');

    const main = $('main') || $('#app') || document.body;
    const section = document.createElement('section');
    section.id = 'cfOficialMinhaEvolucao';
    section.className = 'cfOficial-aluno';
    section.innerHTML = `${titulo()}<p>Comparativo liberado pelo professor.</p><div class="cfOficial-aluno-empty">Carregando evolução...</div>`;
    main.appendChild(section);
    return section;
  }

  function supa() {
    if (!window._supabase) throw new Error('Supabase não carregado.');
    return window._supabase;
  }

  async function currentAluno() {
    const sb = supa();
    const { data: { session } } = await sb.auth.getSession();
    const user = session?.user;

    if (!user) return null;

    let r = await sb
      .from('alunos')
      .select('id,nome,email,auth_user_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!r.data && user.email) {
      r = await sb
        .from('alunos')
        .select('id,nome,email,auth_user_id')
        .eq('email', user.email)
        .maybeSingle();
    }

    return r.data || null;
  }

  function avaliaçõesDistintasPorData(lista) {
    const hoje = dataLocalHoje();
    const mapa = new Map();

    for (const item of lista || []) {
      const data = item.data_avaliacao || '';
      if (!data || data > hoje) continue;

      if (!mapa.has(data)) {
        mapa.set(data, item);
      }
    }

    return Array.from(mapa.values());
  }

  async function load() {
    injectStyle();
    const section = mount();

    try {
      const aluno = await currentAluno();

      if (!aluno) {
        section.innerHTML = `${titulo()}<div class="cfOficial-aluno-empty">Entre na área do aluno para visualizar sua evolução.</div>`;
        return;
      }

      const sb = supa();

      const r = await sb
        .from('avaliacoes_oficiais')
        .select('id,data_avaliacao,peso,imc,gordura_percentual,massa_magra,ia_aluno,liberar_fotos,liberar_ia,created_at')
        .eq('aluno_id', aluno.id)
        .eq('liberado_aluno', true)
        .order('data_avaliacao', { ascending:false })
        .order('created_at', { ascending:false });

      if (r.error) throw r.error;

      const avaliacoes = avaliaçõesDistintasPorData(r.data || []);

      if (avaliacoes.length < 2) {
        section.innerHTML = `${titulo()}<p>Comparativo liberado pelo professor.</p><div class="cfOficial-aluno-empty">Seu antes/depois aparecerá aqui quando o professor liberar duas avaliações realizadas em datas diferentes.</div>`;
        return;
      }

      par = {
        after: avaliacoes[0],
        before: avaliacoes[1]
      };

      const ids = [par.before.id, par.after.id];

      const p = await sb
        .from('avaliacao_fotos_oficiais')
        .select('avaliacao_id,posicao,storage_path')
        .in('avaliacao_id', ids)
        .eq('released_to_student', true);

      if (p.error) throw p.error;

      urlsAssinadas = {};

      for (const photo of p.data || []) {
        const side = photo.avaliacao_id === par.before.id ? 'before' : 'after';
        const signed = await sb.storage.from(BUCKET).createSignedUrl(photo.storage_path, 1200);

        if (!signed.error) {
          urlsAssinadas[`${side}:${photo.posicao}`] = signed.data.signedUrl;
        }
      }

      render();

    } catch (err) {
      console.error('[Evolução oficial do aluno]', err);
      section.innerHTML = `${titulo()}<div class="cfOficial-aluno-empty">Não foi possível carregar sua evolução agora.</div>`;
    }
  }

  function render() {
    const section = mount();
    const [posicao, label] = POSICOES[posicaoAtual];

    const beforeUrl = urlsAssinadas[`before:${posicao}`] || '';
    const afterUrl = urlsAssinadas[`after:${posicao}`] || '';

    const diffPeso = delta(par.before.peso, par.after.peso, 'kg');
    const diffGordura = delta(par.before.gordura_percentual, par.after.gordura_percentual, '%');
    const diffMassa = delta(par.before.massa_magra, par.after.massa_magra, 'kg');

    const podeFotos = Boolean(par.before.liberar_fotos && par.after.liberar_fotos);
    const podeIA = Boolean(par.after.liberar_ia);

    section.innerHTML = `
      ${titulo()}
      <p>Compare os dados e as fotos liberadas pelo seu professor.</p>

      <div class="cfOficial-aluno-kpis">
        <div class="cfOficial-aluno-kpi"><small>Peso</small><strong>${fmtNumero(par.after.peso)} kg</strong></div>
        <div class="cfOficial-aluno-kpi"><small>IMC</small><strong>${fmtNumero(par.after.imc, 2)}</strong></div>
        <div class="cfOficial-aluno-kpi"><small>Gordura corporal</small><strong>${fmtNumero(par.after.gordura_percentual)}%</strong></div>
        <div class="cfOficial-aluno-kpi"><small>Massa magra</small><strong>${fmtNumero(par.after.massa_magra)} kg</strong></div>
      </div>

      <div class="cfOficial-aluno-nav">
        <button type="button" id="cfOficialPrev" aria-label="Foto anterior">‹</button>
        <div class="cfOficial-aluno-pos">${esc(label)}</div>
        <button type="button" id="cfOficialNext" aria-label="Próxima foto">›</button>
      </div>

      <div class="cfOficial-aluno-compare">
        <div class="cfOficial-aluno-card">
          <small>ANTES · ${formatarData(par.before.data_avaliacao)}</small>
          <div class="cfOficial-aluno-photo">
            ${podeFotos && beforeUrl
              ? `<img src="${esc(beforeUrl)}" alt="Antes - ${esc(label)}">`
              : '<div class="cfOficial-aluno-empty">Foto não liberada</div>'}
          </div>
        </div>

        <div class="cfOficial-aluno-card">
          <small>DEPOIS · ${formatarData(par.after.data_avaliacao)}</small>
          <div class="cfOficial-aluno-photo">
            ${podeFotos && afterUrl
              ? `<img src="${esc(afterUrl)}" alt="Depois - ${esc(label)}">`
              : '<div class="cfOficial-aluno-empty">Foto não liberada</div>'}
          </div>
        </div>
      </div>

      <div class="cfOficial-aluno-report"><strong>Resumo da evolução:</strong>
${diffPeso ? `Peso: ${diffPeso}\n` : ''}${diffGordura ? `Gordura corporal: ${diffGordura}\n` : ''}${diffMassa ? `Massa magra: ${diffMassa}\n` : ''}${podeIA && par.after.ia_aluno ? par.after.ia_aluno : 'Continue acompanhando sua evolução com o professor.'}</div>
    `;

    $('#cfOficialPrev')?.addEventListener('click', () => {
      posicaoAtual = (posicaoAtual + POSICOES.length - 1) % POSICOES.length;
      render();
    });

    $('#cfOficialNext')?.addEventListener('click', () => {
      posicaoAtual = (posicaoAtual + 1) % POSICOES.length;
      render();
    });
  }

  function delta(oldVal, newVal, suffix) {
    const oldN = Number(oldVal);
    const newN = Number(newVal);

    if (!Number.isFinite(oldN) || !Number.isFinite(newN) || oldN <= 0 || newN <= 0) {
      return '';
    }

    const d = newN - oldN;

    if (Math.abs(d) < 0.01) return 'estável';

    return `${d > 0 ? '+' : ''}${d.toFixed(1).replace('.', ',')} ${suffix}`;
  }

  function formatarData(v) {
    if (!v) return '—';
    return new Date(v + 'T12:00:00').toLocaleDateString('pt-BR');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(load, 700), { once:true });
  } else {
    setTimeout(load, 700);
  }
})();
