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
              <button type="button" class="cfOficial-btn primary" id="cfOficialSalvar">Salvar avaliaÃ§Ã£o Oficial</button>
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

  function drawMarkers(key){
    const img = $(`[data-photo-img="${key}"]`);
    const canvas = $(`[data-photo-canvas="${key}"]`);
    if(!img?.src || !canvas) return;
    const box = img.getBoundingClientRect();
    canvas.width = Math.max(320, Math.round(box.width || 360));
    canvas.height = Math.max(420, Math.round(box.height || 480));
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(96,165,250,.95)';
    ctx.fillStyle = 'rgba(7,16,35,.88)';
    ctx.font = '700 14px Arial';

    const labels = key === 'frente'
      ? [['Ombros',.50,.22],['AbdÃ´men',.50,.48],['Quadril',.50,.64],['Joelhos',.50,.80]]
      : key === 'costas'
        ? [['Dorsal',.50,.32],['Lombar',.50,.56],['Quadril',.50,.68]]
        : [['Postura',.52,.25],['Core',.52,.50],['Quadril',.52,.66]];

    labels.forEach(([txt,xp,yp]) => {
      const x = canvas.width*xp, y = canvas.height*yp;
      ctx.beginPath(); ctx.arc(x,y,12,0,Math.PI*2); ctx.stroke();
      const w = ctx.measureText(txt).width + 18;
      ctx.fillRect(Math.max(6,x-w/2), Math.max(6,y-35), w, 24);
      ctx.fillStyle = '#fff'; ctx.fillText(txt, Math.max(12,x-w/2+9), Math.max(22,y-18));
      ctx.fillStyle = 'rgba(7,16,35,.88)';
    });
  }

  function analyzePhoto(key){
    if(!state.selected.has(key)) return toast('Selecione a foto primeiro.','error');
    drawMarkers(key);
    const map = {
      frente:'Verificar alinhamento aparente de ombros, abdÃ´men, quadril e joelhos.',
      lado_direito:'Verificar projeÃ§Ã£o de cabeÃ§a/ombros, postura, core e alinhamento lateral.',
      lado_esquerdo:'Comparar o lado esquerdo com o direito para observar assimetrias visuais.',
      costas:'Verificar regiÃ£o dorsal, lombar, quadril e simetria posterior.'
    };
    $('#cfOficialAIBox').innerHTML = `<strong>IA visual â€” ${esc(labelPos(key))}:</strong><br>â€¢ ${esc(map[key])}<br>â€¢ Esta marcaÃ§Ã£o Ã© apoio visual para o professor, nÃ£o diagnÃ³stico.`;
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
    if(!state.alunoId) return toast('Aluno nÃ£o localizado.','error');
    if(state.selected.size && state.selected.size !== 4) return toast('Para salvar fotos, selecione as quatro posiÃ§Ãµes.','error');

    const btn = $('#cfOficialSalvar');
    const old = btn.innerHTML;
    try{
      btn.disabled = true;
      btn.innerHTML = 'Salvando...';

      recalc();
      generateAI();

      const peso = n($('#cfOficialPeso')?.value);
      const altura = n($('#cfOficialAltura')?.value);
      const gordura = n($('#cfOficialGordura')?.value);
      const imc = peso && altura ? peso/(altura*altura) : null;
      const dobras = collectObj('[data-dobra]');
      const perimetria = collectObj('[data-medida]');
      const somaDobras = Object.values(dobras).reduce((s,v)=>s+(v||0),0);
      const iaText = $('#cfOficialAIBox')?.innerText || '';

      const payload = {
        aluno_id: state.alunoId,
        data_avaliacao: $('#cfOficialData').value || today(),
        objetivo: $('#cfOficialObjetivo').value || null,
        observacoes: $('#cfOficialObs').value || null,
        peso, altura,
        idade: n($('#cfOficialIdade')?.value),
        sexo: $('#cfOficialSexo').value || null,
        imc: imc ? Number(imc.toFixed(2)) : null,
        gordura_percentual: gordura,
        massa_magra: n($('#cfOficialMassaMagra')?.value),
        soma_dobras: Number(somaDobras.toFixed(2)),
        dobras,
        perimetria,
        ia_professor: iaText,
        ia_aluno: resumoAluno({peso,imc,gordura,perimetria}),
        relatorio_professor: $('#cfOficialObs').value || null,
        liberado_aluno:false,
        liberar_fotos:false,
        liberar_ia:false,
        liberar_pdf:false
      };

      const {data:avaliacao,error} = await supa().from('avaliacoes_oficiais').insert(payload).select('id').single();
      if(error) throw error;

      if(state.selected.size === 4) await uploadPhotos(avaliacao.id);

      toast('AvaliaÃ§Ã£o salva com sucesso!');
      clearForm();
      $('#cfOficialData').value = today();
      await loadHistory();
      setTab('historico');
    }catch(err){
      console.error('[Oficial salvar avaliaÃ§Ã£o]',err);
      toast(err.message || 'Erro ao salvar avaliaÃ§Ã£o.','error');
    }finally{
      btn.disabled = false;
      btn.innerHTML = old;
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
