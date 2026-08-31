(function CorpofitnessV2(){
'use strict';

const V2 = { versao:'2026.08.31-v6-core-refactor', alunoId:null, alunoNome:null, anamnese:null, staff:null };
window.CorpofitnessV2 = V2;
window.fecharModalV2 = id => { const el=document.getElementById(id); if(el) el.style.display='none'; };
const esc = v => String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const parseMaybeJSON = v => { if(!v) return {}; if(typeof v==='object') return v; try{return JSON.parse(v)}catch{return {}} };
const fichaAtual = () => (typeof exerciciosFichaMemoria!=='undefined' && exerciciosFichaMemoria) ? exerciciosFichaMemoria : {A:[],B:[],C:[],D:[],E:[]};
const blocoAtual = () => (typeof treinoAtualLetra!=='undefined' && treinoAtualLetra) ? treinoAtualLetra : 'A';

// ----------------------------------------------------------------
// STAFF SEGURO / CONVITES
// ----------------------------------------------------------------
window.carregarStaffSeguro = async function(){
  const tbody=document.getElementById('tabelaUsuariosBody'); if(!tbody) return;
  tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--gray);">Carregando acessos seguros...</td></tr>';
  try{
    const {data,error}=await _supabase.from('staff_profiles').select('*').order('created_at',{ascending:true}); if(error) throw error;
    tbody.innerHTML='';
    (data||[]).forEach(u=>{
      tbody.innerHTML += `<tr><td><strong>${esc(u.nome)}</strong><br><small style="color:var(--gray)">${u.ativo===false?'Inativo':'Ativo'}</small></td><td><code>${esc(u.email)}</code></td><td><span class="status-badge status-respondido">${esc((u.nivel||'professor').toUpperCase())}</span></td><td style="text-align:right;white-space:nowrap"><button class="btn-action-bar" onclick="editarStaffSeguro('${u.user_id}')">✏️</button>${u.ativo!==false?`<button class="btn-action-bar btn-danger" onclick="desativarStaffSeguro('${u.user_id}')">🚫</button>`:''}</td></tr>`;
    });
    const {data:invites}=await _supabase.from('staff_invites').select('*').is('used_at',null).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false});
    (invites||[]).forEach(i=>{
      const link=`${location.origin}${location.pathname}?invite=${encodeURIComponent(i.token)}`;
      tbody.innerHTML += `<tr><td><strong>${esc(i.nome)}</strong><br><small style="color:var(--warning)">Convite pendente</small></td><td><code>${esc(i.email)}</code></td><td><span class="status-badge">${esc((i.nivel||'professor').toUpperCase())}</span></td><td style="text-align:right"><button class="btn-action-bar" onclick="navigator.clipboard.writeText('${esc(link)}');showToast('Link do convite copiado!')">🔗 Copiar convite</button></td></tr>`;
    });
    if(!tbody.innerHTML) tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--gray);">Nenhum usuário administrativo.</td></tr>';
  }catch(err){tbody.innerHTML=`<tr><td colspan="4" style="color:var(--danger);text-align:center">Execute primeiro o SQL de migração V2. ${esc(err?.message||err)}</td></tr>`;}
};
window.salvarConviteStaffSeguro = async function(){
  const id=document.getElementById('usrId')?.value||'-1'; const nome=document.getElementById('usrNome')?.value.trim(); const email=document.getElementById('usrLogin')?.value.trim().toLowerCase(); const nivel=document.getElementById('usrNivel')?.value;
  if(!nome||!email||!nivel) return showToast('Preencha nome, e-mail e nível.','warning');
  try{
    if(id!=='-1'){const {error}=await _supabase.from('staff_profiles').update({nome,nivel,updated_at:new Date().toISOString()}).eq('user_id',id);if(error)throw error;document.getElementById('usrLogin').readOnly=false;document.getElementById('usrId').value='-1';fecharFormUsr?.();await carregarStaffSeguro();return showToast('Perfil atualizado!');}
    const {data,error}=await _supabase.rpc('corpofitness_criar_convite_staff',{p_email:email,p_nome:nome,p_nivel:nivel}); if(error) throw error; const token=data?.token||data?.[0]?.token||data; const link=`${location.origin}${location.pathname}?invite=${encodeURIComponent(token)}`; try{await navigator.clipboard.writeText(link)}catch{} fecharFormUsr?.(); await carregarStaffSeguro(); showToast('Convite criado e link copiado!');
  }catch(err){showToast('Erro ao salvar acesso: '+(err?.message||err),'error');}
};
window.editarStaffSeguro = async function(userId){
  try{const {data:u,error}=await _supabase.from('staff_profiles').select('*').eq('user_id',userId).single();if(error)throw error;document.getElementById('usrId').value=userId;document.getElementById('usrNome').value=u.nome||'';document.getElementById('usrLogin').value=u.email||'';document.getElementById('usrLogin').readOnly=true;document.getElementById('usrNivel').value=u.nivel||'professor';document.getElementById('tituloFormUsr').textContent='Editar Perfil de Acesso';document.getElementById('cardFormUsr').style.display='block';}catch(err){showToast(err.message,'error')}
};
window.desativarStaffSeguro = async function(userId){
  const atual=JSON.parse(sessionStorage.getItem('corpofitness_logado')||'null'); if(atual?.user_id===userId) return showToast('Você não pode desativar seu próprio acesso.','warning');
  const {error}=await _supabase.from('staff_profiles').update({ativo:false}).eq('user_id',userId); if(error)return showToast(error.message,'error'); carregarStaffSeguro(); showToast('Acesso administrativo desativado.');
};

async function processarConviteURL(){
  const token=new URLSearchParams(location.search).get('invite'); if(!token) return;
  const info=document.getElementById('loginSecurityInfo'); if(info) info.innerHTML='<strong style="color:var(--primary-light)">Convite detectado.</strong> Informe o e-mail convidado e escolha sua senha para ativar o acesso.';
  const form=document.getElementById('loginForm'); if(!form||form.dataset.inviteMode) return; form.dataset.inviteMode='1';
  form.addEventListener('submit',async e=>{if(!new URLSearchParams(location.search).get('invite'))return;e.preventDefault();e.stopImmediatePropagation();const email=document.getElementById('loginUser').value.trim().toLowerCase();const password=document.getElementById('loginPass').value;if(password.length<8)return showToast('Use uma senha com pelo menos 8 caracteres.','warning');try{let authData=null;const signin=await _supabase.auth.signInWithPassword({email,password});if(!signin.error&&signin.data?.session){authData=signin.data;}else{const signup=await _supabase.auth.signUp({email,password});if(signup.error)throw signup.error;const identities=signup.data?.user?.identities;const existente=Array.isArray(identities)&&identities.length===0;if(existente)throw new Error('Este e-mail já possui conta. Use a senha cadastrada anteriormente para aceitar o convite.');if(!signup.data?.session)throw new Error('Conta criada agora. Confirme o e-mail e depois reabra este link para concluir o convite.');authData=signup.data;}if(!authData?.session)throw new Error('Não foi possível estabelecer uma sessão autenticada.');const {error:claimErr}=await _supabase.rpc('corpofitness_aceitar_convite_staff',{p_token:token});if(claimErr)throw claimErr;history.replaceState({},'',location.pathname);location.reload();}catch(err){showToast(err?.message||err,'error')}},true);
}
processarConviteURL();

// ----------------------------------------------------------------
// ANAMNESE
// ----------------------------------------------------------------
async function carregarAnamnese(alunoId){
  try{const {data,error}=await _supabase.from('anamnese_alunos').select('*').eq('aluno_id',alunoId).maybeSingle();if(error)throw error;V2.anamnese=data||null;return V2.anamnese}catch(err){console.warn('[V2] anamnese:',err.message);return null}
}
window.abrirAnamneseTreino=async function(){
  const alunoId=document.getElementById('tr_aluno_id')?.value;if(!alunoId)return showToast('Abra o treino de um aluno.','warning');const a=await carregarAnamnese(alunoId)||{};document.getElementById('anamNivel').value=a.nivel_experiencia||'Iniciante';document.getElementById('anamFrequencia').value=String(a.frequencia_semanal||3);document.getElementById('anamTempo').value=a.tempo_sessao_min||60;document.getElementById('anamImpacto').value=a.preferencia_impacto||'normal';document.getElementById('anamLimitacoes').value=a.limitacoes_informadas||'';document.getElementById('anamLesoes').value=a.historico_lesoes_informado||'';document.getElementById('anamEvitar').value=(a.exercicios_evitar||[]).join(', ');document.getElementById('anamObs').value=a.observacoes_professor||'';document.getElementById('modalAnamneseV2').style.display='flex';
};
window.salvarAnamneseTreino=async function(){
  const alunoId=document.getElementById('tr_aluno_id')?.value;const payload={aluno_id:alunoId,nivel_experiencia:document.getElementById('anamNivel').value,frequencia_semanal:Number(document.getElementById('anamFrequencia').value),tempo_sessao_min:Number(document.getElementById('anamTempo').value),preferencia_impacto:document.getElementById('anamImpacto').value,limitacoes_informadas:document.getElementById('anamLimitacoes').value,historico_lesoes_informado:document.getElementById('anamLesoes').value,exercicios_evitar:document.getElementById('anamEvitar').value.split(',').map(s=>s.trim()).filter(Boolean),observacoes_professor:document.getElementById('anamObs').value,updated_at:new Date().toISOString()};const {data,error}=await _supabase.from('anamnese_alunos').upsert(payload,{onConflict:'aluno_id'}).select().single();if(error)return showToast(error.message,'error');V2.anamnese=data;fecharModalV2('modalAnamneseV2');showToast('Anamnese salva. A prescrição assistida passará a considerar essas informações.');
};

// ----------------------------------------------------------------
// TEMPLATES
// ----------------------------------------------------------------
window.abrirTemplatesTreino=async function(){document.getElementById('modalTemplatesV2').style.display='flex';await carregarTemplatesV2()};
async function carregarTemplatesV2(){const box=document.getElementById('listaTemplatesV2');box.innerHTML='Carregando...';const {data,error}=await _supabase.from('treino_templates').select('*').order('created_at',{ascending:false});if(error){box.innerHTML=`<div style="color:var(--danger)">${esc(error.message)}</div>`;return}box.innerHTML=(data||[]).map(t=>`<div class="card" style="margin:0;padding:12px"><strong>${esc(t.nome)}</strong><div style="font-size:.7rem;color:var(--gray);margin:4px 0 10px">${esc(t.objetivo||'Sem objetivo')} • ${esc(t.divisao||'')}</div><div style="display:flex;gap:6px"><button class="btn-action-bar" onclick="aplicarTemplateV2('${t.id}')">Aplicar</button><button class="btn-action-bar btn-danger" onclick="removerTemplateV2('${t.id}')">Excluir</button></div></div>`).join('')||'<div style="color:var(--gray)">Nenhum template salvo.</div>';}
window.salvarTemplateAtual=async function(){const nome=document.getElementById('templateNomeNovo').value.trim();if(!nome)return showToast('Informe o nome do template.','warning');const objetivo=document.getElementById('tr_objetivo')?.value||'';const divisao=[...document.querySelectorAll('input[name="tr_divisao"]')].find(r=>r.checked)?.parentElement?.textContent.trim()||'';const payload={nome,objetivo,divisao,estrutura:fichaAtual(),metadata:{nivel:[...document.querySelectorAll('input[name="tr_nivel"]')].find(r=>r.checked)?.parentElement?.textContent.trim()||''}};const {error}=await _supabase.from('treino_templates').insert(payload);if(error)return showToast(error.message,'error');document.getElementById('templateNomeNovo').value='';carregarTemplatesV2();showToast('Template salvo!')};
window.aplicarTemplateV2=async function(id){const {data,error}=await _supabase.from('treino_templates').select('*').eq('id',id).single();if(error)return showToast(error.message,'error');exerciciosFichaMemoria=JSON.parse(JSON.stringify(data.estrutura||{}));for(const k of ['A','B','C','D','E'])if(!Array.isArray(exerciciosFichaMemoria[k]))exerciciosFichaMemoria[k]=[];renderizarTabelaExerciciosFicha();fecharModalV2('modalTemplatesV2');showToast('Template aplicado. Revise antes de salvar.')};
window.removerTemplateV2=async id=>{const {error}=await _supabase.from('treino_templates').delete().eq('id',id);if(error)return showToast(error.message,'error');carregarTemplatesV2()};

// ----------------------------------------------------------------
// VERSIONAMENTO / RESTAURAÇÃO
// ----------------------------------------------------------------
async function criarVersaoTreinoV2(motivo='Salvamento manual'){
  const alunoId=document.getElementById('tr_aluno_id')?.value;if(!alunoId)return;try{const {data:row}=await _supabase.from('treinos_alunos').select('*').eq('aluno_id',alunoId).eq('dia','Geral').maybeSingle();if(!row)return;const {data:{user}}=await _supabase.auth.getUser();const {data:ultimo}=await _supabase.from('treino_versoes').select('versao').eq('treino_id',row.id).order('versao',{ascending:false}).limit(1).maybeSingle();const versao=(ultimo?.versao||0)+1;await _supabase.from('treino_versoes').insert({treino_id:row.id,aluno_id:alunoId,versao,motivo,snapshot:{treino:row,ficha:fichaAtual(),objetivo:document.getElementById('tr_objetivo')?.value||'',objetivo_desc:document.getElementById('tr_objetivo_desc')?.value||''},created_by:user?.id||null});await _supabase.from('treinos_alunos').update({versao,ultima_atualizacao_em:new Date().toISOString(),inicio_em:row.inicio_em||row.created_at?.slice(0,10)||new Date().toISOString().slice(0,10),reavaliar_em:new Date(Date.now()+90*86400000).toISOString().slice(0,10)}).eq('id',row.id);}catch(err){console.warn('[V2] versionamento:',err.message)}
}
window.abrirHistoricoVersoesTreino=async function(){const alunoId=document.getElementById('tr_aluno_id')?.value;const box=document.getElementById('listaVersoesV2');document.getElementById('modalVersoesV2').style.display='flex';box.innerHTML='Carregando versões...';const {data,error}=await _supabase.from('treino_versoes').select('*').eq('aluno_id',alunoId).order('versao',{ascending:false});if(error){box.innerHTML=`<div style="color:var(--danger)">${esc(error.message)}</div>`;return}box.innerHTML=(data||[]).map(v=>`<div style="padding:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:10px;align-items:center"><div><strong>Versão ${v.versao}</strong> <span style="color:var(--gray);font-size:.72rem">${new Date(v.created_at).toLocaleString('pt-BR')}</span><div style="font-size:.72rem;color:var(--gray)">${esc(v.motivo||'Salvamento')}</div></div><button class="btn-action-bar" onclick="restaurarVersaoV2('${v.id}')">↩ Restaurar</button></div>`).join('')||'<div style="color:var(--gray)">Nenhuma versão registrada ainda.</div>';};
window.restaurarVersaoV2=async function(id){const {data,error}=await _supabase.from('treino_versoes').select('*').eq('id',id).single();if(error)return showToast(error.message,'error');const snap=data.snapshot||{};if(snap.ficha){exerciciosFichaMemoria=JSON.parse(JSON.stringify(snap.ficha));renderizarTabelaExerciciosFicha()}if(snap.objetivo)document.getElementById('tr_objetivo').value=snap.objetivo;if(document.getElementById('tr_objetivo_desc'))document.getElementById('tr_objetivo_desc').value=snap.objetivo_desc||'';fecharModalV2('modalVersoesV2');showToast('Versão restaurada em memória. Revise e clique em Salvar Treino.')};

// ----------------------------------------------------------------
// DUPLICAÇÃO DE TREINO
// ----------------------------------------------------------------
let duplicarCache=[];
window.abrirDuplicarTreino=async function(){const atual=document.getElementById('tr_aluno_id')?.value;document.getElementById('modalDuplicarV2').style.display='flex';const {data,error}=await _supabase.from('treinos_alunos').select('id,aluno_id,conteudo,objetivo,alunos(nome)').eq('dia','Geral').neq('aluno_id',atual);if(error)return showToast(error.message,'error');duplicarCache=data||[];renderDuplicarV2(duplicarCache)};
function renderDuplicarV2(lista){const box=document.getElementById('listaDuplicarV2');box.innerHTML=(lista||[]).map(t=>`<div style="padding:10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:10px;align-items:center"><div><strong>${esc(t.alunos?.nome||'Aluno')}</strong><div style="font-size:.72rem;color:var(--gray)">${esc(t.objetivo||'Treino cadastrado')}</div></div><button class="btn-action-bar" onclick="copiarTreinoV2('${t.id}')">Copiar para este aluno</button></div>`).join('')||'<div style="color:var(--gray)">Nenhum outro treino encontrado.</div>'}
window.filtrarListaDuplicarV2=()=>{const q=document.getElementById('buscaDuplicarV2').value.toLowerCase();renderDuplicarV2(duplicarCache.filter(t=>(t.alunos?.nome||'').toLowerCase().includes(q)))};
window.copiarTreinoV2=async id=>{const t=duplicarCache.find(x=>String(x.id)===String(id));if(!t)return;const c=parseMaybeJSON(t.conteudo);const ficha=c.exercicios||c.ficha||c;if(!ficha||typeof ficha!=='object')return showToast('Treino de origem não possui estrutura compatível.','warning');exerciciosFichaMemoria=JSON.parse(JSON.stringify(ficha));for(const k of ['A','B','C','D','E'])if(!Array.isArray(exerciciosFichaMemoria[k]))exerciciosFichaMemoria[k]=[];renderizarTabelaExerciciosFicha();fecharModalV2('modalDuplicarV2');showToast('Treino copiado em memória. Personalize antes de salvar.')};

// ----------------------------------------------------------------
// EDITOR PROFISSIONAL DE ITEM + PROGRESSÃO + SUBSTITUIÇÃO
// ----------------------------------------------------------------
let editorNovoExercicio=null;
window.adicionarExercicioDiretoFicha = function(nomeExercicio,dadosExercicioCompleto=null){editorNovoExercicio=dadosExercicioCompleto||{nome:nomeExercicio};abrirEditorItemV2(-1,editorNovoExercicio)};
window.adicionarExercicioDiretoFichaPorIndice=function(indice){const ex=window._cacheSelecaoExercicios?.[indice];if(ex)window.adicionarExercicioDiretoFicha(ex.nome,ex)};
window.abrirEditorItemV2=async function(indice,novo=null){
  const lista=fichaAtual()[blocoAtual()]||[];const item=indice>=0?lista[indice]:null;
  if(item?.tipo_item==='conjugado')return window.editarConjugadoIntegradoV3(indice);
  const ex=novo||item||{};document.getElementById('editorItemIndiceV2').value=String(indice);document.getElementById('editorItemBibliotecaIdV2').value=ex.biblioteca_id||ex.id||'';document.getElementById('editorItemNomeV2').value=ex.exercicio||ex.nome||'';document.getElementById('editorItemSeriesV2').value=ex.series||'3';document.getElementById('editorItemRepsV2').value=ex.reps||'10-12';document.getElementById('editorItemCargaV2').value=ex.carga||'A definir';document.getElementById('editorItemMetodoV2').value=ex.metodo||'Tradicional';document.getElementById('editorItemDescansoV2').value=ex.descanso||'60s';document.getElementById('editorItemRirV2').value=ex.rir??'2';document.getElementById('editorItemRpeV2').value=ex.rpe??'8';document.getElementById('editorItemCadenciaV2').value=ex.cadencia||'';document.getElementById('editorItemAquecimentoV2').value=String(!!ex.aquecimento);document.getElementById('editorItemFalhaV2').value=ex.falha||'nao';document.getElementById('editorItemObsV2').value=ex.observacao||'';document.getElementById('editorItemTituloV2').textContent=indice>=0?'Editar Prescrição do Exercício':'Adicionar Exercício ao Treino';document.getElementById('modalEditorItemV2').style.display='flex';await carregarSugestaoProgressaoV2(ex.biblioteca_id||ex.id||null,ex.exercicio||ex.nome||'');
};
async function carregarSugestaoProgressaoV2(bibliotecaId,nome){const box=document.getElementById('sugestaoProgressaoV2');box.style.display='none';const alunoId=document.getElementById('tr_aluno_id')?.value;if(!alunoId)return;try{let q=_supabase.from('treino_execucoes').select('*').eq('aluno_id',alunoId).order('executado_em',{ascending:false}).limit(3);if(bibliotecaId)q=q.eq('biblioteca_exercicio_id',bibliotecaId);else q=q.eq('exercicio_nome',nome);const {data}=await q;if(!data?.length)return;const ok=data.filter(x=>Number(x.rpe||10)<=8).length>=2;if(ok){box.style.display='block';box.innerHTML='📈 <strong style="color:var(--success)">Sugestão de progressão:</strong> as últimas execuções registradas apresentaram esforço controlado (RPE ≤ 8). O professor pode avaliar aumento gradual de carga ou repetições.'}}catch{} }
window.salvarEditorItemV2=function(){const indice=Number(document.getElementById('editorItemIndiceV2').value);const item={tipo_item:'simples',biblioteca_id:document.getElementById('editorItemBibliotecaIdV2').value||null,exercicio:document.getElementById('editorItemNomeV2').value,series:document.getElementById('editorItemSeriesV2').value,reps:document.getElementById('editorItemRepsV2').value,carga:document.getElementById('editorItemCargaV2').value,metodo:document.getElementById('editorItemMetodoV2').value,descanso:document.getElementById('editorItemDescansoV2').value,rir:document.getElementById('editorItemRirV2').value,rpe:document.getElementById('editorItemRpeV2').value,cadencia:document.getElementById('editorItemCadenciaV2').value,aquecimento:document.getElementById('editorItemAquecimentoV2').value==='true',falha:document.getElementById('editorItemFalhaV2').value,observacao:document.getElementById('editorItemObsV2').value};const b=blocoAtual();if(!Array.isArray(exerciciosFichaMemoria[b]))exerciciosFichaMemoria[b]=[];if(indice>=0)exerciciosFichaMemoria[b][indice]={...exerciciosFichaMemoria[b][indice],...item};else exerciciosFichaMemoria[b].push(item);fecharModalV2('modalEditorItemV2');document.getElementById('modalSelecaoCompletaTreino')?.remove();renderizarTabelaExerciciosFicha();showToast(indice>=0?'Exercício atualizado.':'Exercício adicionado.')};
window.substituirItemTreinoV2=async function(index){const item=fichaAtual()[blocoAtual()]?.[index];if(!item||item.tipo_item==='conjugado')return showToast('Edite exercícios conjugados individualmente pelo bloco.','warning');let grupo=null,meta={};try{if(item.biblioteca_id){const {data}=await _supabase.from('biblioteca_exercicios').select('*').eq('id',item.biblioteca_id).maybeSingle();grupo=data?.grupo_principal;meta=data?.metadata||{}}const {data:list,error}=await _supabase.from('biblioteca_exercicios').select('*').neq('id',item.biblioteca_id||'00000000-0000-0000-0000-000000000000').order('nome');if(error)throw error;const evitar=(V2.anamnese?.exercicios_evitar||[]).map(x=>x.toLowerCase());const scored=(list||[]).map(e=>{const m=e.metadata||{};let s=0;if(grupo&&e.grupo_principal===grupo)s+=5;if(meta.padrao_movimento&&m.padrao_movimento===meta.padrao_movimento)s+=4;if(e.equipamento===meta.equipamento_alternativo||e.equipamento===item.equipamento)s+=1;if(evitar.some(v=>(e.nome||'').toLowerCase().includes(v)))s-=100;return{e,s}}).filter(x=>x.s>-50).sort((a,b)=>b.s-a.s).slice(0,12);document.getElementById('listaSubstituicoesV2').innerHTML=scored.map(({e,s})=>`<div style="padding:10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:10px;align-items:center"><div><strong>${esc(e.nome)}</strong><div style="font-size:.7rem;color:var(--gray)">${esc(e.grupo_principal||'')} • ${esc(e.equipamento||'')} ${s>=5?'• alta compatibilidade':''}</div></div><button class="btn-action-bar" onclick="aplicarSubstituicaoV2(${index},'${e.id}')">Substituir</button></div>`).join('')||'<div style="color:var(--gray)">Nenhuma alternativa compatível encontrada.</div>';document.getElementById('modalSubstituirV2').style.display='flex'}catch(err){showToast(err.message,'error')}};
window.aplicarSubstituicaoV2=async function(index,id){const {data:e,error}=await _supabase.from('biblioteca_exercicios').select('*').eq('id',id).single();if(error)return showToast(error.message,'error');const antigo=exerciciosFichaMemoria[blocoAtual()][index];exerciciosFichaMemoria[blocoAtual()][index]={...antigo,biblioteca_id:e.id,exercicio:e.nome};fecharModalV2('modalSubstituirV2');renderizarTabelaExerciciosFicha();showToast('Exercício substituído. Prescrição de séries/reps foi preservada.')};
window.abrirRegistroExecucaoV2=function(index){const item=fichaAtual()[blocoAtual()]?.[index];if(!item||item.tipo_item==='conjugado')return showToast('Registre execuções dos exercícios simples individualmente.','warning');document.getElementById('execIndiceV2').value=index;document.getElementById('execCargaV2').value=item.carga||'';document.getElementById('execRepsV2').value=item.reps||'';document.getElementById('execRpeV2').value=item.rpe||'8';document.getElementById('execObsV2').value='';document.getElementById('modalExecucaoV2').style.display='flex'};
window.salvarExecucaoV2=async function(){const idx=Number(document.getElementById('execIndiceV2').value);const item=fichaAtual()[blocoAtual()]?.[idx];const alunoId=document.getElementById('tr_aluno_id')?.value;const {error}=await _supabase.from('treino_execucoes').insert({aluno_id:alunoId,biblioteca_exercicio_id:item.biblioteca_id||null,exercicio_nome:item.exercicio,treino_bloco:blocoAtual(),carga_realizada:document.getElementById('execCargaV2').value,repeticoes_realizadas:document.getElementById('execRepsV2').value,rpe:Number(document.getElementById('execRpeV2').value),observacao:document.getElementById('execObsV2').value});if(error)return showToast(error.message,'error');fecharModalV2('modalExecucaoV2');showToast('Execução registrada. Esse histórico alimentará sugestões de progressão.')};


// ----------------------------------------------------------------
// CONJUGADOS V3 — INTEGRADOS À PRÓPRIA MONTAGEM
// ----------------------------------------------------------------
function metodoConjugadoAutomaticoV3(qtd){
  if(qtd===2)return 'Bi-set';
  if(qtd===3)return 'Tri-set';
  return 'Circuito';
}
function obterModalConjugadoV3(){
  let modal=document.getElementById('modalConjugadoIntegradoV3');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='modalConjugadoIntegradoV3';
  modal.className='modal-overlay';
  modal.style.cssText='display:none;z-index:7900;align-items:center;justify-content:center;';
  modal.innerHTML=`
    <div class="modal-card" style="max-width:900px;width:100%;max-height:92vh;overflow:auto;">
      <div class="card-header">
        <div>
          <h3 id="conjV3Titulo" style="margin:0;">🔗 Organizar Conjugado</h3>
          <div id="conjV3Subtitulo" style="font-size:.72rem;color:var(--gray);margin-top:3px;"></div>
        </div>
        <button class="btn-action-bar" onclick="fecharConjugadoIntegradoV3()">✕</button>
      </div>
      <input type="hidden" id="conjV3IndiceBase">
      <input type="hidden" id="conjV3Modo" value="criar">
      <div id="conjV3Conteudo"></div>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}
window.fecharConjugadoIntegradoV3=function(){
  const modal=document.getElementById('modalConjugadoIntegradoV3');
  if(modal)modal.style.display='none';
};
window.abrirConjugarIntegradoV3=function(index){
  const lista=fichaAtual()[blocoAtual()]||[];
  const base=lista[index];
  if(!base)return;
  if(base.tipo_item==='conjugado')return window.editarConjugadoIntegradoV3(index);

  const candidatos=lista
    .map((item,i)=>({item,i}))
    .filter(x=>x.i!==index && x.item?.tipo_item!=='conjugado');

  if(!candidatos.length){
    showToast('Adicione outro exercício simples ao bloco para criar um conjugado.','warning');
    return;
  }

  const modal=obterModalConjugadoV3();
  document.getElementById('conjV3IndiceBase').value=String(index);
  document.getElementById('conjV3Modo').value='criar';
  document.getElementById('conjV3Titulo').textContent='🔗 Agrupar exercícios';
  document.getElementById('conjV3Subtitulo').innerHTML=`Treino ${esc(blocoAtual())} • exercício base: <strong style="color:var(--text-color)">${esc(base.exercicio)}</strong>`;

  document.getElementById('conjV3Conteudo').innerHTML=`
    <div style="padding:11px;border:1px solid rgba(255,152,0,.22);background:rgba(255,152,0,.06);border-radius:11px;margin-bottom:12px;font-size:.74rem;color:var(--gray);">
      Selecione os exercícios que serão executados em sequência com <strong style="color:var(--text-color)">${esc(base.exercicio)}</strong>.
      O descanso será realizado somente depois de concluir o conjunto.
    </div>
    <div class="form-grid" style="margin-bottom:12px;">
      <div class="form-group">
        <label class="form-label">Método</label>
        <select id="conjV3Metodo" class="form-control">
          <option value="auto">Automático pelo número de exercícios</option>
          <option value="Bi-set">Bi-set</option>
          <option value="Tri-set">Tri-set</option>
          <option value="Superset">Superset</option>
          <option value="Circuito">Circuito</option>
          <option value="Série Combinada">Série Combinada</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Séries do bloco</label>
        <input id="conjV3Series" class="form-control" value="${esc(base.series||'3')}">
      </div>
      <div class="form-group">
        <label class="form-label">Descanso após o conjunto</label>
        <input id="conjV3Descanso" class="form-control" value="${esc(base.descanso||'60s')}">
      </div>
      <div class="form-group">
        <label class="form-label">Observação</label>
        <input id="conjV3Obs" class="form-control" value="Executar em sequência; descansar somente após concluir o bloco.">
      </div>
    </div>
    <div style="font-size:.76rem;font-weight:800;margin-bottom:8px;">Exercícios disponíveis neste Treino ${esc(blocoAtual())}</div>
    <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;">
      ${candidatos.map(({item,i})=>`
        <label style="display:flex;gap:10px;align-items:center;padding:11px;border-bottom:1px solid var(--border);cursor:pointer;">
          <input type="checkbox" class="conjV3Check" value="${i}">
          <span style="flex:1;">
            <strong style="font-size:.78rem;">${esc(item.exercicio||'-')}</strong>
            <small style="display:block;color:var(--gray);margin-top:2px;">${esc(item.series||'-')} séries • ${esc(item.reps||'-')} reps • ${esc(item.carga||'A definir')}</small>
          </span>
        </label>`).join('')}
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
      <button class="btn-action-bar" onclick="fecharConjugadoIntegradoV3()">Cancelar</button>
      <button class="btn" onclick="salvarConjugacaoIntegradaV3()">🔗 Agrupar selecionados</button>
    </div>`;
  modal.style.display='flex';
};
window.salvarConjugacaoIntegradaV3=function(){
  const bloco=blocoAtual();
  const lista=exerciciosFichaMemoria[bloco]||[];
  const indiceBase=Number(document.getElementById('conjV3IndiceBase').value);
  const selecionados=[...document.querySelectorAll('.conjV3Check:checked')].map(x=>Number(x.value));
  if(!selecionados.length)return showToast('Selecione pelo menos mais um exercício.','warning');

  const indices=[indiceBase,...selecionados].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);
  if(indices.length>5)return showToast('Use no máximo 5 exercícios no mesmo bloco conjugado.','warning');

  const itens=indices.map(i=>lista[i]).filter(Boolean);
  if(itens.some(x=>x.tipo_item==='conjugado'))return showToast('Desfaça o conjugado existente antes de reagrupar.','warning');

  const metodoEscolhido=document.getElementById('conjV3Metodo').value;
  const metodo=metodoEscolhido==='auto'?metodoConjugadoAutomaticoV3(itens.length):metodoEscolhido;
  const series=document.getElementById('conjV3Series').value||itens[0]?.series||'3';
  const descanso=document.getElementById('conjV3Descanso').value||itens[0]?.descanso||'60s';
  const observacao=document.getElementById('conjV3Obs').value||'Executar em sequência; descansar somente após concluir o bloco.';

  const filhos=itens.map((item,ordem)=>({
    biblioteca_id:item.biblioteca_id||null,
    exercicio:item.exercicio,
    reps:item.reps||'-',
    carga:item.carga||'A definir',
    ordem:ordem+1,
    rir:item.rir??null,
    rpe:item.rpe??null,
    cadencia:item.cadencia||''
  }));

  const conjugado={
    tipo_item:'conjugado',
    exercicio:filhos.map(x=>x.exercicio).join(' + '),
    series,
    reps:filhos.map(x=>x.reps).join(' + '),
    carga:'Individual por exercício',
    metodo,
    descanso,
    observacao,
    conjugado:filhos,
    origem_prescricao:'ajuste_professor',
    revisao_professor:true
  };

  const pos=indices[0];
  [...indices].sort((a,b)=>b-a).forEach(i=>lista.splice(i,1));
  lista.splice(pos,0,conjugado);

  fecharConjugadoIntegradoV3();
  renderizarTabelaExerciciosFicha();
  showToast(`${metodo} criado com ${filhos.length} exercícios.`);
};
window.desfazerConjugadoIntegradoV3=async function(index){
  const lista=fichaAtual()[blocoAtual()]||[];
  const item=lista[index];
  if(!item||item.tipo_item!=='conjugado'||!Array.isArray(item.conjugado))return;
  const ok=await window.CorpofitnessUI.confirmar('Desfazer conjugado',`Desfazer "${item.exercicio}" e voltar os exercícios para itens individuais?`,{perigo:false,confirmar:'Desfazer'});
  if(!ok)return;

  const simples=item.conjugado.map(sub=>({
    tipo_item:'simples',
    biblioteca_id:sub.biblioteca_id||null,
    exercicio:sub.exercicio,
    series:item.series||'3',
    reps:sub.reps||'-',
    carga:sub.carga||'A definir',
    metodo:'Tradicional',
    descanso:item.descanso||'60s',
    rir:sub.rir??item.rir??'',
    rpe:sub.rpe??item.rpe??'',
    cadencia:sub.cadencia||item.cadencia||'',
    observacao:'',
    origem_prescricao:'ajuste_professor',
    revisao_professor:true
  }));

  lista.splice(index,1,...simples);
  renderizarTabelaExerciciosFicha();
  showToast('Conjugado desfeito. Os exercícios voltaram a ser individuais.');
};
window.editarConjugadoIntegradoV3=function(index){
  const lista=fichaAtual()[blocoAtual()]||[];
  const item=lista[index];
  if(!item||item.tipo_item!=='conjugado'||!Array.isArray(item.conjugado))return;

  const modal=obterModalConjugadoV3();
  document.getElementById('conjV3IndiceBase').value=String(index);
  document.getElementById('conjV3Modo').value='editar';
  document.getElementById('conjV3Titulo').textContent='✏️ Editar bloco conjugado';
  document.getElementById('conjV3Subtitulo').textContent=`Treino ${blocoAtual()} • ${item.exercicio}`;

  document.getElementById('conjV3Conteudo').innerHTML=`
    <div class="form-grid" style="margin-bottom:12px;">
      <div class="form-group">
        <label class="form-label">Método</label>
        <select id="conjEditMetodoV3" class="form-control">
          ${['Bi-set','Tri-set','Superset','Circuito','Série Combinada','Conjugado'].map(v=>`<option ${v===item.metodo?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Séries</label><input id="conjEditSeriesV3" class="form-control" value="${esc(item.series||'3')}"></div>
      <div class="form-group"><label class="form-label">Descanso após o bloco</label><input id="conjEditDescansoV3" class="form-control" value="${esc(item.descanso||'60s')}"></div>
      <div class="form-group"><label class="form-label">Observação</label><input id="conjEditObsV3" class="form-control" value="${esc(item.observacao||'')}"></div>
    </div>
    <div style="font-size:.76rem;font-weight:800;margin-bottom:8px;">Exercícios do bloco</div>
    <div style="display:grid;gap:8px;">
      ${item.conjugado.map((sub,j)=>`
        <div style="border:1px solid var(--border);border-radius:11px;padding:10px;">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
            <span style="width:28px;height:28px;border-radius:9px;background:rgba(255,152,0,.12);color:var(--warning);display:grid;place-items:center;font-size:.7rem;font-weight:900;">${j+1}</span>
            <strong style="font-size:.78rem;">${esc(sub.exercicio)}</strong>
          </div>
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Repetições</label><input class="form-control conjEditRepsV3" data-i="${j}" value="${esc(sub.reps||'-')}"></div>
            <div class="form-group"><label class="form-label">Carga</label><input class="form-control conjEditCargaV3" data-i="${j}" value="${esc(sub.carga||'A definir')}"></div>
          </div>
        </div>`).join('')}
    </div>
    <div style="margin-top:10px;font-size:.7rem;color:var(--gray);">
      Para trocar a composição do bloco, use <strong style="color:var(--warning);">Desfazer conjugado</strong> e reagrupe os exercícios desejados na própria tabela.
    </div>
    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:14px;flex-wrap:wrap;">
      <button class="btn-action-bar" style="color:var(--warning)" onclick="fecharConjugadoIntegradoV3();desfazerConjugadoIntegradoV3(${index})">🔓 Desfazer conjugado</button>
      <div style="display:flex;gap:8px;">
        <button class="btn-action-bar" onclick="fecharConjugadoIntegradoV3()">Cancelar</button>
        <button class="btn" onclick="salvarEdicaoConjugadoIntegradoV3(${index})">Salvar alterações</button>
      </div>
    </div>`;
  modal.style.display='flex';
};
window.salvarEdicaoConjugadoIntegradoV3=function(index){
  const lista=fichaAtual()[blocoAtual()]||[];
  const item=lista[index];
  if(!item||item.tipo_item!=='conjugado')return;
  const reps=[...document.querySelectorAll('.conjEditRepsV3')];
  const cargas=[...document.querySelectorAll('.conjEditCargaV3')];

  item.metodo=document.getElementById('conjEditMetodoV3').value||item.metodo;
  item.series=document.getElementById('conjEditSeriesV3').value||item.series;
  item.descanso=document.getElementById('conjEditDescansoV3').value||item.descanso;
  item.observacao=document.getElementById('conjEditObsV3').value||'';
  item.conjugado=item.conjugado.map((sub,j)=>({
    ...sub,
    reps:reps.find(x=>Number(x.dataset.i)===j)?.value||sub.reps,
    carga:cargas.find(x=>Number(x.dataset.i)===j)?.value||sub.carga,
    ordem:j+1
  }));
  item.exercicio=item.conjugado.map(x=>x.exercicio).join(' + ');
  item.reps=item.conjugado.map(x=>x.reps).join(' + ');
  item.carga='Individual por exercício';
  item.origem_prescricao=item.origem_prescricao||'ajuste_professor';
  item.revisao_professor=true;

  fecharConjugadoIntegradoV3();
  renderizarTabelaExerciciosFicha();
  showToast('Bloco conjugado atualizado.');
};


// Renderer V3: conjugados são criados/editados/desfeitos dentro da própria montagem.
window.renderizarTabelaExerciciosFicha=function(){
  const tbody=document.getElementById('tabelaExerciciosFichaBody');
  if(!tbody)return;
  const lista=fichaAtual()[blocoAtual()]||[];
  tbody.classList.remove('skeleton-loading');

  if(!lista.length){
    tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--gray)">Nenhum exercício no Treino ${esc(blocoAtual())}.</td></tr>`;
    return;
  }

  tbody.innerHTML=lista.map((item,index)=>{
    const conj=item?.tipo_item==='conjugado'&&Array.isArray(item.conjugado)&&item.conjugado.length>=2;
    let nome=esc(item.exercicio||'-');

    if(conj){
      nome=`<div>
        <span style="background:rgba(255,152,0,.15);color:var(--warning);border:1px solid rgba(255,152,0,.22);border-radius:999px;padding:3px 7px;font-size:.64rem;font-weight:800;">🔗 ${esc(item.metodo||'CONJUGADO').toUpperCase()}</span>
        <strong style="display:block;margin-top:6px">${nome}</strong>
        ${item.conjugado.map((s,i)=>`
          <div style="font-size:.7rem;color:var(--gray);margin-top:4px;display:flex;gap:6px;align-items:center;">
            <span style="min-width:26px;color:var(--warning);font-weight:900;">${String.fromCharCode(65+index)}${i+1}</span>
            <span><strong style="color:var(--text-color)">${esc(s.exercicio)}</strong> • ${esc(s.reps||'-')} reps • ${esc(s.carga||'A definir')}</span>
          </div>`).join('')}
      </div>`;
    }

    const detalhes=[
      item.descanso?`⏱ ${esc(item.descanso)}`:'',
      item.rir?`RIR ${esc(item.rir)}`:'',
      item.rpe?`RPE ${esc(item.rpe)}`:'',
      item.cadencia?`Tempo ${esc(item.cadencia)}`:''
    ].filter(Boolean).join(' • ');

    const acoes=conj
      ? `<button class="btn-action-bar" onclick="editarConjugadoIntegradoV3(${index})" title="Editar bloco conjugado">✏️</button>
         <button class="btn-action-bar" onclick="desfazerConjugadoIntegradoV3(${index})" title="Desfazer conjugado" style="color:var(--warning)">🔓</button>`
      : `<button class="btn-action-bar" onclick="abrirEditorItemV2(${index})" title="Editar prescrição">✏️</button>
         <button class="btn-action-bar" onclick="abrirConjugarIntegradoV3(${index})" title="Agrupar com outro exercício" style="color:var(--warning)">🔗</button>
         <button class="btn-action-bar" onclick="substituirItemTreinoV2(${index})" title="Substituir exercício">🔄</button>
         <button class="btn-action-bar" onclick="abrirRegistroExecucaoV2(${index})" title="Registrar execução">✅</button>`;

    return `<tr style="${conj?'background:rgba(255,152,0,.02)':''}">
      <td>${nome}${detalhes?`<div style="font-size:.66rem;color:var(--gray);margin-top:5px">${detalhes}</div>`:''}</td>
      <td>${esc(item.series||'-')}</td>
      <td>${esc(item.reps||'-')}</td>
      <td>${esc(item.carga||'-')}</td>
      <td><span style="font-size:.72rem;color:${conj?'var(--warning)':'var(--primary-light)'}">${esc(item.metodo||'Tradicional')}</span></td>
      <td style="text-align:right;white-space:nowrap">${acoes}<button class="btn-action-bar btn-danger" onclick="removerExercicioDaFicha(${index})" title="Remover">🗑️</button></td>
    </tr>`;
  }).join('');
};

// ----------------------------------------------------------------
// BIBLIOTECA V2: metadata
// ----------------------------------------------------------------
const formEx=document.getElementById('formExercicioDinamico');
if(formEx && !formEx.dataset.v2Owned){
  formEx.dataset.v2Owned='1';
  formEx.addEventListener('submit',async e=>{
    // listener em captura assume o fluxo e impede listeners legados remanescentes
    e.preventDefault();e.stopImmediatePropagation();
    const id=document.getElementById('exercicioId').value;const nome=document.getElementById('exercicioNome').value.trim();if(!nome)return showToast('Informe o nome do exercício.','warning');const btn=document.getElementById('btnSalvarExercicio');btn.disabled=true;btn.textContent='⏳ Salvando...';
    try{let videoUrl=document.getElementById('exercicioVideo').value||normalizarLinkVideo(document.getElementById('exercicioVideoUrl')?.value||'')||null;const file=document.getElementById('exercicioVideoFile')?.files?.[0];if(file)videoUrl=await uploadVideoToStorage(file,nome);const metadata={dificuldade:document.getElementById('exercicioDificuldade')?.value||'Intermediário',padrao_movimento:document.getElementById('exercicioPadrao')?.value||'Outros',lateralidade:document.getElementById('exercicioLateralidade')?.value||'Bilateral',musculos_secundarios:(document.getElementById('exercicioSecundarios')?.value||'').split(',').map(s=>s.trim()).filter(Boolean),tags:(document.getElementById('exercicioTags')?.value||'').split(',').map(s=>s.trim()).filter(Boolean),observacoes_tecnicas:document.getElementById('exercicioObservacoes')?.value||''};const payload={nome,grupo_principal:document.getElementById('exercicioGrupo').value,equipamento:document.getElementById('exercicioEquipamento').value,tipo:document.getElementById('exercicioTipo').value,video_url:videoUrl,metadata};const res=id!=='-1'?await _supabase.from('biblioteca_exercicios').update(payload).eq('id',id):await _supabase.from('biblioteca_exercicios').insert(payload);if(res.error)throw res.error;fecharFormExercicio();carregarBiblioteca();showToast('Exercício salvo com metadados inteligentes!')}catch(err){showToast(err.message,'error')}finally{btn.disabled=false;btn.textContent='Salvar Exercício no Supabase'}
  },true);
}
const editarExOriginal=window.editarExercicio;
window.editarExercicio=async function(id){await editarExOriginal(id);try{const {data}=await _supabase.from('biblioteca_exercicios').select('metadata').eq('id',id).single();const m=data?.metadata||{};if(document.getElementById('exercicioDificuldade'))document.getElementById('exercicioDificuldade').value=m.dificuldade||'Intermediário';if(document.getElementById('exercicioPadrao'))document.getElementById('exercicioPadrao').value=m.padrao_movimento||'Outros';if(document.getElementById('exercicioLateralidade'))document.getElementById('exercicioLateralidade').value=m.lateralidade||'Bilateral';if(document.getElementById('exercicioSecundarios'))document.getElementById('exercicioSecundarios').value=(m.musculos_secundarios||[]).join(', ');if(document.getElementById('exercicioTags'))document.getElementById('exercicioTags').value=(m.tags||[]).join(', ');if(document.getElementById('exercicioObservacoes'))document.getElementById('exercicioObservacoes').value=m.observacoes_tecnicas||''}catch{}};

// ----------------------------------------------------------------
// PRESCRIÇÃO ASSISTIDA V2: considera anamnese e metadata
// ----------------------------------------------------------------
const gerarOriginal=window.gerarPreTreinoAssistido;
if(typeof gerarOriginal==='function'){
  window.gerarPreTreinoAssistido=async function(opcoes={}){const alunoId=document.getElementById('tr_aluno_id')?.value;if(alunoId)await carregarAnamnese(alunoId);const res=await gerarOriginal(opcoes);if(V2.anamnese){const evitar=(V2.anamnese.exercicios_evitar||[]).map(v=>String(v).toLowerCase());for(const b of Object.keys(fichaAtual())){if(!Array.isArray(exerciciosFichaMemoria[b]))continue;exerciciosFichaMemoria[b]=exerciciosFichaMemoria[b].filter(item=>!evitar.some(v=>String(item.exercicio||'').toLowerCase().includes(v)));}renderizarTabelaExerciciosFicha();const painel=document.getElementById('textoAnalisePreTreino');if(painel) painel.innerHTML += `<div style="margin-top:6px;color:var(--success)">✓ Anamnese considerada: frequência ${esc(V2.anamnese.frequencia_semanal||'-')}x/semana, tempo ${esc(V2.anamnese.tempo_sessao_min||'-')} min e lista de exercícios a revisar.</div>`;}return res;};
}

// V6: abertura e salvamento públicos consolidados mais abaixo.


// ----------------------------------------------------------------
// ALERTAS INTELIGENTES NO DASHBOARD
// ----------------------------------------------------------------
async function carregarAlertasV2(){const alvo=document.getElementById('tab-dashboard');if(!alvo||document.getElementById('cardAlertasInteligentesV2'))return;const card=document.createElement('div');card.id='cardAlertasInteligentesV2';card.className='card';card.style.border='1px solid rgba(30,136,229,.35)';card.innerHTML='<div class="card-header"><h3>🧭 Central de Pendências</h3><span id="badgeAlertasV2" class="status-badge status-respondido">Analisando...</span></div><div id="listaAlertasV2" style="display:grid;gap:8px"></div>';alvo.appendChild(card);try{const [{data:alunos},{data:treinos},{data:avals}]=await Promise.all([_supabase.from('alunos').select('id,nome,status').is('arquivado_em',null),_supabase.from('treinos_alunos').select('aluno_id,created_at,reavaliar_em').eq('dia','Geral'),_supabase.from('avaliacoes_fisicas').select('aluno_id,created_at')]);const tmap=new Map((treinos||[]).map(t=>[String(t.aluno_id),t]));const amap=new Map();(avals||[]).forEach(a=>{const k=String(a.aluno_id);if(!amap.has(k)||new Date(a.created_at)>new Date(amap.get(k).created_at))amap.set(k,a)});const alerts=[];for(const a of alunos||[]){if(String(a.status||'Ativo').toLowerCase().includes('bloque'))continue;const t=tmap.get(String(a.id)),av=amap.get(String(a.id));if(!t)alerts.push({tipo:'Treino ausente',nome:a.nome,cor:'var(--danger)'});if(!av)alerts.push({tipo:'Sem avaliação corporal',nome:a.nome,cor:'var(--warning)'});else if(Date.now()-new Date(av.created_at).getTime()>90*86400000)alerts.push({tipo:'Avaliação > 90 dias',nome:a.nome,cor:'var(--warning)'});if(t){const limite=t.reavaliar_em?new Date(t.reavaliar_em):new Date(new Date(t.created_at).getTime()+90*86400000);if(limite<=new Date())alerts.push({tipo:'Treino para revisão',nome:a.nome,cor:'var(--primary-light)'})}}document.getElementById('badgeAlertasV2').textContent=`${alerts.length} alerta(s)`;document.getElementById('listaAlertasV2').innerHTML=alerts.slice(0,20).map(a=>`<div style="display:flex;justify-content:space-between;padding:8px 10px;border:1px solid var(--border);border-radius:9px"><span>${esc(a.nome)}</span><strong style="color:${a.cor};font-size:.75rem">${esc(a.tipo)}</strong></div>`).join('')||'<div style="color:var(--success)">✓ Nenhuma pendência crítica encontrada.</div>'}catch(err){document.getElementById('listaAlertasV2').innerHTML=`<div style="color:var(--warning)">Execute o SQL V2 para ativar todos os alertas. ${esc(err.message)}</div>`}}
setTimeout(carregarAlertasV2,1200);

// V6: backup seguro e restrito ao Master definido abaixo.


// ========================================================================
// ADMIN V6 — FUNDAÇÃO CONSOLIDADA
// ========================================================================
const getStaffV6=()=>{try{return JSON.parse(sessionStorage.getItem('corpofitness_logado')||'null')}catch{return null}};
const nivelV6=()=>String(getStaffV6()?.nivel||'').toLowerCase();
const isMasterV6=()=>nivelV6()==='master';
const podeTreinoV6=()=>['master','professor'].includes(nivelV6());

// ---------------------------- UI consistente ----------------------------
window.CorpofitnessUI=Object.freeze({
  confirmar(titulo,mensagem,opcoes={}){
    return new Promise(resolve=>{
      const old=document.getElementById('v6ConfirmOverlay');if(old)old.remove();
      const overlay=document.createElement('div');overlay.id='v6ConfirmOverlay';overlay.className='v6-confirm-overlay';
      const perigo=opcoes.perigo!==false;
      overlay.innerHTML=`<div class="v6-confirm-card" role="dialog" aria-modal="true"><h3>${esc(titulo||'Confirmar ação')}</h3><p>${esc(mensagem||'Deseja continuar?')}</p><div class="v6-confirm-actions"><button class="btn-action-bar" data-v6-cancel>Cancelar</button><button class="btn ${perigo?'btn-danger':''}" data-v6-ok>${esc(opcoes.confirmar||'Confirmar')}</button></div></div>`;
      const done=v=>{overlay.remove();resolve(v)};overlay.querySelector('[data-v6-cancel]').onclick=()=>done(false);overlay.querySelector('[data-v6-ok]').onclick=()=>done(true);overlay.onclick=e=>{if(e.target===overlay)done(false)};document.body.appendChild(overlay);overlay.querySelector('[data-v6-cancel]').focus();
    });
  },
  erro(msg){showToast(String(msg||'Erro inesperado'),'error')},
  aviso(msg){showToast(String(msg||''),'warning')}
});
// Native alert vira feedback não bloqueante e consistente.
window.alert=(msg)=>window.CorpofitnessUI.erro(msg);

// ----------------------- Exercícios em cache central --------------------
window.CorpofitnessExerciseStore={
  cache:null,loadedAt:0,ttl:180000,
  invalidate(){this.cache=null;this.loadedAt=0},
  async load(force=false){
    if(!force&&Array.isArray(this.cache)&&(Date.now()-this.loadedAt)<this.ttl)return this.cache;
    const {data,error}=await _supabase.from('biblioteca_exercicios').select('id,nome,grupo_principal,equipamento,tipo,video_url,metadata').order('nome',{ascending:true});
    if(error)throw error;this.cache=data||[];this.loadedAt=Date.now();window.bibliotecaGlobalAdmin=this.cache;return this.cache;
  },
  async byId(id){const all=await this.load();return all.find(x=>String(x.id)===String(id))||null},
  async byName(nome){const all=await this.load();const q=String(nome||'').trim().toLowerCase();return all.find(x=>String(x.nome||'').trim().toLowerCase()===q)||null},
  async search(q){const all=await this.load();const t=String(q||'').trim().toLowerCase();return !t?all:all.filter(x=>`${x.nome||''} ${x.grupo_principal||''} ${x.equipamento||''} ${x.tipo||''}`.toLowerCase().includes(t))}
};

const renderBibliotecaV6=async(force=false)=>{
  const tbody=document.getElementById('tabelaBibliotecaBody');if(!tbody)return;
  tbody.classList.add('skeleton-loading');
  try{
    const lista=await CorpofitnessExerciseStore.load(force);
    tbody.classList.remove('skeleton-loading');
    tbody.innerHTML=(lista||[]).map(ex=>{
      const nomeArg=esc(JSON.stringify(String(ex.nome||'')));
      const videoArg=esc(JSON.stringify(String(ex.video_url||'')));
      const idArg=esc(JSON.stringify(String(ex.id)));
      const video=ex.video_url?`<button onclick="abrirVideoDuvidaAdmin(${nomeArg},${videoArg})" class="btn-action-bar" style="background:var(--primary);color:#fff">🎥 Ver</button>`:'<span style="color:var(--gray)">Sem vídeo</span>';
      return `<tr><td><strong>${esc(ex.nome)}</strong></td><td>${esc(ex.grupo_principal||'Geral')}</td><td>${esc(ex.equipamento||'Livre')}</td><td>${esc(ex.tipo||'Composto')}</td><td>${video}</td><td style="text-align:right;white-space:nowrap"><button onclick="editarExercicio(${idArg})" class="btn-action-bar">✏️</button><button onclick="removerExercicio(${idArg})" class="btn-action-bar btn-danger">🗑️</button></td></tr>`;
    }).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--gray)">Nenhum exercício cadastrado.</td></tr>';
  }catch(err){tbody.classList.remove('skeleton-loading');tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--danger)">${esc(err.message)}</td></tr>`}
};
window.carregarBiblioteca=()=>renderBibliotecaV6(true);

// ---------------------- Mídia editorial no Storage ----------------------
window.CorpofitnessMedia={
  bucket:'corpofitness-media',
  pastaPorCampo:{profFoto:'professores',parceiroLogo:'parceiros',fotoImg:'galeria',bannerImg:'banners',cfgHeroVideo:'hero'},
  async upload(file,pasta='geral'){
    if(!isMasterV6())throw new Error('Somente o Master pode enviar mídias do site.');
    if(!file)throw new Error('Nenhum arquivo selecionado.');
    const ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'');
    const safeFolder=String(pasta||'geral').replace(/[^a-z0-9_-]/gi,'-');
    const path=`${safeFolder}/${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
    const {error}=await _supabase.storage.from(this.bucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});if(error)throw error;
    const {data}= _supabase.storage.from(this.bucket).getPublicUrl(path);return data.publicUrl;
  }
};
window.previewUploadImage=async function(input,previewImgId,hiddenInputId){
  const file=input.files?.[0];if(!file)return;const preview=document.getElementById(previewImgId);const hidden=document.getElementById(hiddenInputId);
  try{showToast('Enviando imagem para o armazenamento seguro...');let uploadFile=file;if(file.type.startsWith('image/')&&typeof compressImageFile==='function'&&!file.type.includes('svg')){try{const dataUrl=await compressImageFile(file,1600,1600,.82);const blob=await (await fetch(dataUrl)).blob();uploadFile=new File([blob],file.name,{type:blob.type||file.type})}catch{}}
    const url=await CorpofitnessMedia.upload(uploadFile,CorpofitnessMedia.pastaPorCampo[hiddenInputId]||'imagens');if(hidden)hidden.value=url;if(preview){preview.src=url;preview.parentElement.style.display='flex'}showToast('Imagem enviada com sucesso!')
  }catch(err){if(input)input.value='';CorpofitnessUI.erro(err.message)}
};
window.previewHeroFile=async function(input){const file=input.files?.[0];if(!file)return;const box=document.getElementById('heroPreviewBox'),video=document.getElementById('heroVideoPreview'),img=document.getElementById('heroImgPreview');try{showToast('Enviando mídia do Hero...');const url=await CorpofitnessMedia.upload(file,'hero');document.getElementById('cfgHeroVideo').value=url;box.style.display='flex';if(file.type.startsWith('video/')){video.src=url;video.style.display='block';img.style.display='none'}else{img.src=url;img.style.display='block';video.style.display='none'}showToast('Mídia do Hero enviada com sucesso!')}catch(err){input.value='';CorpofitnessUI.erro(err.message)}};

// -------------------- Exclusões, arquivamento e lixeira -----------------
async function excluirConteudoV6(tabela,id,label,loader){
  if(!isMasterV6())return CorpofitnessUI.aviso('Somente o Master pode excluir conteúdo do site.');
  const ok=await CorpofitnessUI.confirmar('Mover para a lixeira',`Deseja remover ${label}? O conteúdo poderá ser restaurado pela Lixeira Administrativa por 30 dias.`,{confirmar:'Mover para lixeira'});if(!ok)return;
  const {error}=await _supabase.from(tabela).delete().eq('id',id);if(error)return CorpofitnessUI.erro(error.message);if(typeof loader==='function')await loader();showToast('Item movido para a lixeira.');
}
window.removerPlano=id=>excluirConteudoV6('planos',id,'este plano',window.carregarPlanosAdmin);
window.removerParceiro=id=>excluirConteudoV6('parceiros',id,'este parceiro',window.carregarParceirosAdmin);
window.removerFoto=id=>excluirConteudoV6('galeria',id,'esta foto',window.carregarGaleria);
window.removerProf=id=>excluirConteudoV6('professores',id,'este professor',window.carregarProfessores);
window.removerNoticia=id=>excluirConteudoV6('noticias',id,'esta notícia',window.carregarNoticias);
window.removerBanner=id=>excluirConteudoV6('banners',id,'este banner',window.carregarBanners);
window.removerEstrutura=id=>excluirConteudoV6('estrutura',id,'este item de estrutura',window.carregarEstruturaAdmin);
window.removerModalidade=id=>excluirConteudoV6('modalidades',id,'esta modalidade',window.carregarModalidadesAdmin);
window.removerFeedback=id=>excluirConteudoV6('feedbacks',id,'este depoimento',window.carregarFeedbackAdmin);
window.removerFaq=id=>excluirConteudoV6('faq',id,'esta pergunta',window.carregarFaqAdmin);
window.removerAluno=async function(id){if(!isMasterV6())return CorpofitnessUI.aviso('Somente o Master pode arquivar alunos.');const ok=await CorpofitnessUI.confirmar('Arquivar aluno','O aluno será removido das listas operacionais e perderá acesso ao portal, mas seus treinos, avaliações e histórico serão preservados.',{confirmar:'Arquivar aluno'});if(!ok)return;const {data:{user}}=await _supabase.auth.getUser();const {error}=await _supabase.from('alunos').update({status:'Arquivado',arquivado_em:new Date().toISOString(),arquivado_por:user?.id||null}).eq('id',id);if(error)return CorpofitnessUI.erro(error.message);await carregarAlunosAdmin({pagina:window.alunosPaginaV6,busca:window.alunosBuscaV6});showToast('Aluno arquivado com histórico preservado.');};

window.toggleStatusAluno=async function(alunoId,controle){
  if(!['master','recepcao'].includes(nivelV6()))return CorpofitnessUI.aviso('Seu nível não permite alterar o cadastro do aluno.');
  const atual=controle?.dataset?.statusToggle||'';
  const novoStatus=atual==='ativo'?'Bloqueado':'Ativo';
  const {error}=await _supabase.from('alunos').update({status:novoStatus}).eq('id',alunoId);
  if(error)return CorpofitnessUI.erro(error.message);
  await carregarAlunosAdmin({pagina:window.alunosPaginaV6,busca:window.alunosBuscaV6});
  showToast(`Aluno ${novoStatus.toLowerCase()} com sucesso!`);
};
window.aplicarPermissoesVisuaisV6=function(usuario=getStaffV6()){
  const nivel=String(usuario?.nivel||'').toLowerCase();
  const btnNovo=document.getElementById('btnAbrirNovoAluno');
  if(btnNovo)btnNovo.style.display=['master','recepcao'].includes(nivel)?'inline-flex':'none';
  const backup=document.getElementById('tab-backupsecao');
  const audit=document.getElementById('tab-auditsecao');
  const trash=document.getElementById('tab-lixeirasecao');
  [backup,audit,trash].forEach(el=>{if(el)el.dataset.masterOnly='true'});
  document.querySelectorAll('[data-master-only="true"]').forEach(el=>{if(nivel!=='master'&&el.classList.contains('active'))el.classList.remove('active')});
};

window.removerExercicio=async function(id){if(!podeTreinoV6())return CorpofitnessUI.aviso('Seu nível não permite alterar a biblioteca.');const ok=await CorpofitnessUI.confirmar('Excluir exercício','O exercício será removido da biblioteca. Treinos antigos preservam o nome e a prescrição, mas o vídeo deixará de estar disponível.',{confirmar:'Excluir exercício'});if(!ok)return;try{const ex=await CorpofitnessExerciseStore.byId(id);if(ex?.video_url)await deleteVideoFromStorage(ex.video_url);const {error}=await _supabase.from('biblioteca_exercicios').delete().eq('id',id);if(error)throw error;CorpofitnessExerciseStore.invalidate();await renderBibliotecaV6(true);showToast('Exercício removido.')}catch(err){CorpofitnessUI.erro(err.message)}};

window.carregarLixeiraV6=async function(){if(!isMasterV6())return;const tbody=document.getElementById('tabelaLixeiraV6');if(!tbody)return;tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--gray)">Carregando...</td></tr>';const {data,error}=await _supabase.from('trash_items').select('id,source_table,source_id,snapshot,deleted_at,expires_at,restored_at').is('restored_at',null).gt('expires_at',new Date().toISOString()).order('deleted_at',{ascending:false}).limit(100);if(error){tbody.innerHTML=`<tr><td colspan="5" style="color:var(--danger)">${esc(error.message)}</td></tr>`;return}tbody.innerHTML=(data||[]).map(x=>{const s=x.snapshot||{};const ident=s.nome||s.titulo||s.pergunta||s.id||x.source_id||'—';return `<tr><td>${new Date(x.deleted_at).toLocaleString('pt-BR')}</td><td><code>${esc(x.source_table)}</code></td><td>${esc(ident)}</td><td>${new Date(x.expires_at).toLocaleDateString('pt-BR')}</td><td style="text-align:right"><button class="btn-action-bar" onclick="restaurarLixeiraV6('${esc(x.id)}')">↩ Restaurar</button></td></tr>`}).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--gray)">A lixeira está vazia.</td></tr>'};
window.restaurarLixeiraV6=async function(id){if(!isMasterV6())return;const ok=await CorpofitnessUI.confirmar('Restaurar conteúdo','Deseja restaurar este item para a área original?',{perigo:false,confirmar:'Restaurar'});if(!ok)return;const {error}=await _supabase.rpc('corpofitness_restaurar_lixeira',{p_trash_id:id});if(error)return CorpofitnessUI.erro(error.message);await carregarLixeiraV6();showToast('Conteúdo restaurado. Reabra a área correspondente para atualizar a lista.')};

window.limparLixeiraExpiradaV6=async function(){if(!isMasterV6())return;const ok=await CorpofitnessUI.confirmar('Limpar itens expirados','Excluir definitivamente itens com prazo vencido e itens já restaurados há mais de 7 dias?',{confirmar:'Limpar'});if(!ok)return;const {data,error}=await _supabase.rpc('corpofitness_limpar_lixeira_expirada');if(error)return CorpofitnessUI.erro(error.message);showToast(`${Number(data||0)} item(ns) removido(s) definitivamente.`);await carregarLixeiraV6();};

// -------------------------- Auditoria -----------------------------------
const auditResumoV6=(oldData,newData)=>{const o=oldData||{},n=newData||{};for(const k of ['nome','titulo','email','status','objetivo','dia']){if(n[k]!=null&&n[k]!==o[k])return `${k}: ${String(o[k]??'—')} → ${String(n[k])}`;}return 'Alteração registrada pelo banco';};
window.carregarAuditoriaV6=async function(){if(!isMasterV6())return;const tbody=document.getElementById('tabelaAuditoriaV6');if(!tbody)return;tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--gray)">Carregando...</td></tr>';const entidade=document.getElementById('auditEntidadeV6')?.value||'';let q=_supabase.from('audit_logs').select('id,actor_email,actor_nivel,action,entity,entity_id,old_data,new_data,created_at').order('created_at',{ascending:false}).limit(100);if(entidade)q=q.eq('entity',entidade);const {data,error}=await q;if(error){tbody.innerHTML=`<tr><td colspan="6" style="color:var(--danger)">${esc(error.message)}</td></tr>`;return}const acao={insert:'Criou',update:'Alterou',delete:'Excluiu'};tbody.innerHTML=(data||[]).map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('pt-BR')}</td><td><strong>${esc(x.actor_email||'Sistema')}</strong><br><small style="color:var(--gray)">${esc((x.actor_nivel||'').toUpperCase())}</small></td><td>${esc(acao[x.action]||x.action)}</td><td><code>${esc(x.entity)}</code></td><td>${esc(x.entity_id||'—')}</td><td style="max-width:300px">${esc(auditResumoV6(x.old_data,x.new_data))}</td></tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--gray)">Nenhum evento registrado.</td></tr>'};

// --------------------------- Backup ------------------------------------
window.baixarManifestoSistemaV6=function(){if(!isMasterV6())return CorpofitnessUI.aviso('Somente o Master pode acessar esta função.');const manifesto={produto:'Corpofitness',versao:V2.versao,gerado_em:new Date().toISOString(),arquivos:['admin.html','js/admin/supabase.js','js/admin/treinos.js','js/admin/app.js','js/admin/prescricao.js','js/admin/v6-core.js','aluno/portal-seguro.html','aluno/treinos-seguro.html','auth-callback.html'],nota:'O código-fonte completo é versionado no GitHub/Vercel. Este manifesto identifica a composição da versão.'};const blob=new Blob([JSON.stringify(manifesto,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`corpofitness_manifesto_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url)};
window.executarBackupPaginasPC=window.baixarManifestoSistemaV6;
window.executarBackupBancoSupabase=async function(){if(!isMasterV6())return CorpofitnessUI.aviso('Backup do banco é exclusivo do Master.');try{showToast('Gerando backup seguro...');const tabelas=['alunos','treinos_alunos','avaliacoes_fisicas','anamnese_alunos','treino_templates','treino_versoes','treino_execucoes','treino_sessoes','treino_series_execucoes','planos','professores','galeria','noticias','banners','contatos','parceiros','estrutura','modalidades','faq','biblioteca_exercicios'];const dump={gerado_em:new Date().toISOString(),versao:V2.versao,nota:'Auth, staff_profiles, staff_invites, audit_logs e credenciais são deliberadamente excluídos.'};for(const tabela of tabelas){const {data,error}=await _supabase.from(tabela).select('*');if(!error)dump[tabela]=data}const blob=new Blob([JSON.stringify(dump,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`backup_corpofitness_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);showToast('Backup seguro gerado.')}catch(err){CorpofitnessUI.erro(err.message)}};

// --------------------- Wrapper público único do treino ------------------
window.abrirModalTreinoFiel=async function(alunoId,alunoNome,...rest){if(!podeTreinoV6())return CorpofitnessUI.aviso('Seu nível não permite editar treinos.');if(typeof window.__abrirModalTreinoFielBase!=='function')throw new Error('Base do editor de treino não carregada.');V2.alunoId=alunoId;V2.alunoNome=alunoNome;const r=await window.__abrirModalTreinoFielBase.call(this,alunoId,alunoNome,...rest);window.CorpofitnessTreinoVideoPolicy?.limparMemoria?.();if(typeof exerciciosFichaMemoria!=='undefined'&&exerciciosFichaMemoria&&!Array.isArray(exerciciosFichaMemoria.E))exerciciosFichaMemoria.E=[];await carregarAnamnese(alunoId);window.CorpofitnessPrescricaoAssistida?.prepararEventos?.();window.CorpofitnessPrescricaoAssistida?.aposAbrir?.();renderizarTabelaExerciciosFicha();return r;};
window.salvarTreinoAnexo=async function(...args){if(!podeTreinoV6())return CorpofitnessUI.aviso('Seu nível não permite salvar treinos.');if(typeof window.__salvarTreinoAnexoBase!=='function')throw new Error('Base de salvamento não carregada.');window.CorpofitnessTreinoVideoPolicy?.limparMemoria?.();const r=await window.__salvarTreinoAnexoBase.apply(this,args);await criarVersaoTreinoV2('Salvamento pelo professor');return r;};

// ------------------ Dashboard central de pendências ---------------------
async function carregarPendenciasV6(){const alvo=document.getElementById('tab-dashboard');if(!alvo)return;let card=document.getElementById('cardAlertasInteligentesV2');if(card)card.remove();card=document.createElement('div');card.id='cardAlertasInteligentesV2';card.className='card';card.style.border='1px solid rgba(30,136,229,.28)';card.innerHTML='<div class="card-header"><div><h3 style="margin:0">🧭 Central de Pendências</h3><small style="color:var(--gray)">Treinos, avaliações e cadastros que precisam de atenção</small></div><span id="badgeAlertasV2" class="status-badge status-respondido">Analisando...</span></div><div id="filtrosPendenciasV6" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><button class="btn-action-bar active" data-p="todos">Todos</button><button class="btn-action-bar" data-p="urgente">🔴 Urgente</button><button class="btn-action-bar" data-p="atencao">🟠 Atenção</button><button class="btn-action-bar" data-p="revisao">🔵 Revisão</button></div><div id="listaAlertasV2" style="display:grid;gap:7px"></div>';alvo.appendChild(card);try{const [{data:alunos},{data:treinos},{data:avals}]=await Promise.all([_supabase.from('alunos').select('id,nome,status').is('arquivado_em',null),_supabase.from('treinos_alunos').select('aluno_id,created_at,reavaliar_em').eq('dia','Geral'),_supabase.from('avaliacoes_fisicas').select('aluno_id,created_at')]);const tmap=new Map((treinos||[]).map(t=>[String(t.aluno_id),t]));const amap=new Map();(avals||[]).forEach(a=>{const k=String(a.aluno_id);if(!amap.has(k)||new Date(a.created_at)>new Date(amap.get(k).created_at))amap.set(k,a)});const alerts=[];for(const a of alunos||[]){if(String(a.status||'').toLowerCase().includes('bloque'))continue;const t=tmap.get(String(a.id)),av=amap.get(String(a.id));if(!t)alerts.push({nivel:'urgente',tipo:'Treino ausente',nome:a.nome});if(!av)alerts.push({nivel:'atencao',tipo:'Sem avaliação corporal',nome:a.nome});else if(Date.now()-new Date(av.created_at).getTime()>90*86400000)alerts.push({nivel:'atencao',tipo:'Avaliação acima de 90 dias',nome:a.nome});if(t){const lim=t.reavaliar_em?new Date(t.reavaliar_em):new Date(new Date(t.created_at).getTime()+90*86400000);if(lim<=new Date())alerts.push({nivel:'revisao',tipo:'Treino para revisão',nome:a.nome})}}document.getElementById('badgeAlertasV2').textContent=`${alerts.length} pendência(s)`;const render=f=>{const list=f==='todos'?alerts:alerts.filter(x=>x.nivel===f);const cor={urgente:'var(--danger)',atencao:'var(--warning)',revisao:'var(--primary-light)'};document.getElementById('listaAlertasV2').innerHTML=list.map(a=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:9px"><span>${esc(a.nome)}</span><strong style="color:${cor[a.nivel]};font-size:.72rem">${esc(a.tipo)}</strong></div>`).join('')||'<div style="color:var(--success)">✓ Nenhuma pendência neste filtro.</div>'};render('todos');card.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{card.querySelectorAll('[data-p]').forEach(x=>x.classList.remove('active'));b.classList.add('active');render(b.dataset.p)})}catch(err){document.getElementById('listaAlertasV2').innerHTML=`<div style="color:var(--warning)">${esc(err.message)}</div>`}}
window.carregarPendenciasV6=carregarPendenciasV6;
setTimeout(carregarPendenciasV6,700);

// Carregamento sob demanda das abas sensíveis.
document.addEventListener('click',e=>{const link=e.target.closest('.menu-link');if(!link)return;const t=link.dataset.target;if(t==='auditsecao')setTimeout(carregarAuditoriaV6,0);if(t==='lixeirasecao')setTimeout(carregarLixeiraV6,0);if(t==='dashboard')setTimeout(carregarPendenciasV6,0)});

console.info('[Corpofitness V2] camada final ativa',V2.versao);
})();
