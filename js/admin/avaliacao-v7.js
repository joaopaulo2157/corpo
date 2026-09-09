(() => {
  'use strict';

  const VERSION = '7.1.0';
  const BUCKET = 'avaliacao-fotos-v7';
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
    lastAssessments:[]
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
    else console.log('[Corpofitness V7]', msg);
  }

  function supa() {
    if (!window._supabase) throw new Error('Supabase não carregado no painel.');
    return window._supabase;
  }

  function modalHTML() {
    return `
      <div id="modalAvaliacaoV7" aria-hidden="true">
        <div class="cfv7-modal">
          <div class="cfv7-header">
            <div class="cfv7-title">
              <h2>📋 Avaliação Física V7</h2>
              <p id="cfv7AlunoNome">Aluno(a)</p>
            </div>
            <button type="button" class="cfv7-close" id="cfv7Close">✕</button>
          </div>

          <div class="cfv7-body">
            <div class="cfv7-tabs">
              <button type="button" class="cfv7-tab active" data-tab="dados">1 Dados</button>
              <button type="button" class="cfv7-tab" data-tab="medidas">2 Medidas</button>
              <button type="button" class="cfv7-tab" data-tab="dobras">3 Dobras</button>
              <button type="button" class="cfv7-tab" data-tab="fotos">4 Fotos + IA</button>
              <button type="button" class="cfv7-tab" data-tab="historico">5 Histórico</button>
            </div>

            <section class="cfv7-panel active" data-panel="dados">
              <div class="cfv7-card">
                <h3>Dados gerais</h3>
                <div class="cfv7-grid">
                  <div class="cfv7-field"><label>Data</label><input type="date" id="cfv7Data"></div>
                  <div class="cfv7-field"><label>Objetivo</label><select id="cfv7Objetivo"><option value="">Selecione</option><option>Emagrecimento</option><option>Hipertrofia</option><option>Condicionamento</option><option>Saúde e qualidade de vida</option><option>Reabilitação / retorno</option></select></div>
                  <div class="cfv7-field"><label>Sexo cálculo</label><select id="cfv7Sexo"><option value="">Selecione</option><option value="M">Masculino</option><option value="F">Feminino</option><option value="Outro">Outro</option></select></div>
                  <div class="cfv7-field"><label>Idade</label><input type="number" id="cfv7Idade" min="1" max="120"></div>
                </div>
                <div class="cfv7-grid" style="margin-top:12px">
                  <div class="cfv7-field"><label>Peso kg</label><input type="number" step="0.1" id="cfv7Peso"></div>
                  <div class="cfv7-field"><label>Altura m</label><input type="number" step="0.01" id="cfv7Altura"></div>
                  <div class="cfv7-field"><label>% gordura real/estimado</label><input type="number" step="0.1" id="cfv7Gordura"></div>
                  <div class="cfv7-field"><label>Massa magra kg</label><input type="number" step="0.1" id="cfv7MassaMagra"></div>
                </div>
                <div class="cfv7-kpis">
                  <div class="cfv7-kpi"><small>IMC</small><strong id="cfv7IMC">0,00</strong></div>
                  <div class="cfv7-kpi"><small>Classificação</small><strong id="cfv7IMCClass">—</strong></div>
                  <div class="cfv7-kpi"><small>Soma dobras</small><strong id="cfv7SomaDobras">0</strong></div>
                  <div class="cfv7-kpi"><small>Status fotos</small><strong id="cfv7StatusFotos">0/4</strong></div>
                </div>
              </div>

              <div class="cfv7-card">
                <h3>Observações do professor</h3>
                <div class="cfv7-field"><label>Relatório/observações</label><textarea id="cfv7Obs" placeholder="Anotações técnicas, objetivo da fase, restrições, recomendações..."></textarea></div>
              </div>
            </section>

            <section class="cfv7-panel" data-panel="medidas">
              <div class="cfv7-card">
                <h3>Perimetria / medidas corporais</h3>
                <div class="cfv7-grid">
                  ${['ombro','torax','cintura','abdomen','quadril','braco_direito','braco_esquerdo','antebraco_direito','antebraco_esquerdo','coxa_direita','coxa_esquerda','panturrilha_direita','panturrilha_esquerda'].map(k=>`
                    <div class="cfv7-field"><label>${esc(label(k))} (cm)</label><input type="number" step="0.1" data-medida="${esc(k)}"></div>
                  `).join('')}
                </div>
              </div>
            </section>

            <section class="cfv7-panel" data-panel="dobras">
              <div class="cfv7-card">
                <h3>Dobras cutâneas</h3>
                <div class="cfv7-grid">
                  ${['subescapular','tricipital','bicipital','peitoral','axilar_media','supra_iliaca','abdominal','coxa','panturrilha'].map(k=>`
                    <div class="cfv7-field"><label>${esc(label(k))} (mm)</label><input type="number" step="0.1" data-dobra="${esc(k)}"></div>
                  `).join('')}
                </div>
              </div>
            </section>

            <section class="cfv7-panel" data-panel="fotos">
              <div class="cfv7-card">
                <h3>Fotos da avaliação</h3>
                <div class="cfv7-photo-grid">
                  ${POS.map(([key,name])=>`
                    <div class="cfv7-photo" data-photo-box="${key}">
                      <img data-photo-img="${key}" alt="${esc(name)}">
                      <canvas data-photo-canvas="${key}"></canvas>
                      <div class="cfv7-empty"><div><i class="fa-solid fa-camera"></i><strong>${esc(name)}</strong><span>Selecione a foto</span></div></div>
                      <div class="cfv7-photo-actions">
                        <button type="button" data-pick-photo="${key}">Foto</button>
                        <button type="button" data-ai-photo="${key}">IA</button>
                      </div>
                      <div class="cfv7-photo-label"><strong>${esc(name)}</strong><small data-photo-status="${key}">Pendente</small></div>
                      <input hidden type="file" accept="image/jpeg,image/png,image/webp" data-photo-file="${key}">
                    </div>
                  `).join('')}
                </div>
                <div class="cfv7-ai-box" id="cfv7AIBox"><strong>IA visual:</strong> selecione uma foto e clique em IA. A análise é orientativa para o professor.</div>
              </div>
            </section>

            <section class="cfv7-panel" data-panel="historico">
              <div class="cfv7-card">
                <h3>Histórico V7</h3>
                <div class="cfv7-release">
                  <label class="cfv7-switch"><input type="checkbox" id="cfv7LiberarFotos" checked> Liberar fotos</label>
                  <label class="cfv7-switch"><input type="checkbox" id="cfv7LiberarIA" checked> Liberar IA</label>
                  <label class="cfv7-switch"><input type="checkbox" id="cfv7LiberarPDF"> Liberar PDF</label>
                  <button type="button" class="cfv7-btn success" id="cfv7LiberarComparativo">Liberar antes/depois ao aluno</button>
                </div>
              </div>
              <div class="cfv7-card">
                <h3>Avaliações salvas</h3>
                <div class="cfv7-history" id="cfv7History"><div style="color:#94a3b8">Carregando...</div></div>
              </div>
            </section>
          </div>

          <div class="cfv7-actions">
            <button type="button" class="cfv7-btn warn" id="cfv7Fechar2">Cancelar</button>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button type="button" class="cfv7-btn" id="cfv7GerarIA">Gerar relatório IA</button>
              <button type="button" class="cfv7-btn primary" id="cfv7Salvar">Salvar avaliação V7</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function label(k){
    const map = {
      ombro:'Ombro',torax:'Tórax',cintura:'Cintura',abdomen:'Abdômen',quadril:'Quadril',
      braco_direito:'Braço direito',braco_esquerdo:'Braço esquerdo',antebraco_direito:'Antebraço direito',
      antebraco_esquerdo:'Antebraço esquerdo',coxa_direita:'Coxa direita',coxa_esquerda:'Coxa esquerda',
      panturrilha_direita:'Panturrilha direita',panturrilha_esquerda:'Panturrilha esquerda',
      subescapular:'Subescapular',tricipital:'Tricipital',bicipital:'Bicipital',peitoral:'Peitoral',
      axilar_media:'Axilar média',supra_iliaca:'Supra-ilíaca',abdominal:'Abdominal',coxa:'Coxa',panturrilha:'Panturrilha'
    };
    return map[k] || k;
  }

  function ensureModal() {
    if ($('#modalAvaliacaoV7')) return;
    document.body.insertAdjacentHTML('beforeend', modalHTML());

    $('#cfv7Close').addEventListener('click', close);
    $('#cfv7Fechar2').addEventListener('click', close);
    $('#modalAvaliacaoV7').addEventListener('click', e => { if(e.target.id === 'modalAvaliacaoV7') close(); });

    $$('.cfv7-tab').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));

    ['cfv7Peso','cfv7Altura','cfv7Gordura'].forEach(id => $('#' + id)?.addEventListener('input', recalc));
    $$('[data-dobra]').forEach(input => input.addEventListener('input', recalc));

    POS.forEach(([key]) => {
      const input = $(`[data-photo-file="${key}"]`);
      $(`[data-pick-photo="${key}"]`).addEventListener('click', () => input.click());
      input.addEventListener('change', () => selectPhoto(key, input.files?.[0] || null));
      $(`[data-ai-photo="${key}"]`).addEventListener('click', () => analyzePhoto(key));
    });

    $('#cfv7Salvar').addEventListener('click', saveAssessment);
    $('#cfv7GerarIA').addEventListener('click', generateAI);
    $('#cfv7LiberarComparativo').addEventListener('click', releaseComparison);
  }

  function setTab(tab){
    state.currentTab = tab;
    $$('.cfv7-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $$('.cfv7-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
  }

  function close(){
    $('#modalAvaliacaoV7')?.classList.remove('active');
  }

  async function open(alunoId, alunoNome) {
    ensureModal();
    clearForm();
    state.alunoId = alunoId;
    state.alunoNome = typeof alunoNome === 'string' ? alunoNome : 'Aluno(a)';
    $('#cfv7AlunoNome').textContent = `Aluno(a): ${state.alunoNome}`;
    $('#cfv7Data').value = today();
    $('#modalAvaliacaoV7').classList.add('active');
    setTab('dados');
    await loadHistory();
  }

  function clearForm(){
    state.selected.forEach(x => URL.revokeObjectURL(x.url));
    state.selected.clear();
    state.urls.clear();

    ['cfv7Data','cfv7Objetivo','cfv7Sexo','cfv7Idade','cfv7Peso','cfv7Altura','cfv7Gordura','cfv7MassaMagra','cfv7Obs'].forEach(id => {
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
    $('#cfv7AIBox') && ($('#cfv7AIBox').innerHTML = '<strong>IA visual:</strong> selecione uma foto e clique em IA. A análise é orientativa para o professor.');
    recalc();
  }

  function collectObj(selector){
    const o = {};
    $$(selector).forEach(i => o[i.dataset.medida || i.dataset.dobra] = n(i.value));
    return o;
  }

  function recalc(){
    const peso = n($('#cfv7Peso')?.value);
    const altura = n($('#cfv7Altura')?.value);
    let imc = null;
    if(peso && altura) imc = peso/(altura*altura);

    $('#cfv7IMC').textContent = imc ? imc.toFixed(2).replace('.', ',') : '0,00';
    $('#cfv7IMCClass').textContent = classIMC(imc);

    const soma = $$('[data-dobra]').reduce((s,i) => s + (n(i.value)||0), 0);
    $('#cfv7SomaDobras').textContent = soma.toFixed(1).replace('.', ',');
    $('#cfv7StatusFotos').textContent = `${state.selected.size}/4`;

    const gordura = n($('#cfv7Gordura')?.value);
    if(peso && gordura && !n($('#cfv7MassaMagra')?.value)){
      $('#cfv7MassaMagra').value = (peso * (1 - gordura/100)).toFixed(1);
    }
  }

  function classIMC(imc){
    if(!imc) return '—';
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
    if(file.size > 12*1024*1024) return toast('A foto deve ter no máximo 12 MB.','error');

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
      ? [['Ombros',.50,.22],['Abdômen',.50,.48],['Quadril',.50,.64],['Joelhos',.50,.80]]
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
      frente:'Verificar alinhamento aparente de ombros, abdômen, quadril e joelhos.',
      lado_direito:'Verificar projeção de cabeça/ombros, postura, core e alinhamento lateral.',
      lado_esquerdo:'Comparar o lado esquerdo com o direito para observar assimetrias visuais.',
      costas:'Verificar região dorsal, lombar, quadril e simetria posterior.'
    };
    $('#cfv7AIBox').innerHTML = `<strong>IA visual — ${esc(labelPos(key))}:</strong><br>• ${esc(map[key])}<br>• Esta marcação é apoio visual para o professor, não diagnóstico.`;
  }

  function labelPos(k){
    return (POS.find(p=>p[0]===k)||[])[1] || k;
  }

  function generateAI(){
    const peso = n($('#cfv7Peso')?.value);
    const imc = peso && n($('#cfv7Altura')?.value) ? peso/(n($('#cfv7Altura').value)**2) : null;
    const gordura = n($('#cfv7Gordura')?.value);
    const per = collectObj('[data-medida]');
    const notes = [];

    if(imc) notes.push(`IMC atual: ${imc.toFixed(2).replace('.', ',')} (${classIMC(imc)}).`);
    if(gordura) notes.push(`Percentual de gordura informado/estimado: ${gordura.toFixed(1).replace('.', ',')}%.`);
    if(per.cintura && per.quadril) notes.push(`Relação cintura/quadril aproximada: ${(per.cintura/per.quadril).toFixed(2).replace('.', ',')}.`);
    if(state.selected.size) notes.push(`${state.selected.size}/4 fotos anexadas para registro visual.`);
    notes.push('Sugestão: comparar nova avaliação com a anterior antes de liberar o relatório ao aluno.');

    $('#cfv7AIBox').innerHTML = `<strong>Relatório IA simples:</strong><br>${notes.map(x=>'• '+esc(x)).join('<br>')}`;
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

  async function saveAssessment(){
    if(!state.alunoId) return toast('Aluno não localizado.','error');
    if(state.selected.size && state.selected.size !== 4) return toast('Para salvar fotos, selecione as quatro posições.','error');

    const btn = $('#cfv7Salvar');
    const old = btn.innerHTML;
    try{
      btn.disabled = true;
      btn.innerHTML = 'Salvando...';

      recalc();
      generateAI();

      const peso = n($('#cfv7Peso')?.value);
      const altura = n($('#cfv7Altura')?.value);
      const gordura = n($('#cfv7Gordura')?.value);
      const imc = peso && altura ? peso/(altura*altura) : null;
      const dobras = collectObj('[data-dobra]');
      const perimetria = collectObj('[data-medida]');
      const somaDobras = Object.values(dobras).reduce((s,v)=>s+(v||0),0);
      const iaText = $('#cfv7AIBox')?.innerText || '';

      const payload = {
        aluno_id: state.alunoId,
        data_avaliacao: $('#cfv7Data').value || today(),
        objetivo: $('#cfv7Objetivo').value || null,
        observacoes: $('#cfv7Obs').value || null,
        peso, altura,
        idade: n($('#cfv7Idade')?.value),
        sexo: $('#cfv7Sexo').value || null,
        imc: imc ? Number(imc.toFixed(2)) : null,
        gordura_percentual: gordura,
        massa_magra: n($('#cfv7MassaMagra')?.value),
        soma_dobras: Number(somaDobras.toFixed(2)),
        dobras,
        perimetria,
        ia_professor: iaText,
        ia_aluno: resumoAluno({peso,imc,gordura,perimetria}),
        relatorio_professor: $('#cfv7Obs').value || null,
        liberado_aluno:false,
        liberar_fotos:false,
        liberar_ia:false,
        liberar_pdf:false
      };

      const {data:assessment,error} = await supa().from('v7_assessments').insert(payload).select('id').single();
      if(error) throw error;

      if(state.selected.size === 4) await uploadPhotos(assessment.id);

      toast('Avaliação V7 salva com sucesso!');
      clearForm();
      $('#cfv7Data').value = today();
      await loadHistory();
      setTab('historico');
    }catch(err){
      console.error('[V7 salvar avaliação]',err);
      toast(err.message || 'Erro ao salvar avaliação V7.','error');
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
    out.push('Continue acompanhando sua evolução com o professor.');
    return out.join('\n');
  }

  async function uploadPhotos(assessmentId){
    const {data:{user}} = await supa().auth.getUser();
    let index = 0;
    for(const [pos,item] of state.selected.entries()){
      index++;
      toast(`Enviando foto ${index}/4...`);
      const processed = await compressImage(item.file);
      const fileName = `${crypto.randomUUID ? crypto.randomUUID() : Date.now()}.jpg`;
      const path = `${state.alunoId}/${assessmentId}/${pos}-${fileName}`;

      const up = await supa().storage.from(BUCKET).upload(path, processed.blob, {
        contentType:'image/jpeg',
        cacheControl:'3600',
        upsert:false
      });
      if(up.error) throw up.error;

      const meta = await supa().from('v7_assessment_photos').insert({
        assessment_id:assessmentId,
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
    const box = $('#cfv7History');
    if(box) box.innerHTML = '<div style="color:#94a3b8">Carregando...</div>';
    try{
      const {data,error} = await supa()
        .from('v7_assessments')
        .select('id,data_avaliacao,peso,imc,gordura_percentual,liberado_aluno,liberar_fotos,liberar_ia,created_at')
        .eq('aluno_id', state.alunoId)
        .order('data_avaliacao',{ascending:false})
        .order('created_at',{ascending:false});
      if(error) throw error;

      state.lastAssessments = data || [];
      const ids = state.lastAssessments.map(x=>x.id);
      let counts = {};
      if(ids.length){
        const p = await supa().from('v7_assessment_photos').select('assessment_id,posicao,released_to_student').in('assessment_id',ids);
        if(!p.error) (p.data||[]).forEach(r => { counts[r.assessment_id] = (counts[r.assessment_id] || 0) + 1; });
      }

      if(!box) return;
      if(!state.lastAssessments.length){
        box.innerHTML = '<div style="color:#94a3b8">Nenhuma avaliação V7 salva.</div>';
        return;
      }

      box.innerHTML = state.lastAssessments.map(a => `
        <div class="cfv7-history-item">
          <div>
            <strong>${new Date(a.data_avaliacao + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
            <div style="margin-top:5px">
              <span class="cfv7-pill">Peso: ${a.peso ?? '—'} kg</span>
              <span class="cfv7-pill">IMC: ${a.imc ?? '—'}</span>
              <span class="cfv7-pill">Fotos: ${counts[a.id] || 0}/4</span>
              ${a.liberado_aluno ? '<span class="cfv7-pill">Liberada</span>' : ''}
            </div>
          </div>
          <small>${a.gordura_percentual ? 'Gordura: '+a.gordura_percentual+'%' : '—'}</small>
        </div>
      `).join('');
    }catch(err){
      console.error('[V7 histórico]',err);
      if(box) box.innerHTML = '<div style="color:#ef4444">Erro ao carregar histórico V7.</div>';
    }
  }

  async function releaseComparison(){
    if(!state.alunoId) return;
    const btn = $('#cfv7LiberarComparativo');
    const old = btn.innerHTML;
    try{
      btn.disabled = true;
      btn.innerHTML = 'Liberando...';
      await loadHistory();
      const latest = state.lastAssessments.slice(0,2);
      if(latest.length < 2) throw new Error('São necessárias pelo menos duas avaliações V7.');

      const ids = latest.map(x=>x.id);
      const releaseFotos = $('#cfv7LiberarFotos')?.checked !== false;
      const releaseIA = $('#cfv7LiberarIA')?.checked !== false;
      const releasePDF = $('#cfv7LiberarPDF')?.checked === true;

      let r = await supa().from('v7_assessments').update({
        liberado_aluno:false, liberar_fotos:false, liberar_ia:false, liberar_pdf:false
      }).eq('aluno_id', state.alunoId);
      if(r.error) throw r.error;

      r = await supa().from('v7_assessment_photos').update({released_to_student:false}).eq('aluno_id', state.alunoId);
      if(r.error) throw r.error;

      r = await supa().from('v7_assessments').update({
        liberado_aluno:true, liberar_fotos:releaseFotos, liberar_ia:releaseIA, liberar_pdf:releasePDF
      }).in('id', ids);
      if(r.error) throw r.error;

      if(releaseFotos){
        r = await supa().from('v7_assessment_photos').update({released_to_student:true}).in('assessment_id', ids);
        if(r.error) throw r.error;
      }

      toast('Comparativo V7 liberado para o aluno.');
      await loadHistory();
    }catch(err){
      console.error('[V7 liberar]',err);
      toast(err.message || 'Erro ao liberar comparativo.','error');
    }finally{
      btn.disabled = false;
      btn.innerHTML = old;
    }
  }

  function patchOpenFunction(){
    if(window.__CORPOFITNESS_AVALIACAO_V7_PATCHED__) return true;
    if(typeof window.abrirModalAvaliacaoFisicaCompleta !== 'function') return false;

    window.abrirModalAvaliacaoFisicaCompletaV6 = window.abrirModalAvaliacaoFisicaCompleta;
    window.abrirModalAvaliacaoFisicaCompleta = function(alunoId, alunoNome){
      return open(alunoId, alunoNome);
    };
    window.__CORPOFITNESS_AVALIACAO_V7_PATCHED__ = VERSION;
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
    window.CorpoFitnessAvaliacaoV7 = { open, version: VERSION };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
