(() => {
  'use strict';

  const RELEASE = 'OFICIAL';
  const BUCKET = 'avaliacao-fotos-oficial';
  const POS = [
    ['frente','Frente'],
    ['lado_direito','Lado direito'],
    ['costas','Costas'],
    ['lado_esquerdo','Lado esquerdo']
  ];

  const state = {
    alunoId:null,
    alunoNome:'',
    selected:new Map(),
    urls:new Map(),
    currentTab:'dados',
    lastAvaliacaos:[]
  };

  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => Array.from(r.querySelectorAll(s));
  const n = (v) => {
    const x = Number(String(v ?? '').replace(',','.'));
    return Number.isFinite(x) ? x : null;
  };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const today = () => new Date().toISOString().slice(0,10);

  function toast(msg,type='') {
    if (window.showToast) return window.showToast(msg,type);
    if (type === 'error') alert(msg);
    else console.log('[Corpofitness]', msg);
  }

  function supa() {
    if (!window._supabase) throw new Error('Supabase nÃ£o carregado no painel.');
    return window._supabase;
  }

  function modalHTML() {
    return `
      <div id="modalAvaliacaoOficial" aria-hidden="true">
        <div class="cfOficial-modal">
          <div class="cfOficial-header">
            <div class="cfOficial-title">
              <h2>AvaliaÃ§Ã£o FÃ­sica</h2>
              <p id="cfOficialAlunoNome">Aluno(a)</p>
            </div>
            <button type="button" class="cfOficial-close" id="cfOficialClose">âœ•</button>
          </div>

          <div class="cfOficial-body">
            <div class="cfOficial-tabs">
              <button type="button" class="cfOficial-tab active" data-tab="dados">Dados</button>
              <button type="button" class="cfOficial-tab" data-tab="medidas">Medidas</button>
              <button type="button" class="cfOficial-tab" data-tab="dobras">Dobras</button>
              <button type="button" class="cfOficial-tab" data-tab="fotos">Fotos + IA</button>
              <button type="button" class="cfOficial-tab" data-tab="historico">HistÃ³rico</button>
            </div>

            <section class="cfOficial-panel active" data-panel="dados">
              <div class="cfOficial-card">
                <h3>Dados gerais</h3>
                <div class="cfOficial-grid">
                  <div class="cfOficial-field"><label>Data</label><input type="date" id="cfOficialData"></div>
                  <div class="cfOficial-field"><label>Objetivo</label><select id="cfOficialObjetivo"><option value="">Selecione</option><option>Emagrecimento</option><option>Hipertrofia</option><option>Condicionamento</option><option>SaÃºde e qualidade de vida</option><option>ReabilitaÃ§Ã£o / retorno</option></select></div>
                  <div class="cfOficial-field"><label>Sexo cÃ¡lculo</label><select id="cfOficialSexo"><option value="">Selecione</option><option value="M">Masculino</option><option value="F">Feminino</option><option value="Outro">Outro</option></select></div>
                  <div class="cfOficial-field"><label>Idade</label><input type="number" id="cfOficialIdade" min="1" max="120"></div>
                </div>
                <div class="cfOficial-grid" style="margin-top:12px">
                  <div class="cfOficial-field"><label>Peso kg</label><input type="number" step="0.1" id="cfOficialPeso"></div>
                  <div class="cfOficial-field"><label>Altura m</label><input type="number" step="0.01" id="cfOficialAltura"></div>
                  <div class="cfOficial-field"><label>% gordura automÃ¡tico</label><input type="number" step="0.1" id="cfOficialGordura" readonly placeholder="Dobras + idade + sexo"></div>
                  <div class="cfOficial-field"><label>Massa magra kg</label><input type="number" step="0.1" id="cfOficialMassaMagra" readonly placeholder="AutomÃ¡tico"></div>
                </div>
                <div class="cfOficial-kpis">
                  <div class="cfOficial-kpi"><small>IMC</small><strong id="cfOficialIMC">0,00</strong></div>
                  <div class="cfOficial-kpi"><small>ClassificaÃ§Ã£o</small><strong id="cfOficialIMCClass">â€”</strong></div>
                  <div class="cfOficial-kpi"><small>Soma dobras</small><strong id="cfOficialSomaDobras">0</strong></div>
                  <div class="cfOficial-kpi"><small>Status fotos</small><strong id="cfOficialStatusFotos">0/4</strong></div>
                </div>
              </div>

              <div class="cfOficial-card">
                <h3>ObservaÃ§Ãµes do professor</h3>
                <div class="cfOficial-field"><label>RelatÃ³rio/observaÃ§Ãµes</label><textarea id="cfOficialObs" placeholder="AnotaÃ§Ãµes tÃ©cnicas, objetivo da fase, restriÃ§Ãµes, recomendaÃ§Ãµes..."></textarea></div>
              </div>
            </section>

            <section class="cfOficial-panel" data-panel="medidas">
              <div class="cfOficial-card">
                <h3>Perimetria / medidas corporais</h3>
                <div class="cfOficial-grid">
                  ${['ombro','torax','cintura','abdomen','quadril','braco_direito','braco_esquerdo','antebraco_direito','antebraco_esquerdo','coxa_direita','coxa_esquerda','panturrilha_direita','panturrilha_esquerda'].map(k=>`
                    <div class="cfOficial-field"><label>${esc(label(k))} (cm)</label><input type="number" step="0.1" data-medida="${esc(k)}"></div>
                  `).join('')}
                </div>
              </div>
            </section>

            <section class="cfOficial-panel" data-panel="dobras">
              <div class="cfOficial-card">
                <h3>Dobras cutÃ¢neas</h3>
                <div class="cfOficial-grid">
                  ${['subescapular','tricipital','bicipital','peitoral','axilar_media','supra_iliaca','abdominal','coxa','panturrilha'].map(k=>`
                    <div class="cfOficial-field"><label>${esc(label(k))} (mm)</label><input type="number" step="0.1" data-dobra="${esc(k)}"></div>
                  `).join('')}
                </div>
              </div>
            </section>

            <section class="cfOficial-panel" data-panel="fotos">
              <div class="cfOficial-card">
                <h3>Fotos da avaliaÃ§Ã£o</h3>
                <div class="cfOficial-photo-grid">
                  ${POS.map(([key,name])=>`
                    <div class="cfOficial-photo" data-photo-box="${key}">
                      <img data-photo-img="${key}" alt="${esc(name)}">
                      <canvas data-photo-canvas="${key}"></canvas>
                      <div class="cfOficial-empty"><div><i class="fa-solid fa-camera"></i><strong>${esc(name)}</strong><span>Selecione a foto</span></div></div>
                      <div class="cfOficial-photo-actions">
                        <button type="button" data-pick-photo="${key}">Foto</button>
                        <button type="button" data-ai-photo="${key}">IA</button>
                      </div>
                      <div class="cfOficial-photo-label"><strong>${esc(name)}</strong><small data-photo-status="${key}">Pendente</small></div>
                      <input hidden type="file" accept="image/jpeg,image/png,image/webp" data-photo-file="${key}">
                    </div>
                  `).join('')}
                </div>
                <div class="cfOficial-ai-box" id="cfOficialAIBox"><strong>IA visual:</strong> selecione uma foto e clique em IA. A anÃ¡lise Ã© orientativa para o professor.</div>
              </div>
            </section>

            <section class="cfOficial-panel" data-panel="historico">
              <div class="cfOficial-card">
                <h3>HistÃ³rico</h3>
                <div class="cfOficial-release">
                  <label class="cfOficial-switch"><input type="checkbox" id="cfOficialLiberarFotos" checked> Liberar fotos</label>
                  <label class="cfOficial-switch"><input type="checkbox" id="cfOficialLiberarIA" checked> Liberar IA</label>
                  <label class="cfOficial-switch"><input type="checkbox" id="cfOficialLiberarPDF"> Liberar PDF</label>
                  <button type="button" class="cfOficial-btn success" id="cfOficialLiberarComparativo">Liberar antes/depois ao aluno</button>
                </div>
              </div>
              <div class="cfOficial-card">
                <h3>AvaliaÃ§Ãµes salvas</h3>
                <div class="cfOficial-history" id="cfOficialHistory"><div style="color:#94a3b8">Carregando...</div></div>
              </div>
            </section>
          </div>

          <div class="cfOficial-actions">
            <button type="button" class="cfOficial-btn warn" id="cfOficialFechar2">Cancelar</button>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button type="button" class="cfOficial-btn" id="cfOficialGerarIA">Gerar relatÃ³rio IA</button>
              <button type="button" class="cfOficial-btn primary" id="cfOficialSalvar">Salvar avaliaÃ§Ã£o</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function label(k){
    const map = {
      ombro:'Ombro',torax:'TÃ³rax',cintura:'Cintura',abdomen:'AbdÃ´men',quadril:'Quadril',
      braco_direito:'BraÃ§o direito',braco_esquerdo:'BraÃ§o esquerdo',antebraco_direito:'AntebraÃ§o direito',
      antebraco_esquerdo:'AntebraÃ§o esquerdo',coxa_direita:'Coxa direita',coxa_esquerda:'Coxa esquerda',
      panturrilha_direita:'Panturrilha direita',panturrilha_esquerda:'Panturrilha esquerda',
      subescapular:'Subescapular',tricipital:'Tricipital',bicipital:'Bicipital',peitoral:'Peitoral',
      axilar_media:'Axilar mÃ©dia',supra_iliaca:'Supra-ilÃ­aca',abdominal:'Abdominal',coxa:'Coxa',panturrilha:'Panturrilha'
    };
    return map[k] || k;
  }

  function ensureModal() {
    if ($('#modalAvaliacaoOficial')) return;
    document.body.insertAdjacentHTML('beforeend', modalHTML());

    $('#cfOficialClose').addEventListener('click', close);
    $('#cfOficialFechar2').addEventListener('click', close);
    $('#modalAvaliacaoOficial').addEventListener('click', e => { if(e.target.id === 'modalAvaliacaoOficial') close(); });

    $$('.cfOficial-tab').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));

    ['cfOficialPeso','cfOficialAltura','cfOficialIdade','cfOficialSexo'].forEach(id => $('#' + id)?.addEventListener('input', recalc));
    $('#cfOficialSexo')?.addEventListener('change', recalc);
    $$('[data-dobra]').forEach(input => input.addEventListener('input', recalc));

    POS.forEach(([key]) => {
      const input = $(`[data-photo-file="${key}"]`);
      const box = $(`[data-photo-box="${key}"]`);

      box?.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        input.click();
      });

      box?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        input.click();
      });

      if (box) {
        box.tabIndex = 0;
        box.setAttribute('role', 'button');
        box.setAttribute('aria-label', `Selecionar foto - ${labelPos(key)}`);
      }

      $(`[data-pick-photo="${key}"]`).addEventListener('click', () => input.click());
      input.addEventListener('change', () => selectPhoto(key, input.files?.[0] || null));
      $(`[data-ai-photo="${key}"]`).addEventListener('click', () => analyzePhoto(key));
    });

    $('#cfOficialSalvar').addEventListener('click', saveAvaliacao);
    $('#cfOficialGerarIA').addEventListener('click', generateAI);
    $('#cfOficialLiberarComparativo').addEventListener('click', releaseComparison);
  }

  function setTab(tab){
    state.currentTab = tab;
    $$('.cfOficial-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $$('.cfOficial-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
  }

  function close(){
    $('#modalAvaliacaoOficial')?.classList.remove('active');
  }

  async function open(alunoId, alunoNome) {
    ensureModal();
    clearForm();
    state.alunoId = alunoId;
    state.alunoNome = typeof alunoNome === 'string' ? alunoNome : 'Aluno(a)';
    $('#cfOficialAlunoNome').textContent = `Aluno(a): ${state.alunoNome}`;
    $('#cfOficialData').value = today();
    $('#modalAvaliacaoOficial').classList.add('active');
    setTab('dados');
    await loadHistory();
  }

  function clearForm(){
    state.selected.forEach(x => URL.revokeObjectURL(x.url));
    state.selected.clear();
    state.urls.clear();

    ['cfOficialData','cfOficialObjetivo','cfOficialSexo','cfOficialIdade','cfOficialPeso','cfOficialAltura','cfOficialGordura','cfOficialMassaMagra','cfOficialObs'].forEach(id => {
      const el = $('#' + id);
      if (el) el.value = '';
    });

    $$('[data-medida], [data-dobra]').forEach(i => i.value = '');
    POS.forEach(([key]) => {
      const box = $(`[data-photo-box="${key}"]`);
      const img = $(`[data-photo-img="${key}"]`);
      const st = $(`[data-photo-status="${key}"]`);
      const file = $(`[data-photo-file="${key}"]`);
      box?.classList.remove('has-img');
      img?.removeAttribute('src');
      if(st) st.textContent = 'Pendente';
      if(file) file.value = '';
      const canvas = $(`[data-photo-canvas="${key}"]`);
      if(canvas) canvas.getContext('2d')?.clearRect(0,0,canvas.width,canvas.height);
    });
    $('#cfOficialAIBox') && ($('#cfOficialAIBox').innerHTML = '<strong>IA visual:</strong> selecione uma foto e clique em IA. A anÃ¡lise Ã© orientativa para o professor.');
    recalc();
  }

  function collectObj(selector){
    const o = {};
    $$(selector).forEach(i => o[i.dataset.medida || i.dataset.dobra] = n(i.value));
    return o;
  }

  function recalc(){
    const peso = n($('#cfOficialPeso')?.value);
    const altura = n($('#cfOficialAltura')?.value);
    const idade = n($('#cfOficialIdade')?.value);
    const sexo = $('#cfOficialSexo')?.value || '';
    const dobras = collectObj('[data-dobra]');
    let imc = null;

    if(peso && altura) imc = peso/(altura*altura);

    const soma = Object.values(dobras).reduce((s,v) => s + (Number(v) || 0), 0);
    const gorduraAuto = calcularGorduraAutomatica(sexo, idade, dobras);

    $('#cfOficialIMC').textContent = imc ? imc.toFixed(2).replace('.', ',') : '0,00';
    $('#cfOficialIMCClass').textContent = classIMC(imc);
    $('#cfOficialSomaDobras').textContent = soma.toFixed(1).replace('.', ',');
    $('#cfOficialStatusFotos').textContent = `${state.selected.size}/4`;

    const gorduraEl = $('#cfOficialGordura');
    const massaEl = $('#cfOficialMassaMagra');

    if(gorduraEl) gorduraEl.value = gorduraAuto ? gorduraAuto.toFixed(1) : '';
    if(massaEl) massaEl.value = (peso && gorduraAuto) ? (peso * (1 - gorduraAuto / 100)).toFixed(1) : '';
  }

  function calcularGorduraAutomatica(sexo, idade, dobras){
    const campos = ['peitoral','axilar_media','tricipital','subescapular','abdominal','supra_iliaca','coxa'];
    const valores = campos.map(k => Number(dobras[k]));
    if(!idade || !['M','F'].includes(sexo) || valores.some(v => !Number.isFinite(v) || v <= 0)) return null;

    const soma7 = valores.reduce((s,v) => s + v, 0);
    const densidade = sexo === 'M'
      ? 1.112 - (0.00043499 * soma7) + (0.00000055 * soma7 * soma7) - (0.00028826 * idade)
      : 1.097 - (0.00046971 * soma7) + (0.00000056 * soma7 * soma7) - (0.00012828 * idade);

    if(!Number.isFinite(densidade) || densidade <= 0) return null;
    const percentual = (495 / densidade) - 450;
    if(!Number.isFinite(percentual) || percentual < 2 || percentual > 70) return null;
    return percentual;
  }

  function classIMC(imc){
    if(!imc) return 'â€”';
    if(imc < 18.5) return 'Baixo';
    if(imc < 25) return 'Normal';
    if(imc < 30) return 'Sobrepeso';
    if(imc < 35) return 'Obesidade I';
    if(imc < 40) return 'Obesidade II';
    return 'Obesidade III';
  }

  async function selectPhoto(key,file){
    if(!file) return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)) return toast('Use JPG, PNG ou WEBP.','error');
    if(file.size > 12*1024*1024) return toast('A foto deve ter no mÃ¡ximo 12 MB.','error');

    const old = state.selected.get(key);
    if(old?.url) URL.revokeObjectURL(old.url);

    const url = URL.createObjectURL(file);
    state.selected.set(key,{file,url});
    const img = $(`[data-photo-img="${key}"]`);
    img.src = url;
    $(`[data-photo-box="${key}"]`)?.classList.add('has-img');
    $(`[data-photo-status="${key}"]`).textContent = 'Selecionada';
    recalc();
  }

  let poseLandmarkerPromise = null;

  async function getPoseLandmarker(){
    if(poseLandmarkerPromise) return poseLandmarkerPromise;

    poseLandmarkerPromise = (async () => {
      const visionModule = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/+esm");
      const { FilesetResolver, PoseLandmarker } = visionModule;

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
      );

      return await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
          delegate: "GPU"
        },
        runningMode: "IMAGE",
        numPoses: 1,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
        outputSegmentationMasks: false
      });
    })().catch(err => {
      poseLandmarkerPromise = null;
      throw err;
    });

    return poseLandmarkerPromise;
  }

  function landmarkPoint(lm, index, minVisibility = 0.35){
    const p = lm?.[index];
    if(!p) return null;
    const visibility = Number(p.visibility ?? p.presence ?? 1);
    if(Number.isFinite(visibility) && visibility < minVisibility) return null;
    return p;
  }

  function midpoint(a,b){
    if(!a || !b) return null;
    return {
      x:(a.x+b.x)/2,
      y:(a.y+b.y)/2,
      z:((a.z||0)+(b.z||0))/2,
      visibility:Math.min(Number(a.visibility ?? 1),Number(b.visibility ?? 1))
    };
  }

  function dist(a,b){
    if(!a || !b) return null;
    return Math.hypot((a.x-b.x),(a.y-b.y));
  }

  function angleHorizontal(a,b){
    if(!a || !b) return null;
    return Math.atan2((b.y-a.y),(b.x-a.x))*180/Math.PI;
  }

  function angleVertical(a,b){
    if(!a || !b) return null;
    return Math.atan2((b.x-a.x),(b.y-a.y))*180/Math.PI;
  }

  function jointAngle(a,b,c){
    if(!a || !b || !c) return null;
    const ab={x:a.x-b.x,y:a.y-b.y};
    const cb={x:c.x-b.x,y:c.y-b.y};
    const dot=ab.x*cb.x+ab.y*cb.y;
    const den=Math.hypot(ab.x,ab.y)*Math.hypot(cb.x,cb.y);
    if(!den) return null;
    const v=Math.max(-1,Math.min(1,dot/den));
    return Math.acos(v)*180/Math.PI;
  }

  function signedPct(value, scale){
    if(value == null || !scale) return null;
    return (value/scale)*100;
  }

  function fmt(v,d=1){
    return Number.isFinite(v) ? v.toFixed(d).replace('.',',') : 'â€”';
  }

  function absStatus(value, mild, moderate){
    if(value == null) return 'indeterminado';
    const a=Math.abs(value);
    if(a < mild) return 'sem assimetria relevante nesta foto';
    if(a < moderate) return 'assimetria discreta';
    return 'assimetria perceptÃ­vel';
  }

  function visibleSide(lm){
    const left=[7,11,13,15,23,25,27].reduce((s,i)=>s+Number(lm?.[i]?.visibility||0),0);
    const right=[8,12,14,16,24,26,28].reduce((s,i)=>s+Number(lm?.[i]?.visibility||0),0);
    return left >= right ? 'left' : 'right';
  }

  function mapLandmarkToCanvas(img, canvas, p){
    if(!p) return null;

    const sourceW = img.naturalWidth || 1;
    const sourceH = img.naturalHeight || 1;
    const targetW = canvas.width;
    const targetH = canvas.height;

    const scale = Math.max(targetW / sourceW, targetH / sourceH);
    const renderedW = sourceW * scale;
    const renderedH = sourceH * scale;
    const offsetX = (targetW - renderedW) / 2;
    const offsetY = (targetH - renderedH) / 2;

    return {
      x: offsetX + (p.x * sourceW * scale),
      y: offsetY + (p.y * sourceH * scale)
    };
  }

  function drawLandmarkCanvas(key,lm){
    const img = $(`[data-photo-img="${key}"]`);
    const canvas = $(`[data-photo-canvas="${key}"]`);
    if(!img || !canvas || !lm) return;

    const box = img.getBoundingClientRect();
    const width = Math.max(320, Math.round(box.width || 360));
    const height = Math.max(420, Math.round(box.height || 480));

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,width,height);

    const pairs = [
      [11,12],[11,13],[13,15],[12,14],[14,16],
      [11,23],[12,24],[23,24],[23,25],[25,27],
      [24,26],[26,28],[27,31],[28,32]
    ];

    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(96,165,250,.82)';

    pairs.forEach(([a,b])=>{
      const p1 = landmarkPoint(lm,a);
      const p2 = landmarkPoint(lm,b);
      if(!p1 || !p2) return;

      const d1 = mapLandmarkToCanvas(img,canvas,p1);
      const d2 = mapLandmarkToCanvas(img,canvas,p2);
      if(!d1 || !d2) return;

      ctx.beginPath();
      ctx.moveTo(d1.x,d1.y);
      ctx.lineTo(d2.x,d2.y);
      ctx.stroke();
    });

    const pontos = [
      [0,'CabeÃ§a'],[11,'Ombro E'],[12,'Ombro D'],
      [23,'Quadril E'],[24,'Quadril D'],
      [25,'Joelho E'],[26,'Joelho D'],
      [27,'Tornozelo E'],[28,'Tornozelo D']
    ];

    pontos.forEach(([idx,label])=>{
      const p = landmarkPoint(lm,idx);
      if(!p) return;

      const d = mapLandmarkToCanvas(img,canvas,p);
      if(!d) return;

      ctx.beginPath();
      ctx.arc(d.x,d.y,5.5,0,Math.PI*2);
      ctx.fillStyle='rgba(37,99,235,.98)';
      ctx.fill();
      ctx.lineWidth=2;
      ctx.strokeStyle='#dbeafe';
      ctx.stroke();
    });

    const ombros = midpoint(landmarkPoint(lm,11),landmarkPoint(lm,12));
    const quadril = midpoint(landmarkPoint(lm,23),landmarkPoint(lm,24));
    const tronco = midpoint(ombros,quadril);

    [
      [ombros,'Ombros'],
      [tronco,'Tronco'],
      [quadril,'Quadril']
    ].forEach(([p,label])=>{
      if(!p) return;
      const d=mapLandmarkToCanvas(img,canvas,p);
      if(!d) return;

      ctx.beginPath();
      ctx.arc(d.x,d.y,9,0,Math.PI*2);
      ctx.fillStyle='rgba(15,23,42,.92)';
      ctx.fill();
      ctx.lineWidth=2.5;
      ctx.strokeStyle='#60a5fa';
      ctx.stroke();

      ctx.font='700 12px Arial';
      const tw=ctx.measureText(label).width+14;
      const lx=Math.max(4,Math.min(width-tw-4,d.x-tw/2));
      const ly=Math.max(4,d.y-31);

      ctx.fillStyle='rgba(15,23,42,.95)';
      ctx.fillRect(lx,ly,tw,21);
      ctx.fillStyle='#fff';
      ctx.fillText(label,lx+7,ly+15);
    });
  }

  function analyzeFrontBack(lm,key){
    const ls=landmarkPoint(lm,11), rs=landmarkPoint(lm,12);
    const lh=landmarkPoint(lm,23), rh=landmarkPoint(lm,24);
    const lk=landmarkPoint(lm,25), rk=landmarkPoint(lm,26);
    const la=landmarkPoint(lm,27), ra=landmarkPoint(lm,28);

    const shoulderWidth=dist(ls,rs);
    const hipWidth=dist(lh,rh);
    const bodyScale=(shoulderWidth||hipWidth||0.2);

    const shoulderTilt=angleHorizontal(ls,rs);
    const hipTilt=angleHorizontal(lh,rh);

    const shoulderMid=midpoint(ls,rs);
    const hipMid=midpoint(lh,rh);
    const trunkShift=signedPct(shoulderMid && hipMid ? shoulderMid.x-hipMid.x : null, bodyScale);
    const kneeDiff=signedPct(lk && rk ? lk.y-rk.y : null, bodyScale);
    const ankleDiff=signedPct(la && ra ? la.y-ra.y : null, bodyScale);

    const lines=[];
    lines.push(`<strong>AnÃ¡lise postural da ${key==='costas'?'vista posterior':'vista frontal'}:</strong>`);

    if(shoulderTilt!=null){
      const lado = shoulderTilt > 0 ? 'direito visualmente mais baixo' : 'esquerdo visualmente mais baixo';
      lines.push(`â€¢ Ombros: diferenÃ§a angular de ${fmt(Math.abs(shoulderTilt))}Â°. ${Math.abs(shoulderTilt)<2 ? 'Alinhamento prÃ³ximo do horizontal.' : `HÃ¡ inclinaÃ§Ã£o aparente, com o lado ${lado}.`}`);
    }

    if(hipTilt!=null){
      const lado = hipTilt > 0 ? 'direito visualmente mais baixo' : 'esquerdo visualmente mais baixo';
      lines.push(`â€¢ Pelve/quadril: diferenÃ§a angular de ${fmt(Math.abs(hipTilt))}Â°. ${Math.abs(hipTilt)<2 ? 'Nivelamento visual preservado nesta foto.' : `Existe inclinaÃ§Ã£o aparente, com o lado ${lado}.`}`);
    }

    if(trunkShift!=null){
      const dir = trunkShift > 0 ? 'direita' : 'esquerda';
      lines.push(`â€¢ Tronco: deslocamento de ${fmt(Math.abs(trunkShift))}% da largura corporal para a ${dir} em relaÃ§Ã£o ao centro do quadril.`);
    }

    if(kneeDiff!=null){
      lines.push(`â€¢ Joelhos: diferenÃ§a vertical aproximada de ${fmt(Math.abs(kneeDiff))}% da largura corporal.`);
    }

    if(ankleDiff!=null){
      lines.push(`â€¢ Tornozelos/apoio: diferenÃ§a vertical aproximada de ${fmt(Math.abs(ankleDiff))}% da largura corporal.`);
    }

    const prioridade=[];
    if(Math.abs(shoulderTilt||0)>=4.5) prioridade.push('assimetria de ombros');
    if(Math.abs(hipTilt||0)>=4.5) prioridade.push('inclinaÃ§Ã£o pÃ©lvica');
    if(Math.abs(trunkShift||0)>=7) prioridade.push('deslocamento lateral do tronco');
    if(Math.abs(kneeDiff||0)>=8) prioridade.push('diferenÃ§a no alinhamento dos joelhos');

    lines.push(prioridade.length
      ? `â€¢ ConclusÃ£o objetiva: revisar ${prioridade.join(', ')}. Recomenda-se repetir a foto com pÃ©s paralelos e cÃ¢mera nivelada para confirmar persistÃªncia.`
      : `â€¢ ConclusÃ£o objetiva: os principais eixos 2D estÃ£o prÃ³ximos da simetria nesta imagem; manter comparaÃ§Ã£o com avaliaÃ§Ãµes futuras.`);

    if(key==='costas'){
      lines.push('â€¢ ObservaÃ§Ã£o: escÃ¡pulas e curvaturas da coluna exigem avaliaÃ§Ã£o presencial; o modelo nÃ£o deve inferir diagnÃ³stico a partir de uma foto.');
    }

    return lines;
  }

  function analyzeSide(lm,key){
    const side=visibleSide(lm);
    const idx = side==='left'
      ? {ear:7,shoulder:11,hip:23,knee:25,ankle:27}
      : {ear:8,shoulder:12,hip:24,knee:26,ankle:28};

    const ear=landmarkPoint(lm,idx.ear);
    const shoulder=landmarkPoint(lm,idx.shoulder);
    const hip=landmarkPoint(lm,idx.hip);
    const knee=landmarkPoint(lm,idx.knee);
    const ankle=landmarkPoint(lm,idx.ankle);

    const torso=dist(shoulder,hip) || 0.2;
    const headForward=signedPct(ear && shoulder ? ear.x-shoulder.x : null, torso);
    const trunkLean=angleVertical(shoulder,hip);
    const hipKneeAngle=jointAngle(shoulder,hip,knee);
    const kneeAngle=jointAngle(hip,knee,ankle);

    const lines=[];
    lines.push(`<strong>AnÃ¡lise postural lateral:</strong>`);
    lines.push(`â€¢ Lado utilizado pelo modelo: ${side==='left'?'esquerdo':'direito'}, por apresentar maior confianÃ§a de detecÃ§Ã£o.`);

    if(headForward!=null){
      const direcao=headForward>0?'Ã  direita da imagem':'Ã  esquerda da imagem';
      lines.push(`â€¢ CabeÃ§a/ombro: projeÃ§Ã£o horizontal equivalente a ${fmt(Math.abs(headForward))}% do comprimento do tronco ${direcao}. Valores maiores sugerem revisar posicionamento da cabeÃ§a e da cintura escapular.`);
    }

    if(trunkLean!=null){
      lines.push(`â€¢ Tronco: inclinaÃ§Ã£o aparente de ${fmt(Math.abs(trunkLean))}Â° em relaÃ§Ã£o Ã  vertical.`);
    }

    if(hipKneeAngle!=null){
      lines.push(`â€¢ Quadril: Ã¢ngulo troncoâ€“quadrilâ€“joelho de ${fmt(hipKneeAngle)}Â°.`);
    }

    if(kneeAngle!=null){
      lines.push(`â€¢ Joelho: Ã¢ngulo aproximado de ${fmt(kneeAngle)}Â°. ${kneeAngle<168?'HÃ¡ flexÃ£o perceptÃ­vel durante o registro, o que pode alterar a leitura postural.':'ExtensÃ£o prÃ³xima do esperado para fotografia estÃ¡tica.'}`);
    }

    const prioridade=[];
    if(Math.abs(headForward||0)>=18) prioridade.push('projeÃ§Ã£o da cabeÃ§a em relaÃ§Ã£o ao ombro');
    if(Math.abs(trunkLean||0)>=7) prioridade.push('inclinaÃ§Ã£o do tronco');
    if(kneeAngle!=null && kneeAngle<168) prioridade.push('posiÃ§Ã£o do joelho');

    lines.push(prioridade.length
      ? `â€¢ ConclusÃ£o objetiva: revisar ${prioridade.join(', ')} e repetir a foto em postura neutra para comparaÃ§Ã£o.`
      : `â€¢ ConclusÃ£o objetiva: nÃ£o hÃ¡ alteraÃ§Ã£o lateral grosseira nos landmarks mensurÃ¡veis desta foto.`);

    return lines;
  }

  async function analyzePhoto(key){
    if(!state.selected.has(key)) return toast('Selecione a foto primeiro.','error');

    const img = $(`[data-photo-img="${key}"]`);
    if(!img?.src) return toast('Foto nÃ£o carregada.','error');

    const box = $('#cfOficialAIBox');
    const original = box?.innerHTML || '';

    try{
      if(box) box.innerHTML = '<strong>IA postural:</strong> carregando modelo e detectando pontos anatÃ´micos...';

      if(!img.complete) await new Promise((resolve,reject)=>{
        img.addEventListener('load',resolve,{once:true});
        img.addEventListener('error',reject,{once:true});
      });

      const landmarker = await getPoseLandmarker();
      const result = landmarker.detect(img);
      const lm = result?.landmarks?.[0];

      if(!lm || lm.length < 29){
        throw new Error('NÃ£o foi possÃ­vel detectar o corpo com confianÃ§a suficiente. Use foto de corpo inteiro, boa iluminaÃ§Ã£o e cÃ¢mera nivelada.');
      }

      drawLandmarkCanvas(key,lm);

      const lines = (key==='frente' || key==='costas')
        ? analyzeFrontBack(lm,key)
        : analyzeSide(lm,key);

      const vis = lm
        .map(p=>Number(p.visibility ?? 0))
        .filter(Number.isFinite);
      const confidence = vis.length ? (vis.reduce((s,v)=>s+v,0)/vis.length)*100 : 0;

      lines.push(`â€¢ ConfianÃ§a mÃ©dia dos landmarks: ${fmt(confidence,0)}%.`);
      lines.push(`â€¢ ConclusÃ£o: anÃ¡lise fotogrÃ¡fica 2D de apoio profissional; nÃ£o substitui avaliaÃ§Ã£o clÃ­nica, ortopÃ©dica ou fisioterapÃªutica.`);

      if(box) box.innerHTML = lines.join('<br>');
    }catch(err){
      console.error('[IA postural]',err);
      if(box) box.innerHTML = original;
      toast(err.message || 'Falha na anÃ¡lise postural.','error');
    }
  }

  function labelPos(k){
    return (POS.find(p=>p[0]===k)||[])[1] || k;
  }

  function generateAI(){
    const peso = n($('#cfOficialPeso')?.value);
    const imc = peso && n($('#cfOficialAltura')?.value) ? peso/(n($('#cfOficialAltura').value)**2) : null;
    const gordura = n($('#cfOficialGordura')?.value);
    const per = collectObj('[data-medida]');
    const notes = [];

    if(imc) notes.push(`IMC atual: ${imc.toFixed(2).replace('.', ',')} (${classIMC(imc)}).`);
    if(gordura) notes.push(`Percentual de gordura informado/estimado: ${gordura.toFixed(1).replace('.', ',')}%.`);
    if(per.cintura && per.quadril) notes.push(`RelaÃ§Ã£o cintura/quadril aproximada: ${(per.cintura/per.quadril).toFixed(2).replace('.', ',')}.`);
    if(state.selected.size) notes.push(`${state.selected.size}/4 fotos anexadas para registro visual.`);
    notes.push('SugestÃ£o: comparar nova avaliaÃ§Ã£o com a anterior antes de liberar o relatÃ³rio ao aluno.');

    $('#cfOficialAIBox').innerHTML = `<strong>RelatÃ³rio IA simples:</strong><br>${notes.map(x=>'â€¢ '+esc(x)).join('<br>')}`;
    setTab('fotos');
  }

  async function compressImage(file){
    const img = new Image();
    const url = URL.createObjectURL(file);
    try{
      await new Promise((resolve,reject)=>{ img.onload=resolve; img.onerror=reject; img.src=url; });
      const maxW=1600, maxH=2200;
      const ratio = Math.min(maxW/img.naturalWidth, maxH/img.naturalHeight, 1);
      const w = Math.round(img.naturalWidth*ratio);
      const h = Math.round(img.naturalHeight*ratio);
      const canvas = document.createElement('canvas');
      canvas.width=w; canvas.height=h;
      const ctx = canvas.getContext('2d',{alpha:false});
      ctx.fillStyle='#000'; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0,w,h);
      const blob = await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha ao processar foto.')),'image/jpeg',.84));
      return {blob,width:w,height:h};
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function saveAvaliacao(){
    if(!state.alunoId) return toast('Aluno nÃ£o localizado. Feche a avaliaÃ§Ã£o e abra novamente pelo cadastro do aluno.','error');

    const btn = $('#cfOficialSalvar');
    if(!btn || btn.dataset.salvando === '1') return;

    const fotos = POS
      .map(([pos]) => ({ pos, file:$(`[data-photo-file="${pos}"]`)?.files?.[0] || null }))
      .filter(item => item.file);

    if(fotos.length > 0 && fotos.length < 4){
      return toast('Para salvar fotos, selecione as quatro posiÃ§Ãµes. Se desejar salvar apenas os dados, deixe as quatro fotos vazias.','error');
    }

    const textoOriginal = btn.textContent || 'Salvar avaliaÃ§Ã£o';
    const enviados = [];
    let avaliacaoId = null;

    try{
      btn.dataset.salvando='1';
      btn.disabled=true;
      btn.textContent='Validando...';

      recalc();

      const client=supa();
      const {data:auth,error:authError}=await client.auth.getUser();
      if(authError) throw authError;
      if(!auth?.user?.id) throw new Error('SessÃ£o expirada. Entre novamente no painel.');

      const peso=n($('#cfOficialPeso')?.value);
      const altura=n($('#cfOficialAltura')?.value);
      const idade=n($('#cfOficialIdade')?.value);
      const gordura=n($('#cfOficialGordura')?.value);
      const massaMagra=n($('#cfOficialMassaMagra')?.value);
      const imc=peso && altura ? peso/(altura*altura) : null;
      const dobras=collectObj('[data-dobra]');
      const perimetria=collectObj('[data-medida]');
      const somaDobras=Object.values(dobras).reduce((s,v)=>s+(Number(v)||0),0);
      const iaText=($('#cfOficialAIBox')?.innerText||'').trim();

      if(!$('#cfOficialData')?.value) $('#cfOficialData').value=today();

      avaliacaoId=crypto.randomUUID();

      if(fotos.length===4){
        let indice=0;
        for(const item of fotos){
          indice++;
          btn.textContent=`Enviando foto ${indice}/4...`;
          const processed=await compressImage(item.file);
          const path=`${state.alunoId}/${avaliacaoId}/${item.pos}-${crypto.randomUUID()}.jpg`;

          const up=await client.storage.from(BUCKET).upload(path,processed.blob,{
            contentType:'image/jpeg',
            cacheControl:'3600',
            upsert:false
          });
          if(up.error) throw new Error(`Falha no upload (${labelPos(item.pos)}): ${up.error.message}`);

          enviados.push({
            posicao:item.pos,
            path,
            file_size:processed.blob.size,
            width:processed.width,
            height:processed.height
          });
        }
      }

      btn.textContent='Salvando avaliaÃ§Ã£o...';

      const payload={
        id:avaliacaoId,
        aluno_id:state.alunoId,
        professor_id:auth.user.id,
        data_avaliacao:$('#cfOficialData').value,
        objetivo:$('#cfOficialObjetivo').value||null,
        observacoes:$('#cfOficialObs').value?.trim()||null,
        peso,
        altura,
        idade,
        sexo:$('#cfOficialSexo').value||null,
        imc:imc ? Number(imc.toFixed(2)) : null,
        gordura_percentual:gordura,
        massa_magra:massaMagra,
        soma_dobras:Number(somaDobras.toFixed(2)),
        dobras,
        perimetria,
        ia_professor:iaText||null,
        ia_aluno:resumoAluno({peso,imc,gordura,perimetria}),
        relatorio_professor:$('#cfOficialObs').value?.trim()||null,
        liberado_aluno:false,
        liberar_fotos:false,
        liberar_ia:false,
        liberar_pdf:false
      };

      const ins=await client.from('avaliacoes_oficiais').insert(payload);
      if(ins.error) throw new Error(`Falha ao salvar avaliaÃ§Ã£o: ${ins.error.message}`);

      if(enviados.length===4){
        btn.textContent='Registrando fotos...';

        const rows=enviados.map(f=>({
          avaliacao_id:avaliacaoId,
          aluno_id:state.alunoId,
          posicao:f.posicao,
          storage_bucket:BUCKET,
          storage_path:f.path,
          mime_type:'image/jpeg',
          file_size:f.file_size,
          width:f.width,
          height:f.height,
          released_to_student:false,
          created_by:auth.user.id
        }));

        const meta=await client.from('avaliacao_fotos_oficiais').insert(rows);
        if(meta.error) throw new Error(`AvaliaÃ§Ã£o salva, mas as fotos nÃ£o foram registradas: ${meta.error.message}`);
      }

      btn.textContent='Salvo âœ“';
      toast('AvaliaÃ§Ã£o salva com sucesso!');

      await loadHistory();

      setTimeout(()=>{
        $('#modalAvaliacaoOficial')?.classList.remove('active');
      },900);

    }catch(err){
      console.error('[Salvar avaliaÃ§Ã£o]',err);

      if(enviados.length){
        try{
          await supa().storage.from(BUCKET).remove(enviados.map(f=>f.path));
        }catch(cleanupError){
          console.warn('[Limpeza de fotos]',cleanupError);
        }
      }

      toast(err.message||'Erro ao salvar avaliaÃ§Ã£o.','error');

    }finally{
      setTimeout(()=>{
        if(!btn) return;
        btn.dataset.salvando='0';
        btn.disabled=false;
        if(btn.textContent!=='Salvo âœ“') btn.textContent=textoOriginal;
      },400);
    }
  }

  function resumoAluno({peso,imc,gordura,perimetria}){
    const out = [];
    if(peso) out.push(`Peso registrado: ${peso.toFixed(1).replace('.', ',')} kg.`);
    if(imc) out.push(`IMC: ${imc.toFixed(2).replace('.', ',')} (${classIMC(imc)}).`);
    if(gordura) out.push(`Gordura corporal: ${gordura.toFixed(1).replace('.', ',')}%.`);
    if(perimetria?.cintura) out.push(`Cintura registrada: ${perimetria.cintura} cm.`);
    out.push('Continue acompanhando sua evoluÃ§Ã£o com o professor.');
    return out.join('\n');
  }

  async function uploadPhotos(avaliacaoId){
    const {data:{user}} = await supa().auth.getUser();
    let index = 0;
    for(const [pos,item] of state.selected.entries()){
      index++;
      toast(`Enviando foto ${index}/4...`);
      const processed = await compressImage(item.file);
      const fileName = `${crypto.randomUUID ? crypto.randomUUID() : Date.now()}.jpg`;
      const path = `${state.alunoId}/${avaliacaoId}/${pos}-${fileName}`;

      const up = await supa().storage.from(BUCKET).upload(path, processed.blob, {
        contentType:'image/jpeg',
        cacheControl:'3600',
        upsert:false
      });
      if(up.error) throw up.error;

      const meta = await supa().from('avaliacao_fotos_oficiais').insert({
        avaliacao_id:avaliacaoId,
        aluno_id:state.alunoId,
        posicao:pos,
        storage_bucket:BUCKET,
        storage_path:path,
        mime_type:'image/jpeg',
        file_size:processed.blob.size,
        width:processed.width,
        height:processed.height,
        released_to_student:false,
        created_by:user?.id || null
      });
      if(meta.error) throw meta.error;
    }
  }

  async function loadHistory(){
    if(!state.alunoId) return;
    const box = $('#cfOficialHistory');
    if(box) box.innerHTML = '<div style="color:#94a3b8">Carregando...</div>';
    try{
      const {data,error} = await supa()
        .from('avaliacoes_oficiais')
        .select('id,data_avaliacao,peso,imc,gordura_percentual,liberado_aluno,liberar_fotos,liberar_ia,created_at')
        .eq('aluno_id', state.alunoId)
        .order('data_avaliacao',{ascending:false})
        .order('created_at',{ascending:false});
      if(error) throw error;

      state.lastAvaliacaos = data || [];
      const ids = state.lastAvaliacaos.map(x=>x.id);
      let counts = {};
      if(ids.length){
        const p = await supa().from('avaliacao_fotos_oficiais').select('avaliacao_id,posicao,released_to_student').in('avaliacao_id',ids);
        if(!p.error) (p.data||[]).forEach(r => { counts[r.avaliacao_id] = (counts[r.avaliacao_id] || 0) + 1; });
      }

      if(!box) return;
      if(!state.lastAvaliacaos.length){
        box.innerHTML = '<div style="color:#94a3b8">Nenhuma avaliaÃ§Ã£o salva.</div>';
        return;
      }

      box.innerHTML = state.lastAvaliacaos.map(a => `
        <div class="cfOficial-history-item">
          <div>
            <strong>${new Date(a.data_avaliacao + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
            <div style="margin-top:5px">
              <span class="cfOficial-pill">Peso: ${a.peso ?? 'â€”'} kg</span>
              <span class="cfOficial-pill">IMC: ${a.imc ?? 'â€”'}</span>
              <span class="cfOficial-pill">Fotos: ${counts[a.id] || 0}/4</span>
              ${a.liberado_aluno ? '<span class="cfOficial-pill">Liberada</span>' : ''}
            </div>
          </div>
          <small>${a.gordura_percentual ? 'Gordura: '+a.gordura_percentual+'%' : 'â€”'}</small>
        </div>
      `).join('');
    }catch(err){
      console.error('[AvaliaÃ§Ã£o histÃ³rico]',err);
      if(box) box.innerHTML = '<div style="color:#ef4444">Erro ao carregar histÃ³rico.</div>';
    }
  }

  async function releaseComparison(){
    if(!state.alunoId) return;
    const btn = $('#cfOficialLiberarComparativo');
    const old = btn.innerHTML;
    try{
      btn.disabled = true;
      btn.innerHTML = 'Liberando...';
      await loadHistory();
      const latest = state.lastAvaliacaos.slice(0,2);
      if(latest.length < 2) throw new Error('SÃ£o necessÃ¡rias pelo menos duas avaliaÃ§Ãµes.');

      const ids = latest.map(x=>x.id);
      const releaseFotos = $('#cfOficialLiberarFotos')?.checked !== false;
      const releaseIA = $('#cfOficialLiberarIA')?.checked !== false;
      const releasePDF = $('#cfOficialLiberarPDF')?.checked === true;

      let r = await supa().from('avaliacoes_oficiais').update({
        liberado_aluno:false, liberar_fotos:false, liberar_ia:false, liberar_pdf:false
      }).eq('aluno_id', state.alunoId);
      if(r.error) throw r.error;

      r = await supa().from('avaliacao_fotos_oficiais').update({released_to_student:false}).eq('aluno_id', state.alunoId);
      if(r.error) throw r.error;

      r = await supa().from('avaliacoes_oficiais').update({
        liberado_aluno:true, liberar_fotos:releaseFotos, liberar_ia:releaseIA, liberar_pdf:releasePDF
      }).in('id', ids);
      if(r.error) throw r.error;

      if(releaseFotos){
        r = await supa().from('avaliacao_fotos_oficiais').update({released_to_student:true}).in('avaliacao_id', ids);
        if(r.error) throw r.error;
      }

      toast('Comparativo liberado para o aluno.');
      await loadHistory();
    }catch(err){
      console.error('[AvaliaÃ§Ã£o liberar]',err);
      toast(err.message || 'Erro ao liberar comparativo.','error');
    }finally{
      btn.disabled = false;
      btn.innerHTML = old;
    }
  }

  function patchOpenFunction(){
    if(window.__CORPOFITNESS_AVALIACAO_OFICIAL_PATCHED__) return true;
    if(typeof window.abrirModalAvaliacaoFisicaCompleta !== 'function') return false;

    window.abrirModalAvaliacaoFisicaCompletaOriginal = window.abrirModalAvaliacaoFisicaCompleta;
    window.abrirModalAvaliacaoFisicaCompleta = function(alunoId, alunoNome){
      return open(alunoId, alunoNome);
    };
    window.__CORPOFITNESS_AVALIACAO_OFICIAL_PATCHED__ = RELEASE;
    return true;
  }

  function boot(){
    ensureModal();
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if(patchOpenFunction() || tries > 30) clearInterval(timer);
    }, 300);
    patchOpenFunction();
    window.CorpoFitnessAvaliacaoOficial = { open, release: RELEASE };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
