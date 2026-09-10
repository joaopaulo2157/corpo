(() => {
  'use strict';

  const BUCKET = 'avaliacao-fotos-oficial';
  const POSICOES = [
    ['frente', 'Frente'],
    ['lado_direito', 'Lado direito'],
    ['costas', 'Costas'],
    ['lado_esquerdo', 'Lado esquerdo']
  ];

  const state = {
    alunoId: null,
    alunoNome: '',
    fotos: new Map(),
    analises: new Map(),
    historico: []
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function txt(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[c]));
  }

  function num(v) {
    const x = Number(String(v ?? '').trim().replace(',', '.'));
    return Number.isFinite(x) ? x : null;
  }

  function hoje() {
    return new Date().toISOString().slice(0, 10);
  }

  function toast(msg, tipo = '') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, tipo);
      return;
    }
    if (tipo === 'error') alert(msg);
    else console.log('[CORPOFITNESS]', msg);
  }

  function sb() {
    if (window._supabase) return window._supabase;
    try {
      if (typeof _supabase !== 'undefined' && _supabase) return _supabase;
    } catch (e) {}
    throw new Error('Supabase nao carregado.');
  }

  function labelCampo(k) {
    const m = {
      ombro:'Ombro', torax:'T\u00f3rax', cintura:'Cintura', abdomen:'Abd\u00f4men',
      quadril:'Quadril', braco_direito:'Bra\u00e7o direito', braco_esquerdo:'Bra\u00e7o esquerdo',
      antebraco_direito:'Antebra\u00e7o direito', antebraco_esquerdo:'Antebra\u00e7o esquerdo',
      coxa_direita:'Coxa direita', coxa_esquerda:'Coxa esquerda',
      panturrilha_direita:'Panturrilha direita', panturrilha_esquerda:'Panturrilha esquerda',
      subescapular:'Subescapular', tricipital:'Tricipital', bicipital:'Bicipital',
      peitoral:'Peitoral', axilar_media:'Axilar m\u00e9dia', supra_iliaca:'Supra-il\u00edaca',
      abdominal:'Abdominal', coxa:'Coxa', panturrilha:'Panturrilha'
    };
    return m[k] || k;
  }

  function modalHtml() {
    const medidas = [
      'ombro','torax','cintura','abdomen','quadril','braco_direito','braco_esquerdo',
      'antebraco_direito','antebraco_esquerdo','coxa_direita','coxa_esquerda',
      'panturrilha_direita','panturrilha_esquerda'
    ];

    const dobras = [
      'subescapular','tricipital','bicipital','peitoral','axilar_media',
      'supra_iliaca','abdominal','coxa','panturrilha'
    ];

    return `
      <div id="modalAvaliacaoOficial" aria-hidden="true">
        <div class="cfOficial-modal">
          <div class="cfOficial-header">
            <div class="cfOficial-title">
              <h2>Avalia\u00e7\u00e3o F\u00edsica</h2>
              <p id="cfOficialAlunoNome">Aluno(a)</p>
            </div>
            <button type="button" class="cfOficial-close" id="cfOficialClose" aria-label="Fechar">\u2715</button>
          </div>

          <div class="cfOficial-body">
            <div class="cfOficial-tabs">
              <button type="button" class="cfOficial-tab active" data-tab="dados">Dados</button>
              <button type="button" class="cfOficial-tab" data-tab="medidas">Medidas</button>
              <button type="button" class="cfOficial-tab" data-tab="dobras">Dobras</button>
              <button type="button" class="cfOficial-tab" data-tab="fotos">Fotos + IA</button>
              <button type="button" class="cfOficial-tab" data-tab="historico">Hist\u00f3rico</button>
            </div>

            <section class="cfOficial-panel active" data-panel="dados">
              <div class="cfOficial-card">
                <h3>Dados gerais</h3>
                <div class="cfOficial-grid">
                  <div class="cfOficial-field">
                    <label>Data</label>
                    <input type="date" id="cfOficialData">
                  </div>
                  <div class="cfOficial-field">
                    <label>Objetivo</label>
                    <select id="cfOficialObjetivo">
                      <option value="">Selecione</option>
                      <option>Emagrecimento</option>
                      <option>Hipertrofia</option>
                      <option>Condicionamento</option>
                      <option>Sa\u00fade e qualidade de vida</option>
                      <option>Reabilita\u00e7\u00e3o / retorno</option>
                    </select>
                  </div>
                  <div class="cfOficial-field">
                    <label>Sexo para c\u00e1lculo</label>
                    <select id="cfOficialSexo">
                      <option value="">Selecione</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div class="cfOficial-field">
                    <label>Idade</label>
                    <input type="number" id="cfOficialIdade" min="1" max="120">
                  </div>
                </div>

                <div class="cfOficial-grid" style="margin-top:12px">
                  <div class="cfOficial-field">
                    <label>Peso (kg)</label>
                    <input type="number" step="0.1" id="cfOficialPeso">
                  </div>
                  <div class="cfOficial-field">
                    <label>Altura (m)</label>
                    <input type="number" step="0.01" id="cfOficialAltura">
                  </div>
                  <div class="cfOficial-field">
                    <label>% de gordura autom\u00e1tico</label>
                    <input type="number" step="0.1" id="cfOficialGordura" readonly placeholder="Calculado pelas dobras">
                  </div>
                  <div class="cfOficial-field">
                    <label>Massa magra (kg)</label>
                    <input type="number" step="0.1" id="cfOficialMassaMagra" readonly placeholder="Calculada automaticamente">
                  </div>
                </div>

                <div class="cfOficial-kpis">
                  <div class="cfOficial-kpi"><small>IMC</small><strong id="cfOficialIMC">0,00</strong></div>
                  <div class="cfOficial-kpi"><small>Classifica\u00e7\u00e3o</small><strong id="cfOficialIMCClass">\u2014</strong></div>
                  <div class="cfOficial-kpi"><small>Soma das dobras</small><strong id="cfOficialSomaDobras">0</strong></div>
                  <div class="cfOficial-kpi"><small>Fotos</small><strong id="cfOficialStatusFotos">0/4</strong></div>
                </div>
              </div>

              <div class="cfOficial-card">
                <h3>Observa\u00e7\u00f5es do professor</h3>
                <div class="cfOficial-field">
                  <label>Relat\u00f3rio / observa\u00e7\u00f5es</label>
                  <textarea id="cfOficialObs" placeholder="Objetivo da fase, restri\u00e7\u00f5es, recomenda\u00e7\u00f5es e observa\u00e7\u00f5es..."></textarea>
                </div>
              </div>
            </section>

            <section class="cfOficial-panel" data-panel="medidas">
              <div class="cfOficial-card">
                <h3>Perimetria</h3>
                <div class="cfOficial-grid">
                  ${medidas.map(k => `
                    <div class="cfOficial-field">
                      <label>${txt(labelCampo(k))} (cm)</label>
                      <input type="number" step="0.1" data-medida="${k}">
                    </div>
                  `).join('')}
                </div>
              </div>
            </section>

            <section class="cfOficial-panel" data-panel="dobras">
              <div class="cfOficial-card">
                <h3>Dobras cut\u00e2neas</h3>
                <div class="cfOficial-grid">
                  ${dobras.map(k => `
                    <div class="cfOficial-field">
                      <label>${txt(labelCampo(k))} (mm)</label>
                      <input type="number" step="0.1" data-dobra="${k}">
                    </div>
                  `).join('')}
                </div>
              </div>
            </section>

            <section class="cfOficial-panel" data-panel="fotos">
              <div class="cfOficial-card">
                <h3>Fotos da avalia\u00e7\u00e3o</h3>

                <div class="cfOficial-photo-grid">
                  ${POSICOES.map(([key, nome]) => `
                    <div class="cfOficial-photo" data-photo-box="${key}" tabindex="0" role="button" aria-label="Selecionar foto ${txt(nome)}">
                      <img data-photo-img="${key}" alt="${txt(nome)}">
                      <canvas data-photo-canvas="${key}"></canvas>

                      <div class="cfOficial-empty">
                        <div>
                          <i class="fa-solid fa-camera"></i>
                          <strong>${txt(nome)}</strong>
                          <span>Clique em qualquer parte para selecionar</span>
                        </div>
                      </div>

                      <div class="cfOficial-photo-actions">
                        <button type="button" data-pick-photo="${key}">Foto</button>
                        <button type="button" data-ai-photo="${key}">Analisar</button>
                      </div>

                      <div class="cfOficial-photo-label">
                        <strong>${txt(nome)}</strong>
                        <small data-photo-status="${key}">Pendente</small>
                      </div>

                      <input hidden type="file" accept="image/jpeg,image/png,image/webp" data-photo-file="${key}">
                    </div>
                  `).join('')}
                </div>

                <div class="cfOficial-ai-box" id="cfOficialAIBox">
                  <strong>IA postural:</strong> selecione as fotos e clique em "Analisar todas as fotos".
                </div>
              </div>
            </section>

            <section class="cfOficial-panel" data-panel="historico">
              <div class="cfOficial-card">
                <h3>Libera\u00e7\u00e3o para o aluno</h3>
                <div class="cfOficial-release">
                  <label class="cfOficial-switch"><input type="checkbox" id="cfOficialLiberarFotos" checked> Liberar fotos</label>
                  <label class="cfOficial-switch"><input type="checkbox" id="cfOficialLiberarIA" checked> Liberar IA</label>
                  <label class="cfOficial-switch"><input type="checkbox" id="cfOficialLiberarPDF"> Liberar PDF</label>
                  <button type="button" class="cfOficial-btn success" id="cfOficialLiberarComparativo">
                    Liberar antes/depois ao aluno
                  </button>
                </div>
              </div>

              <div class="cfOficial-card">
                <h3>Avalia\u00e7\u00f5es salvas</h3>
                <div class="cfOficial-history" id="cfOficialHistory">
                  <div style="color:#94a3b8">Carregando...</div>
                </div>
              </div>
            </section>
          </div>

          <div class="cfOficial-actions">
            <button type="button" class="cfOficial-btn warn" id="cfOficialFechar2">Cancelar</button>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button type="button" class="cfOficial-btn" id="cfOficialGerarIA">Analisar todas as fotos</button>
              <button type="button" class="cfOficial-btn primary" id="cfOficialSalvar">Salvar avalia\u00e7\u00e3o</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function ensureModal() {
    const antigo = $('#modalAvaliacaoOficial');
    if (antigo) antigo.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml());

    $('#cfOficialClose').addEventListener('click', fechar);
    $('#cfOficialFechar2').addEventListener('click', fechar);

    $('#modalAvaliacaoOficial').addEventListener('click', e => {
      if (e.target.id === 'modalAvaliacaoOficial') fechar();
    });

    $$('.cfOficial-tab').forEach(btn => {
      btn.addEventListener('click', () => mudarAba(btn.dataset.tab));
    });

    ['cfOficialPeso','cfOficialAltura','cfOficialIdade'].forEach(id => {
      $('#' + id).addEventListener('input', recalcular);
    });

    $('#cfOficialSexo').addEventListener('change', recalcular);

    $$('[data-dobra]').forEach(el => el.addEventListener('input', recalcular));

    POSICOES.forEach(([key]) => {
      const input = $(`[data-photo-file="${key}"]`);
      const box = $(`[data-photo-box="${key}"]`);

      box.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        input.click();
      });

      box.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        input.click();
      });

      $(`[data-pick-photo="${key}"]`).addEventListener('click', e => {
        e.stopPropagation();
        input.click();
      });

      $(`[data-ai-photo="${key}"]`).addEventListener('click', async e => {
        e.stopPropagation();
        await analisarFoto(key, true);
      });

      input.addEventListener('change', () => {
        selecionarFoto(key, input.files?.[0] || null);
      });
    });

    $('#cfOficialGerarIA').addEventListener('click', analisarTodas);
    $('#cfOficialSalvar').addEventListener('click', salvar);
    $('#cfOficialLiberarComparativo').addEventListener('click', liberarComparativo);
  }

  function mudarAba(aba) {
    $$('.cfOficial-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === aba));
    $$('.cfOficial-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === aba));
  }

  function fechar() {
    $('#modalAvaliacaoOficial')?.classList.remove('active');
  }

  function limpar() {
    state.fotos.forEach(v => {
      if (v.url) URL.revokeObjectURL(v.url);
    });

    state.fotos.clear();
    state.analises.clear();

    ['cfOficialObjetivo','cfOficialSexo','cfOficialIdade','cfOficialPeso','cfOficialAltura',
     'cfOficialGordura','cfOficialMassaMagra','cfOficialObs'].forEach(id => {
      const el = $('#' + id);
      if (el) el.value = '';
    });

    $$('[data-medida],[data-dobra]').forEach(el => el.value = '');

    POSICOES.forEach(([key]) => {
      const box = $(`[data-photo-box="${key}"]`);
      const img = $(`[data-photo-img="${key}"]`);
      const input = $(`[data-photo-file="${key}"]`);
      const status = $(`[data-photo-status="${key}"]`);
      const canvas = $(`[data-photo-canvas="${key}"]`);

      box?.classList.remove('has-img');
      img?.removeAttribute('src');
      if (input) input.value = '';
      if (status) status.textContent = 'Pendente';
      if (canvas) {
        canvas.width = 1;
        canvas.height = 1;
      }
    });

    $('#cfOficialData').value = hoje();
    $('#cfOficialAIBox').innerHTML =
      '<strong>IA postural:</strong> selecione as fotos e clique em "Analisar todas as fotos".';

    recalcular();
  }

  async function abrir(alunoId, alunoNome) {
    if (!$('#modalAvaliacaoOficial')) ensureModal();

    limpar();
    state.alunoId = alunoId;
    state.alunoNome = alunoNome || 'Aluno(a)';

    $('#cfOficialAlunoNome').textContent = `Aluno(a): ${state.alunoNome}`;
    $('#cfOficialData').value = hoje();

    $('#modalAvaliacaoOficial').classList.add('active');
    mudarAba('dados');

    await carregarHistorico();
  }

  function coletar(selector, attr) {
    const out = {};
    $$(selector).forEach(el => {
      out[el.dataset[attr]] = num(el.value);
    });
    return out;
  }

  function classificarImc(imc) {
    if (!imc) return '\u2014';
    if (imc < 18.5) return 'Baixo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    if (imc < 35) return 'Obesidade I';
    if (imc < 40) return 'Obesidade II';
    return 'Obesidade III';
  }

  function calcularGordura(sexo, idade, dobras) {
    if (!idade || !['M','F'].includes(sexo)) return null;

    const campos = [
      'peitoral','axilar_media','tricipital','subescapular',
      'abdominal','supra_iliaca','coxa'
    ];

    const vals = campos.map(k => Number(dobras[k]));

    if (vals.some(v => !Number.isFinite(v) || v <= 0)) return null;

    const soma7 = vals.reduce((s, v) => s + v, 0);

    const densidade = sexo === 'M'
      ? 1.112 - (0.00043499 * soma7) + (0.00000055 * soma7 * soma7) - (0.00028826 * idade)
      : 1.097 - (0.00046971 * soma7) + (0.00000056 * soma7 * soma7) - (0.00012828 * idade);

    if (!Number.isFinite(densidade) || densidade <= 0) return null;

    const gordura = (495 / densidade) - 450;

    if (!Number.isFinite(gordura) || gordura < 2 || gordura > 70) return null;

    return gordura;
  }

  function recalcular() {
    const peso = num($('#cfOficialPeso')?.value);
    const altura = num($('#cfOficialAltura')?.value);
    const idade = num($('#cfOficialIdade')?.value);
    const sexo = $('#cfOficialSexo')?.value || '';
    const dobras = coletar('[data-dobra]', 'dobra');

    const imc = peso && altura ? peso / (altura * altura) : null;
    const somaDobras = Object.values(dobras).reduce((s, v) => s + (Number(v) || 0), 0);
    const gordura = calcularGordura(sexo, idade, dobras);
    const massaMagra = peso && gordura != null ? peso * (1 - gordura / 100) : null;

    $('#cfOficialIMC').textContent = imc ? imc.toFixed(2).replace('.', ',') : '0,00';
    $('#cfOficialIMCClass').textContent = classificarImc(imc);
    $('#cfOficialSomaDobras').textContent = somaDobras.toFixed(1).replace('.', ',');
    $('#cfOficialStatusFotos').textContent = `${state.fotos.size}/4`;

    $('#cfOficialGordura').value = gordura != null ? gordura.toFixed(1) : '';
    $('#cfOficialMassaMagra').value = massaMagra != null ? massaMagra.toFixed(1) : '';
  }

  function selecionarFoto(key, file) {
    if (!file) return;

    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      toast('Use uma imagem JPG, PNG ou WEBP.', 'error');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast('A foto deve ter no maximo 12 MB.', 'error');
      return;
    }

    const antiga = state.fotos.get(key);
    if (antiga?.url) URL.revokeObjectURL(antiga.url);

    const url = URL.createObjectURL(file);
    state.fotos.set(key, { file, url });
    state.analises.delete(key);

    const img = $(`[data-photo-img="${key}"]`);
    img.src = url;
    $(`[data-photo-box="${key}"]`).classList.add('has-img');
    $(`[data-photo-status="${key}"]`).textContent = 'Selecionada';

    const canvas = $(`[data-photo-canvas="${key}"]`);
    canvas.width = 1;
    canvas.height = 1;

    recalcular();
  }

  let posePromise = null;

  async function criarPoseLandmarker() {
    if (posePromise) return posePromise;

    posePromise = (async () => {
      const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
      const fileset = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      const opcoes = {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'
        },
        runningMode: 'IMAGE',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      };

      try {
        return await vision.PoseLandmarker.createFromOptions(fileset, {
          ...opcoes,
          baseOptions: { ...opcoes.baseOptions, delegate: 'GPU' }
        });
      } catch (gpuError) {
        console.warn('[IA] GPU indisponivel; usando CPU.', gpuError);
        return await vision.PoseLandmarker.createFromOptions(fileset, opcoes);
      }
    })().catch(err => {
      posePromise = null;
      throw err;
    });

    return posePromise;
  }

  function ponto(lm, idx, min = 0.25) {
    const p = lm?.[idx];
    if (!p) return null;
    const vis = Number(p.visibility ?? p.presence ?? 1);
    if (Number.isFinite(vis) && vis < min) return null;
    return p;
  }

  function meio(a, b) {
    if (!a || !b) return null;
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      z: ((a.z || 0) + (b.z || 0)) / 2
    };
  }

  function distancia(a, b) {
    if (!a || !b) return null;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function anguloHorizontal(a, b) {
    if (!a || !b) return null;
    return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  }

  function anguloVertical(a, b) {
    if (!a || !b) return null;
    return Math.atan2(b.x - a.x, b.y - a.y) * 180 / Math.PI;
  }

  function anguloArticular(a, b, c) {
    if (!a || !b || !c) return null;

    const abx = a.x - b.x;
    const aby = a.y - b.y;
    const cbx = c.x - b.x;
    const cby = c.y - b.y;

    const den = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
    if (!den) return null;

    const cos = Math.max(-1, Math.min(1, (abx * cbx + aby * cby) / den));
    return Math.acos(cos) * 180 / Math.PI;
  }

  function fmt(v, casas = 1) {
    return Number.isFinite(v) ? v.toFixed(casas).replace('.', ',') : '\u2014';
  }

  function mapear(img, canvas, p) {
    if (!p) return null;

    const sw = img.naturalWidth || 1;
    const sh = img.naturalHeight || 1;
    const tw = canvas.width;
    const th = canvas.height;

    const scale = Math.max(tw / sw, th / sh);
    const rw = sw * scale;
    const rh = sh * scale;
    const ox = (tw - rw) / 2;
    const oy = (th - rh) / 2;

    return {
      x: ox + p.x * sw * scale,
      y: oy + p.y * sh * scale
    };
  }

  function desenharPontos(key, lm) {
    const img = $(`[data-photo-img="${key}"]`);
    const canvas = $(`[data-photo-canvas="${key}"]`);

    const rect = img.getBoundingClientRect();
    canvas.width = Math.max(300, Math.round(rect.width));
    canvas.height = Math.max(400, Math.round(rect.height));

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const conexoes = [
      [11,12],[11,13],[13,15],[12,14],[14,16],
      [11,23],[12,24],[23,24],[23,25],[25,27],
      [24,26],[26,28]
    ];

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(59,130,246,.82)';

    conexoes.forEach(([a,b]) => {
      const pa = ponto(lm, a);
      const pb = ponto(lm, b);
      if (!pa || !pb) return;

      const ca = mapear(img, canvas, pa);
      const cb = mapear(img, canvas, pb);

      ctx.beginPath();
      ctx.moveTo(ca.x, ca.y);
      ctx.lineTo(cb.x, cb.y);
      ctx.stroke();
    });

    const ids = [0,11,12,23,24,25,26,27,28];

    ids.forEach(idx => {
      const p = ponto(lm, idx);
      if (!p) return;

      const c = mapear(img, canvas, p);

      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#2563eb';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#dbeafe';
      ctx.stroke();
    });

    const ombros = meio(ponto(lm,11), ponto(lm,12));
    const quadril = meio(ponto(lm,23), ponto(lm,24));
    const tronco = meio(ombros, quadril);

    [
      [ombros,'Ombros'],
      [tronco,'Tronco'],
      [quadril,'Quadril']
    ].forEach(([p, nome]) => {
      if (!p) return;

      const c = mapear(img, canvas, p);
      ctx.font = '700 12px Arial';

      const largura = ctx.measureText(nome).width + 14;
      const x = Math.max(4, Math.min(canvas.width - largura - 4, c.x - largura / 2));
      const y = Math.max(4, c.y - 30);

      ctx.fillStyle = 'rgba(15,23,42,.95)';
      ctx.fillRect(x, y, largura, 21);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(nome, x + 7, y + 15);
    });
  }

  function analisarFrenteCostas(lm, key) {
    const oe = ponto(lm,11);
    const od = ponto(lm,12);
    const qe = ponto(lm,23);
    const qd = ponto(lm,24);
    const je = ponto(lm,25);
    const jd = ponto(lm,26);
    const te = ponto(lm,27);
    const td = ponto(lm,28);

    const largura = distancia(oe,od) || distancia(qe,qd) || 0.2;

    const aOmbro = anguloHorizontal(oe,od);
    const aQuadril = anguloHorizontal(qe,qd);

    const centroOmbro = meio(oe,od);
    const centroQuadril = meio(qe,qd);

    const deslocamento = centroOmbro && centroQuadril
      ? ((centroOmbro.x - centroQuadril.x) / largura) * 100
      : null;

    const joelhos = je && jd ? ((je.y - jd.y) / largura) * 100 : null;
    const tornozelos = te && td ? ((te.y - td.y) / largura) * 100 : null;

    const out = [];

    out.push(key === 'costas'
      ? '<strong>Conclusao da vista posterior:</strong>'
      : '<strong>Conclusao da vista frontal:</strong>');

    if (aOmbro != null) {
      const abs = Math.abs(aOmbro);
      out.push(
        abs < 2
          ? `\u2022 Ombros: alinhamento proximo do horizontal (${fmt(abs)} graus).`
          : `\u2022 Ombros: inclinacao aparente de ${fmt(abs)} graus; revisar assimetria entre os lados.`
      );
    }

    if (aQuadril != null) {
      const abs = Math.abs(aQuadril);
      out.push(
        abs < 2
          ? `\u2022 Quadril/pelve: alinhamento proximo do horizontal (${fmt(abs)} graus).`
          : `\u2022 Quadril/pelve: inclinacao aparente de ${fmt(abs)} graus; revisar nivelamento pelvico.`
      );
    }

    if (deslocamento != null) {
      out.push(
        `\u2022 Tronco: deslocamento lateral aproximado de ${fmt(Math.abs(deslocamento))}% da largura corporal ` +
        `para ${deslocamento > 0 ? 'a direita' : 'a esquerda'} da imagem.`
      );
    }

    if (joelhos != null) {
      out.push(`\u2022 Joelhos: diferenca vertical aproximada de ${fmt(Math.abs(joelhos))}% da largura corporal.`);
    }

    if (tornozelos != null) {
      out.push(`\u2022 Apoio/tornozelos: diferenca vertical aproximada de ${fmt(Math.abs(tornozelos))}% da largura corporal.`);
    }

    const alertas = [];
    if (Math.abs(aOmbro || 0) >= 4.5) alertas.push('assimetria de ombros');
    if (Math.abs(aQuadril || 0) >= 4.5) alertas.push('inclinacao pelvica');
    if (Math.abs(deslocamento || 0) >= 7) alertas.push('deslocamento lateral do tronco');
    if (Math.abs(joelhos || 0) >= 8) alertas.push('alinhamento dos joelhos');

    out.push(
      alertas.length
        ? `\u2022 Pontos prioritarios para o professor: ${alertas.join(', ')}.`
        : '\u2022 Os principais eixos 2D estao proximos da simetria nesta imagem.'
    );

    if (key === 'costas') {
      out.push('\u2022 Escapulas e curvaturas da coluna devem ser confirmadas presencialmente.');
    }

    return out;
  }

  function analisarLado(lm) {
    const somaE = [7,11,23,25,27].reduce((s,i) => s + Number(lm?.[i]?.visibility || 0), 0);
    const somaD = [8,12,24,26,28].reduce((s,i) => s + Number(lm?.[i]?.visibility || 0), 0);

    const ladoE = somaE >= somaD;
    const idx = ladoE
      ? {orelha:7, ombro:11, quadril:23, joelho:25, tornozelo:27}
      : {orelha:8, ombro:12, quadril:24, joelho:26, tornozelo:28};

    const orelha = ponto(lm,idx.orelha);
    const ombro = ponto(lm,idx.ombro);
    const quadril = ponto(lm,idx.quadril);
    const joelho = ponto(lm,idx.joelho);
    const tornozelo = ponto(lm,idx.tornozelo);

    const tronco = distancia(ombro,quadril) || 0.2;

    const cabeca = orelha && ombro ? ((orelha.x - ombro.x) / tronco) * 100 : null;
    const inclinacao = anguloVertical(ombro,quadril);
    const aQuadril = anguloArticular(ombro,quadril,joelho);
    const aJoelho = anguloArticular(quadril,joelho,tornozelo);

    const out = ['<strong>Conclusao da vista lateral:</strong>'];

    if (cabeca != null) {
      out.push(
        `\u2022 Cabeca em relacao ao ombro: projecao horizontal de ${fmt(Math.abs(cabeca))}% do comprimento do tronco.`
      );
    }

    if (inclinacao != null) {
      out.push(`\u2022 Tronco: inclinacao aparente de ${fmt(Math.abs(inclinacao))} graus em relacao a vertical.`);
    }

    if (aQuadril != null) {
      out.push(`\u2022 Angulo tronco-quadril-joelho: ${fmt(aQuadril)} graus.`);
    }

    if (aJoelho != null) {
      out.push(
        `\u2022 Joelho: angulo aproximado de ${fmt(aJoelho)} graus. ` +
        (aJoelho < 168 ? 'Ha flexao perceptivel durante o registro.' : 'Extensao proxima da postura estatica esperada.')
      );
    }

    const alertas = [];
    if (Math.abs(cabeca || 0) >= 18) alertas.push('projecao da cabeca');
    if (Math.abs(inclinacao || 0) >= 7) alertas.push('inclinacao do tronco');
    if (aJoelho != null && aJoelho < 168) alertas.push('flexao do joelho');

    out.push(
      alertas.length
        ? `\u2022 Pontos prioritarios para o professor: ${alertas.join(', ')}.`
        : '\u2022 Nao ha alteracao lateral grosseira nos landmarks mensuraveis desta foto.'
    );

    return out;
  }

  async function analisarFoto(key, mostrarResultado = false) {
    const item = state.fotos.get(key);

    if (!item) {
      if (mostrarResultado) toast('Selecione a foto primeiro.', 'error');
      return null;
    }

    const img = $(`[data-photo-img="${key}"]`);
    const status = $(`[data-photo-status="${key}"]`);

    try {
      status.textContent = 'Analisando...';

      if (!img.complete || !img.naturalWidth) {
        await new Promise((resolve, reject) => {
          img.addEventListener('load', resolve, { once:true });
          img.addEventListener('error', reject, { once:true });
        });
      }

      const pose = await criarPoseLandmarker();
      const result = pose.detect(img);
      const lm = result?.landmarks?.[0];

      if (!lm || lm.length < 29) {
        throw new Error('Corpo nao detectado com confianca. Use foto de corpo inteiro, boa iluminacao e camera nivelada.');
      }

      desenharPontos(key, lm);

      const linhas = (key === 'frente' || key === 'costas')
        ? analisarFrenteCostas(lm, key)
        : analisarLado(lm);

      const vis = lm
        .map(p => Number(p.visibility ?? 0))
        .filter(Number.isFinite);

      const conf = vis.length ? vis.reduce((s,v) => s + v, 0) / vis.length * 100 : 0;

      linhas.push(`\u2022 Confianca media dos pontos: ${fmt(conf,0)}%.`);
      linhas.push('\u2022 Analise fotografica 2D de apoio ao professor; nao substitui avaliacao clinica.');

      const html = linhas.join('<br>');
      state.analises.set(key, html);

      status.textContent = 'Analisada';

      if (mostrarResultado) {
        $('#cfOficialAIBox').innerHTML = html;
      }

      return html;

    } catch (err) {
      console.error('[IA postural]', err);
      status.textContent = 'Falha na IA';

      if (mostrarResultado) {
        $('#cfOficialAIBox').innerHTML =
          `<strong>Erro na IA:</strong> ${txt(err.message || 'Falha na analise.')}`;
      }

      throw err;
    }
  }

  async function analisarTodas() {
    if (state.fotos.size !== 4) {
      toast('Selecione as quatro fotos antes de executar a analise completa.', 'error');
      return;
    }

    const btn = $('#cfOficialGerarIA');
    const old = btn.textContent;

    try {
      btn.disabled = true;
      btn.textContent = 'Analisando...';

      state.analises.clear();

      for (let i = 0; i < POSICOES.length; i++) {
        const [key, nome] = POSICOES[i];
        btn.textContent = `Analisando ${i + 1}/4...`;
        $('#cfOficialAIBox').innerHTML =
          `<strong>IA postural:</strong> analisando ${txt(nome)}...`;

        await analisarFoto(key, false);
      }

      const blocos = POSICOES.map(([key,nome]) => {
        return `<div style="margin-bottom:12px"><strong>${txt(nome)}</strong><br>${state.analises.get(key) || ''}</div>`;
      });

      $('#cfOficialAIBox').innerHTML =
        `<strong>Relatorio postural completo</strong><br><br>${blocos.join('')}`;

      toast('Analise das quatro fotos concluida.');

    } catch (err) {
      $('#cfOficialAIBox').innerHTML =
        `<strong>Erro na IA:</strong> ${txt(err.message || 'Falha ao analisar as fotos.')}`;
      toast(err.message || 'Falha na IA postural.', 'error');

    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  async function comprimir(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();

    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Nao foi possivel processar uma foto.'));
        img.src = url;
      });

      const maxW = 1600;
      const maxH = 2200;
      const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);

      const width = Math.max(1, Math.round(img.naturalWidth * ratio));
      const height = Math.max(1, Math.round(img.naturalHeight * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha:false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0,0,width,height);
      ctx.drawImage(img,0,0,width,height);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          b => b ? resolve(b) : reject(new Error('Falha ao comprimir foto.')),
          'image/jpeg',
          0.86
        );
      });

      return { blob, width, height };

    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function resumoAluno({peso, imc, gordura, massaMagra, perimetria}) {
    const out = [];

    if (peso != null) out.push(`Peso: ${peso.toFixed(1).replace('.', ',')} kg.`);
    if (imc != null) out.push(`IMC: ${imc.toFixed(2).replace('.', ',')} (${classificarImc(imc)}).`);
    if (gordura != null) out.push(`Gordura corporal estimada: ${gordura.toFixed(1).replace('.', ',')}%.`);
    if (massaMagra != null) out.push(`Massa magra estimada: ${massaMagra.toFixed(1).replace('.', ',')} kg.`);
    if (perimetria?.cintura != null) out.push(`Cintura: ${perimetria.cintura} cm.`);

    out.push('Acompanhe a evolucao com o professor nas proximas avaliacoes.');

    return out.join('\n');
  }

  function relatorioIaTexto() {
    if (!state.analises.size) return null;

    return POSICOES
      .map(([key,nome]) => {
        const html = state.analises.get(key);
        if (!html) return null;

        const div = document.createElement('div');
        div.innerHTML = html;

        return `${nome}:\n${div.innerText}`;
      })
      .filter(Boolean)
      .join('\n\n');
  }

  function valorDuplicado(a, b, tolerancia = 0.01) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    const na = Number(a);
    const nb = Number(b);

    if (Number.isFinite(na) && Number.isFinite(nb)) {
      return Math.abs(na - nb) <= tolerancia;
    }

    return String(a).trim() === String(b).trim();
  }

  async function verificarDuplicidadeAvaliacao(client, dados) {
    const q = await client
      .from('avaliacoes_oficiais')
      .select('id,peso,altura,imc,gordura_percentual,massa_magra,soma_dobras,objetivo,created_at')
      .eq('aluno_id', dados.aluno_id)
      .eq('data_avaliacao', dados.data_avaliacao)
      .order('created_at', { ascending:false })
      .limit(10);

    if (q.error) {
      throw new Error('Falha ao verificar duplicidade: ' + q.error.message);
    }

    return (q.data || []).some(a => (
      valorDuplicado(a.peso, dados.peso, 0.05) &&
      valorDuplicado(a.altura, dados.altura, 0.005) &&
      valorDuplicado(a.imc, dados.imc, 0.02) &&
      valorDuplicado(a.gordura_percentual, dados.gordura_percentual, 0.05) &&
      valorDuplicado(a.massa_magra, dados.massa_magra, 0.05) &&
      valorDuplicado(a.soma_dobras, dados.soma_dobras, 0.05) &&
      String(a.objetivo || '').trim() === String(dados.objetivo || '').trim()
    ));
  }

  async function salvar() {
    const btn = $('#cfOficialSalvar');

    if (!btn || btn.dataset.salvando === '1') return;

    if (!state.alunoId) {
      toast('Aluno nao localizado. Feche e abra novamente a avaliacao pelo cadastro do aluno.', 'error');
      return;
    }

    if (state.fotos.size > 0 && state.fotos.size < 4) {
      toast('Para salvar com fotos, selecione as quatro imagens. Para salvar somente os dados, deixe as quatro vazias.', 'error');
      return;
    }

    const old = btn.textContent;
    const enviados = [];
    let avaliacaoId = null;

    try {
      btn.dataset.salvando = '1';
      btn.disabled = true;
      btn.textContent = 'Validando...';

      recalcular();

      const client = sb();

      const { data: auth, error: authError } = await client.auth.getUser();

      if (authError) throw authError;
      if (!auth?.user?.id) throw new Error('Sessao expirada. Entre novamente no painel.');

      const peso = num($('#cfOficialPeso').value);
      const altura = num($('#cfOficialAltura').value);
      const idade = num($('#cfOficialIdade').value);
      const gordura = num($('#cfOficialGordura').value);
      const massaMagra = num($('#cfOficialMassaMagra').value);
      const imc = peso && altura ? peso / (altura * altura) : null;

      const dobras = coletar('[data-dobra]', 'dobra');
      const perimetria = coletar('[data-medida]', 'medida');

      const somaDobras = Object.values(dobras).reduce((s,v) => s + (Number(v) || 0), 0);

      const dadosDuplicidade = {
        aluno_id: state.alunoId,
        data_avaliacao: $('#cfOficialData').value || hoje(),
        peso,
        altura,
        imc: imc != null ? Number(imc.toFixed(2)) : null,
        gordura_percentual: gordura,
        massa_magra: massaMagra,
        soma_dobras: Number(somaDobras.toFixed(2)),
        objetivo: $('#cfOficialObjetivo').value || null
      };

      btn.textContent = 'Verificando duplicidade...';

      const duplicada = await verificarDuplicidadeAvaliacao(client, dadosDuplicidade);

      if (duplicada) {
        btn.textContent = 'Ja salva';
        toast('Esta avaliacao ja foi salva com os mesmos dados nesta data.', 'error');
        return;
      }

      avaliacaoId = crypto.randomUUID();

      if (state.fotos.size === 4) {
        let indice = 0;

        for (const [posicao] of POSICOES) {
          indice++;
          btn.textContent = `Enviando foto ${indice}/4...`;

          const item = state.fotos.get(posicao);
          const img = await comprimir(item.file);
          const path =
            `${state.alunoId}/${avaliacaoId}/${posicao}-${crypto.randomUUID()}.jpg`;

          const upload = await client.storage
            .from(BUCKET)
            .upload(path, img.blob, {
              contentType:'image/jpeg',
              cacheControl:'3600',
              upsert:false
            });

          if (upload.error) {
            throw new Error(`Falha no upload de ${posicao}: ${upload.error.message}`);
          }

          enviados.push({
            posicao,
            path,
            blob:img.blob,
            width:img.width,
            height:img.height
          });
        }
      }

      btn.textContent = 'Salvando avaliacao...';

      const iaProfessor = relatorioIaTexto();

      const payload = {
        id: avaliacaoId,
        aluno_id: state.alunoId,
        professor_id: auth.user.id,
        data_avaliacao: $('#cfOficialData').value || hoje(),
        objetivo: $('#cfOficialObjetivo').value || null,
        observacoes: $('#cfOficialObs').value.trim() || null,
        peso,
        altura,
        idade,
        sexo: $('#cfOficialSexo').value || null,
        imc: imc != null ? Number(imc.toFixed(2)) : null,
        gordura_percentual: gordura,
        massa_magra: massaMagra,
        soma_dobras: Number(somaDobras.toFixed(2)),
        dobras,
        perimetria,
        ia_professor: iaProfessor,
        ia_aluno: resumoAluno({peso,imc,gordura,massaMagra,perimetria}),
        relatorio_professor: $('#cfOficialObs').value.trim() || null,
        liberado_aluno: false,
        liberar_fotos: false,
        liberar_ia: false,
        liberar_pdf: false
      };

      const gravar = await client.from('avaliacoes_oficiais').insert(payload);

      if (gravar.error) {
        throw new Error(`Falha ao salvar avaliacao: ${gravar.error.message}`);
      }

      if (enviados.length === 4) {
        btn.textContent = 'Registrando fotos...';

        const rows = enviados.map(f => ({
          avaliacao_id: avaliacaoId,
          aluno_id: state.alunoId,
          posicao: f.posicao,
          storage_bucket: BUCKET,
          storage_path: f.path,
          mime_type: 'image/jpeg',
          file_size: f.blob.size,
          width: f.width,
          height: f.height,
          released_to_student: false,
          created_by: auth.user.id
        }));

        const meta = await client.from('avaliacao_fotos_oficiais').insert(rows);

        if (meta.error) {
          throw new Error(`A avaliacao foi gravada, mas houve erro ao registrar as fotos: ${meta.error.message}`);
        }
      }

      btn.textContent = 'Salvo \u2713';
      toast('Avaliacao salva com sucesso!');

      await carregarHistorico();
      mudarAba('historico');

      setTimeout(() => {
        fechar();
      }, 1200);

    } catch (err) {
      console.error('[Salvar avaliacao]', err);

      if (enviados.length) {
        try {
          await sb().storage.from(BUCKET).remove(enviados.map(x => x.path));
        } catch (e) {
          console.warn('[Limpeza storage]', e);
        }
      }

      $('#cfOficialAIBox').innerHTML =
        `<strong>Erro ao salvar:</strong> ${txt(err.message || 'Falha ao salvar.')}`;

      toast(err.message || 'Erro ao salvar avaliacao.', 'error');

    } finally {
      setTimeout(() => {
        btn.dataset.salvando = '0';
        btn.disabled = false;

        if (btn.textContent !== 'Salvo \u2713') {
          btn.textContent = old;
        }
      }, 500);
    }
  }

  async function carregarHistorico() {
    if (!state.alunoId) return;

    const box = $('#cfOficialHistory');
    box.innerHTML = '<div style="color:#94a3b8">Carregando...</div>';

    try {
      const client = sb();

      const q = await client
        .from('avaliacoes_oficiais')
        .select('id,data_avaliacao,peso,imc,gordura_percentual,massa_magra,liberado_aluno,liberar_fotos,liberar_ia,created_at')
        .eq('aluno_id', state.alunoId)
        .order('data_avaliacao', { ascending:false })
        .order('created_at', { ascending:false });

      if (q.error) throw q.error;

      state.historico = q.data || [];

      if (!state.historico.length) {
        box.innerHTML = '<div style="color:#94a3b8">Nenhuma avaliacao salva.</div>';
        return;
      }

      const ids = state.historico.map(x => x.id);
      const fotosQ = await client
        .from('avaliacao_fotos_oficiais')
        .select('avaliacao_id')
        .in('avaliacao_id', ids);

      const contagem = {};

      if (!fotosQ.error) {
        (fotosQ.data || []).forEach(f => {
          contagem[f.avaliacao_id] = (contagem[f.avaliacao_id] || 0) + 1;
        });
      }

      box.innerHTML = state.historico.map(a => `
        <div class="cfOficial-history-item">
          <div>
            <strong>${new Date(a.data_avaliacao + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
            <div style="margin-top:5px">
              <span class="cfOficial-pill">Peso: ${a.peso ?? '\u2014'} kg</span>
              <span class="cfOficial-pill">IMC: ${a.imc ?? '\u2014'}</span>
              <span class="cfOficial-pill">Gordura: ${a.gordura_percentual ?? '\u2014'}%</span>
              <span class="cfOficial-pill">Fotos: ${contagem[a.id] || 0}/4</span>
              ${a.liberado_aluno ? '<span class="cfOficial-pill">Liberada</span>' : ''}
            </div>
          </div>
          <small>Massa magra: ${a.massa_magra ?? '\u2014'} kg</small>
        </div>
      `).join('');

    } catch (err) {
      console.error('[Historico]', err);
      box.innerHTML = `<div style="color:#ef4444">${txt(err.message || 'Erro ao carregar historico.')}</div>`;
    }
  }

  async function liberarComparativo() {
    const btn = $('#cfOficialLiberarComparativo');
    const old = btn.textContent;

    try {
      btn.disabled = true;
      btn.textContent = 'Liberando...';

      await carregarHistorico();

      const ultimas = state.historico.slice(0,2);

      if (ultimas.length < 2) {
        throw new Error('Sao necessarias duas avaliacoes para liberar o antes/depois.');
      }

      const ids = ultimas.map(x => x.id);

      const client = sb();

      let r = await client
        .from('avaliacoes_oficiais')
        .update({
          liberado_aluno:false,
          liberar_fotos:false,
          liberar_ia:false,
          liberar_pdf:false
        })
        .eq('aluno_id', state.alunoId);

      if (r.error) throw r.error;

      r = await client
        .from('avaliacao_fotos_oficiais')
        .update({ released_to_student:false })
        .eq('aluno_id', state.alunoId);

      if (r.error) throw r.error;

      const liberarFotos = $('#cfOficialLiberarFotos').checked;
      const liberarIA = $('#cfOficialLiberarIA').checked;
      const liberarPDF = $('#cfOficialLiberarPDF').checked;

      r = await client
        .from('avaliacoes_oficiais')
        .update({
          liberado_aluno:true,
          liberar_fotos:liberarFotos,
          liberar_ia:liberarIA,
          liberar_pdf:liberarPDF
        })
        .in('id', ids);

      if (r.error) throw r.error;

      if (liberarFotos) {
        r = await client
          .from('avaliacao_fotos_oficiais')
          .update({ released_to_student:true })
          .in('avaliacao_id', ids);

        if (r.error) throw r.error;
      }

      toast('Comparativo liberado para o aluno.');
      await carregarHistorico();

    } catch (err) {
      console.error('[Liberar comparativo]', err);
      toast(err.message || 'Erro ao liberar comparativo.', 'error');

    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  function instalarInterceptador() {
    if (window.__CORPO_AVALIACAO_LIMPA__) return true;

    if (typeof window.abrirModalAvaliacaoFisicaCompleta !== 'function') {
      return false;
    }

    window.abrirModalAvaliacaoFisicaCompletaOriginal =
      window.abrirModalAvaliacaoFisicaCompleta;

    window.abrirModalAvaliacaoFisicaCompleta = function(alunoId, alunoNome) {
      return abrir(alunoId, alunoNome);
    };

    window.__CORPO_AVALIACAO_LIMPA__ = true;
    return true;
  }

  function boot() {
    ensureModal();

    instalarInterceptador();

    let tentativas = 0;

    const timer = setInterval(() => {
      tentativas++;

      if (instalarInterceptador() || tentativas >= 80) {
        clearInterval(timer);
      }
    }, 250);

    window.CorpoFitnessAvaliacao = {
      abrir,
      analisarTodas,
      salvar,
      carregarHistorico
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }
})();