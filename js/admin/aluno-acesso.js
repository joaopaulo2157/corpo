(() => {
  'use strict';

  const FN_NAME = 'admin-aluno-access';
  const PORTAL_URL = `${location.origin}/aluno/portal-seguro.html`;

  const $ = (id) => document.getElementById(id);
  const norm = (v) => String(v ?? '').trim();
  const digits = (v) => String(v ?? '').replace(/\D/g, '');

  function notify(msg, type='') {
    if (window.showToast) return window.showToast(msg, type);
    if (type === 'error') alert(msg); else console.log(msg);
  }

  function randomPassword() {
    const upper='ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower='abcdefghijkmnopqrstuvwxyz';
    const nums='23456789';
    const sym='!@#$%';
    const all=upper+lower+nums+sym;
    const pick=(s)=>s[Math.floor(Math.random()*s.length)];
    let out=pick(upper)+pick(lower)+pick(nums)+pick(sym);
    while(out.length<10) out+=pick(all);
    return out.split('').sort(()=>Math.random()-.5).join('');
  }

  function ensurePasswordField() {
    const form=$('formAlunoDinamico');
    const email=$('alunoEmail');

    if(!form || !email) return;

    if($('alunoSenhaInicial')) {
      const existingBtn = $('aplicarSenhaAlunoBtn');
      if (!existingBtn) addApplyPasswordButton();
      return;
    }

    const group=document.createElement('div');
    group.className='form-group';
    group.id='grupoSenhaInicialAluno';
    group.innerHTML=`
      <label class="form-label" for="alunoSenhaInicial">Senha de acesso do aluno</label>

      <div style="display:flex;gap:8px;align-items:stretch;flex-wrap:wrap">
        <input
          type="text"
          id="alunoSenhaInicial"
          class="form-control"
          minlength="8"
          autocomplete="new-password"
          placeholder="Mínimo 8 caracteres"
          style="flex:1;min-width:210px"
        >

        <button
          type="button"
          id="gerarSenhaAlunoBtn"
          class="btn-action-bar"
          style="min-width:110px"
          title="Gerar senha forte"
        >🔐 Gerar</button>

        <button
          type="button"
          id="aplicarSenhaAlunoBtn"
          class="btn-action-bar"
          style="min-width:150px;display:none"
          title="Aplicar esta senha ao acesso do aluno"
        >✅ Aplicar senha</button>
      </div>

      <small
        id="senhaAlunoAjuda"
        style="display:block;margin-top:6px;color:var(--gray);font-size:.72rem;line-height:1.45"
      >
        A senha é criada no Supabase Auth e não fica armazenada em texto no banco.
      </small>
    `;

    const emailGroup=email.closest('.form-group');
    if(emailGroup?.parentNode) emailGroup.parentNode.insertBefore(group,emailGroup.nextSibling);
    else form.prepend(group);

    $('gerarSenhaAlunoBtn')?.addEventListener('click',()=>{
      $('alunoSenhaInicial').value=randomPassword();
      $('alunoSenhaInicial').focus();
    });

    $('aplicarSenhaAlunoBtn')?.addEventListener('click', applyPasswordToExisting);
  }

  function addApplyPasswordButton() {
    const input = $('alunoSenhaInicial');
    if (!input || $('aplicarSenhaAlunoBtn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'aplicarSenhaAlunoBtn';
    btn.className = 'btn-action-bar';
    btn.style.minWidth = '150px';
    btn.style.display = 'none';
    btn.textContent = '✅ Aplicar senha';
    btn.title = 'Aplicar esta senha ao acesso do aluno';
    btn.addEventListener('click', applyPasswordToExisting);

    input.parentElement?.appendChild(btn);
  }

  function setMode(isNew) {
    ensurePasswordField();

    const input=$('alunoSenhaInicial');
    const help=$('senhaAlunoAjuda');
    const applyBtn=$('aplicarSenhaAlunoBtn');

    if(!input) return;

    input.value='';
    input.required=!!isNew;

    if (applyBtn) applyBtn.style.display = isNew ? 'none' : 'inline-flex';

    if(help) {
      help.innerHTML = isNew
        ? 'Obrigatória no primeiro cadastro. Será criada no Supabase Auth e enviada ao aluno pelo WhatsApp.'
        : '<strong>Aluno existente:</strong> digite ou gere uma nova senha e clique em <strong>Aplicar senha</strong>. Isso adiciona/atualiza o acesso por senha sem remover o login Google.';
    }
  }

  function whatsappNumber(value) {
    let n=digits(value);
    if(!n) return '';
    if(n.startsWith('55') && n.length>=12) return n;
    if(n.length===10 || n.length===11) return '55'+n;
    return n;
  }

  function whatsappMessage({nome,email,password}) {
    const first=norm(nome).split(/\s+/)[0]||'Aluno';
    return [
      `Olá, ${first}! 👋`,
      '',
      'Seu acesso à *Área do Aluno da Academia Corpofitness* foi atualizado.',
      '',
      `📧 *E-mail:* ${email}`,
      `🔐 *Senha:* ${password}`,
      '',
      `📱 *Acesse:* ${PORTAL_URL}`,
      '',
      'Você pode entrar por e-mail/senha ou usar *Continuar com Google* com o mesmo e-mail.'
    ].join('\n');
  }

  async function invokeAccess(payload) {
    if(typeof _supabase==='undefined') {
      throw new Error('Supabase não foi carregado no painel.');
    }

    const {data:{session},error:sessionError}=await _supabase.auth.getSession();

    if(sessionError) throw sessionError;

    if(!session?.access_token) {
      throw new Error('Sua sessão administrativa expirou. Entre novamente no painel.');
    }

    const {data,error}=await _supabase.functions.invoke(FN_NAME,{
      body:payload,
      headers:{
        Authorization:`Bearer ${session.access_token}`
      }
    });

    if(error){
      let msg=error.message||'Falha ao atualizar o acesso do aluno.';

      try{
        if(error.context && typeof error.context.json==='function'){
          const body=await error.context.json();
          msg=body?.error||msg;
        }
      }catch(_){}

      throw new Error(msg);
    }

    if(data?.error) throw new Error(data.error);

    return data;
  }

  function showCredentials({nome,email,password,tel,title='Acesso do aluno atualizado'}) {
    $('credenciaisAlunoCriadoModal')?.remove();

    const overlay=document.createElement('div');
    overlay.id='credenciaisAlunoCriadoModal';
    overlay.className='modal-overlay active';
    overlay.style.display='flex';

    const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[c]));

    const msg=whatsappMessage({nome,email,password});
    const number=whatsappNumber(tel);
    const waUrl=number
      ? `https://wa.me/${number}?text=${encodeURIComponent(msg)}`
      : '';

    overlay.innerHTML=`
      <div class="modal-card" style="max-width:620px">
        <div class="card-header">
          <h3>✅ ${esc(title)}</h3>
          <button
            type="button"
            class="btn-action-bar"
            id="fecharCredenciaisAluno"
          >✕</button>
        </div>

        <div style="padding:14px;border:1px solid rgba(76,175,80,.28);background:rgba(76,175,80,.08);border-radius:14px;margin-bottom:16px">
          <strong style="display:block;margin-bottom:8px">${esc(nome)}</strong>

          <div style="font-size:.88rem;line-height:1.8">
            <div>📧 <strong>E-mail:</strong> <code>${esc(email)}</code></div>
            <div>🔐 <strong>Senha:</strong> <code>${esc(password)}</code></div>
          </div>
        </div>

        <p style="color:var(--gray);font-size:.8rem;line-height:1.55;margin-bottom:16px">
          A senha foi aplicada no Supabase Auth. Ela não é armazenada em texto no banco.
        </p>

        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button
            type="button"
            class="btn btn-success"
            id="enviarCredenciaisWhatsApp"
          >
            <i class="fa-brands fa-whatsapp"></i>
            Abrir WhatsApp
          </button>

          <button
            type="button"
            class="btn btn-secondary"
            id="copiarCredenciaisAluno"
          >
            📋 Copiar credenciais
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    $('fecharCredenciaisAluno')?.addEventListener('click',()=>overlay.remove());

    overlay.addEventListener('click',(e)=>{
      if(e.target===overlay) overlay.remove();
    });

    $('enviarCredenciaisWhatsApp')?.addEventListener('click',()=>{
      if(!waUrl) {
        notify('WhatsApp do aluno inválido.','warning');
        return;
      }

      window.open(waUrl,'_blank','noopener,noreferrer');
    });

    $('copiarCredenciaisAluno')?.addEventListener('click',async()=>{
      try{
        await navigator.clipboard.writeText(msg);
        notify('Credenciais copiadas!');
      }catch(_){
        notify('Não foi possível copiar automaticamente.','warning');
      }
    });
  }

  async function applyPasswordToExisting() {
    const alunoId=norm($('alunoId')?.value);
    const password=$('alunoSenhaInicial')?.value||'';

    if(!alunoId || alunoId==='-1') {
      notify('Abra primeiro um aluno existente para redefinir a senha.','warning');
      return;
    }

    if(password.length<8) {
      notify('A senha deve ter pelo menos 8 caracteres.','warning');
      $('alunoSenhaInicial')?.focus();
      return;
    }

    const nome=norm($('alunoNome')?.value);
    const email=norm($('alunoEmail')?.value).toLowerCase();
    const tel=norm($('alunoTel')?.value);

    const btn=$('aplicarSenhaAlunoBtn');
    const old=btn?.innerHTML;

    try{
      if(btn){
        btn.disabled=true;
        btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Aplicando...';
      }

      const result=await invokeAccess({
        action:'set_password',
        aluno_id:alunoId,
        password
      });

      if(!result?.ok) {
        throw new Error('O servidor não confirmou a atualização da senha.');
      }

      notify('Senha aplicada no acesso do aluno com sucesso!');

      showCredentials({
        nome,
        email,
        password,
        tel,
        title:'Senha do aluno atualizada'
      });

      $('alunoSenhaInicial').value='';
    }catch(err){
      console.error('[Senha do aluno]',err);

      if(window.CorpofitnessUI?.erro) {
        window.CorpofitnessUI.erro(err?.message||'Erro ao aplicar a senha do aluno.');
      }else{
        alert(err?.message||'Erro ao aplicar a senha do aluno.');
      }
    }finally{
      if(btn){
        btn.disabled=false;
        btn.innerHTML=old||'✅ Aplicar senha';
      }
    }
  }

  async function handleSubmit(e) {
    const id=$('alunoId')?.value??'-1';

    // Edição de aluno existente continua com app.js.
    // A senha é aplicada pelo botão dedicado "Aplicar senha".
    if(id!=='-1') return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const nome=norm($('alunoNome')?.value);
    const email=norm($('alunoEmail')?.value).toLowerCase();
    const tel=norm($('alunoTel')?.value);
    const plano=norm($('alunoPlano')?.value);
    const status=norm($('alunoStatus')?.value||'Ativo');
    const password=$('alunoSenhaInicial')?.value||'';

    if(!nome||!email||!tel) {
      notify('Preencha nome, e-mail e WhatsApp.','warning');
      return;
    }

    if(password.length<8){
      notify('Defina uma senha inicial com pelo menos 8 caracteres.','warning');
      $('alunoSenhaInicial')?.focus();
      return;
    }

    const form=e.currentTarget;
    const submit=e.submitter||form.querySelector('[type="submit"]');
    const old=submit?.innerHTML;

    try{
      if(submit){
        submit.disabled=true;
        submit.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Criando acesso...';
      }

      const result=await invokeAccess({
        action:'create_access',
        nome,
        email,
        tel,
        plano,
        status,
        password
      });

      if(!result?.ok) {
        throw new Error('O servidor não confirmou a criação do acesso.');
      }

      if(window.fecharFormAluno) window.fecharFormAluno();

      if(window.carregarAlunosAdmin) {
        await window.carregarAlunosAdmin();
      }

      notify('Aluno e acesso criados com sucesso!');

      showCredentials({
        nome,
        email,
        password,
        tel,
        title:'Acesso do aluno criado'
      });

      form.reset();
      setMode(true);

    }catch(err){
      console.error('[Acesso Aluno]',err);

      if(window.CorpofitnessUI?.erro) {
        window.CorpofitnessUI.erro(err?.message||'Erro ao criar o acesso do aluno.');
      }else{
        alert(err?.message||'Erro ao criar o acesso do aluno.');
      }

    }finally{
      if(submit){
        submit.disabled=false;
        submit.innerHTML=old||'Salvar Aluno';
      }
    }
  }

  function install() {
    ensurePasswordField();

    const form=$('formAlunoDinamico');

    if(form && form.dataset.alunoAccessV2!=='1'){
      form.dataset.alunoAccessV2='1';
      form.addEventListener('submit',handleSubmit,true);
    }

    if(typeof window.abrirFormAluno==='function' && !window.abrirFormAluno.__cfAccessV2Wrapped){
      const original=window.abrirFormAluno;

      const wrapped=async function(...args){
        const r=await original.apply(this,args);
        setMode(true);
        return r;
      };

      wrapped.__cfAccessV2Wrapped=true;
      window.abrirFormAluno=wrapped;
    }

    if(typeof window.editarAluno==='function' && !window.editarAluno.__cfAccessV2Wrapped){
      const original=window.editarAluno;

      const wrapped=async function(...args){
        const r=await original.apply(this,args);
        setMode(false);
        return r;
      };

      wrapped.__cfAccessV2Wrapped=true;
      window.editarAluno=wrapped;
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      install();
      setTimeout(install,500);
      setTimeout(install,1500);
    },{once:true});
  }else{
    install();
    setTimeout(install,500);
    setTimeout(install,1500);
  }

})();
