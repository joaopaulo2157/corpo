// V6: inclusão de exercício é definida uma única vez em v6-core.js.

window.showToast = function(mensagem, tipo = 'success') {
                const systemToast = document.getElementById('systemToast');
                const toastText = document.getElementById('toastText');
                if (!systemToast || !toastText) return;

                toastText.textContent = mensagem;
                systemToast.style.borderLeftColor = tipo === 'error' ? 'var(--danger)' : (tipo === 'warning' ? 'var(--warning)' : 'var(--primary)');
                
                // Remove a classe 'show' para reiniciar a animação se já estiver visível
                systemToast.classList.remove('show');
                // Força o reflow para garantir que a animação seja reiniciada
                void systemToast.offsetWidth; 
                systemToast.classList.add('show');

                // Oculta o toast após 3 segundos
                setTimeout(() => {
                    systemToast.classList.remove('show');
                }, 3000);
            };



            let treinoAtualLetra = 'A';
            let exerciciosFichaMemoria = { A: [], B: [], C: [], D: [], E: [] };

            window.mudarAbaTreinoFicha = function(letra) {
                treinoAtualLetra = letra;
                document.querySelectorAll('.btn-treino-aba').forEach(b => b.classList.remove('active'));
                const elTab = document.getElementById('tabTreino' + letra);
                if (elTab) elTab.classList.add('active');
                renderizarTabelaExerciciosFicha();
            };

            // V6: renderer único definido em v6-core.js.

window.escapeHtmlTreino = function(valor) {
                return String(valor ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            };

            // V6: renderer único definido em v6-core.js.

window.abrirModalExerciciosCatalogo = async function() {
                document.getElementById('modalCatalogoExercicios').style.display = 'flex';
                const tbody = document.getElementById('tabelaCatalogoExerciciosBody');
                tbody.classList.add('skeleton-loading'); // Adiciona o skeleton loader
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4">
                            <div class="skeleton-placeholder skeleton-text-line full"></div>
                        </td>
                    </tr>
                `;
                
                try {
                    const exList = window.CorpofitnessExerciseStore ? await window.CorpofitnessExerciseStore.load() : (await _supabase.from('biblioteca_exercicios').select('id,nome,grupo_principal,equipamento,tipo,video_url,metadata')).data; const error = null;
                    
                    if (error) throw error;

                    if (exList && exList.length > 0) {
                        tbody.classList.remove('skeleton-loading'); // Remove o skeleton loader
                        tbody.innerHTML = '';
                        exList.forEach(e => {
                            tbody.innerHTML += `<tr><td><strong>${e.nome}</strong></td><td>${e.grupo_principal}</td><td>${e.equipamento}</td><td>${e.tipo}</td></tr>`;
                        });
                    } else {
                        tbody.classList.remove('skeleton-loading');
                        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--warning);">A tabela 'biblioteca_exercicios' está vazia no banco.</td></tr>`;
                    }
                } catch(err) {
                    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger);">Erro ao buscar dados do Supabase: ${err.message}</td></tr>`;
                }
            };

// V6: fluxo antigo de prompt removido.

window.removerExercicioDaFicha = function(index) {
                exerciciosFichaMemoria[treinoAtualLetra].splice(index, 1);
                renderizarTabelaExerciciosFicha();
            };

            window.__abrirModalTreinoFielBase = async function(alunoId, alunoNome) {
                document.getElementById('tr_aluno_id').value = alunoId;
                document.getElementById('tr_nome').value = alunoNome;
                
                const hoje = new Date();
                const dia = String(hoje.getDate()).padStart(2, '0');
                const mes = String(hoje.getMonth() + 1).padStart(2, '0');
                const ano = hoje.getFullYear();
                const elTrData = document.getElementById('tr_data');
                if (elTrData) elTrData.value = `${dia}/${mes}/${ano}`;

                exerciciosFichaMemoria = { A: [], B: [], C: [], D: [], E: [] };
                document.getElementById('tabelaExerciciosFichaBody').classList.add('skeleton-loading'); // Adiciona skeleton

                try {
                    const { data: treinoList } = await _supabase.from('treinos_alunos').select('*').eq('aluno_id', alunoId).eq('dia', 'Geral');
                    
                    if (treinoList && treinoList.length > 0) {
                        const dadosTreino = treinoList[0];
                        try {
                            const payload = JSON.parse(dadosTreino.conteudo);
                            if (payload && typeof payload === 'object') {
                                if (payload.exercicios) exerciciosFichaMemoria = payload.exercicios;
                                if (payload.nivel) {
                                    document.querySelectorAll('input[name="tr_nivel"]').forEach(radio => {
                                        if (radio.parentElement.textContent.trim() === payload.nivel) radio.checked = true;
                                    });
                                }
                                if (payload.divisao) {
                                    document.querySelectorAll('input[name="tr_divisao"]').forEach(radio => {
                                        if (radio.parentElement.textContent.trim() === payload.divisao) radio.checked = true;
                                    });
                                }
                                if (payload.gruposMusculares) {
                                    document.querySelectorAll('.chk-musculo').forEach(chk => {
                                        const musculo = chk.getAttribute('data-musculo');
                                        if (musculo && payload.gruposMusculares[musculo] !== undefined) {
                                            chk.checked = payload.gruposMusculares[musculo];
                                        }
                                    });
                                    atualizarMapaAnatomico();
                                }
                                if (payload.objetivoTexto) {
                                    const selObj = document.getElementById('tr_objetivo');
                                    if (selObj) selObj.value = payload.objetivoTexto;
                                }
                                if (payload.objetivoDescricao) {
                                    const descObj = document.getElementById('tr_objetivo_desc');
                                    if (descObj) descObj.value = payload.objetivoDescricao;
                                }
                            }
                        } catch (e) {
                            console.log("Conteúdo em formato antigo ou simples.");
                        }
                    }

                    const { data: avalList } = await _supabase.from('avaliacoes_fisicas').select('*').eq('aluno_id', alunoId).order('created_at', { ascending: false }).limit(1);
                    if (avalList && avalList.length > 0) {
                        const aval = avalList[0];
                        document.getElementById('fiel_peso').value = aval.peso || '';
                        document.getElementById('fiel_altura').value = aval.altura || '';
                        if(document.getElementById('fiel_gordura')) document.getElementById('fiel_gordura').value = aval.gordura || '';
                        if(document.getElementById('fiel_massa')) document.getElementById('fiel_massa').value = aval.massa || '';
                    } else {
                        document.getElementById('fiel_peso').value = '';
                        document.getElementById('fiel_altura').value = '';
                        if(document.getElementById('fiel_gordura')) document.getElementById('fiel_gordura').value = '';
                        if(document.getElementById('fiel_massa')) document.getElementById('fiel_massa').value = '';
                    }
                } catch (e) {
                    console.log("Erro ao carregar dados do aluno: ", e);
                }

                document.getElementById('modalTreinoFiel').style.display = 'flex';
                document.getElementById('tabelaExerciciosFichaBody').classList.remove('skeleton-loading'); // Remove skeleton
                atualizarMapaAnatomico();
                renderizarTabelaExerciciosFicha();
            };

            window.abrirModalMetodosLista = function() {
                document.getElementById('modalMetodosLista').style.display = 'flex';
                const tbody = document.getElementById('tabelaMetodosListaBody');
                tbody.innerHTML = `
                    <tr><td><strong>Séries Tradicionais</strong></td><td>Séries normais com descanso</td><td>Base de qualquer treino</td></tr>
                    <tr><td><strong>Bi-set</strong></td><td>2 exercícios do mesmo grupo sem descanso</td><td>Hipertrofia, densidade</td></tr>
                    <tr><td><strong>Tri-set</strong></td><td>3 exercícios seguidos sem descanso</td><td>Hipertrofia avançada</td></tr>
                    <tr><td><strong>Drop-set</strong></td><td>Reduz carga e continua até a falha</td><td>Finalização</td></tr>
                    <tr><td><strong>Rest-Pause</strong></td><td>Pausa curta (10-20s) e continua</td><td>Força + hipertrofia</td></tr>
                    <tr><td><strong>Pirâmide Crescente</strong></td><td>Aumenta carga e diminui repetições</td><td>Força</td></tr>
                    <tr><td><strong>Myo-reps</strong></td><td>Técnica de ativação + mini-séries</td><td>Hipertrofia avançada</td></tr>
                `;
            };

            
            window.abrirSeletorExerciciosFicha = async function() {
                const modalId = 'modalSelecaoCompletaTreino';
                let modalExistente = document.getElementById(modalId);
                if (modalExistente) modalExistente.remove();

                const div = document.createElement('div');
                div.id = modalId;
                div.className = 'modal-overlay';
                div.style.cssText = 'display:flex; z-index:3600; align-items:center; justify-content:center;';
                div.innerHTML = `
                    <div class="modal-card" style="max-width:950px; width:100%; max-height:88vh; display:flex; flex-direction:column;">
                        <div class="card-header">
                            <h3>🏋️ Selecionar Exercício da Biblioteca</h3>
                            <button type="button" class="btn-action-bar" onclick="document.getElementById('${modalId}').remove()">✕ Fechar</button>
                        </div>
                        <div style="margin-bottom:14px;">
                            <input type="text" id="buscaExercicioSelecao" class="form-control" placeholder="🔎 Buscar exercício por nome ou grupo..." oninput="filtrarSelecaoExercicios()">
                        </div>
                        <div class="table-container" style="flex:1; overflow-y:auto; max-height:60vh;">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Exercício</th>
                                        <th>Grupo Muscular</th>
                                        <th>Equipamento</th>
                                        <th>Tipo</th>
                                        <th style="text-align:right;">Ação</th>
                                    </tr>
                                </thead>
                                <tbody id="tbodySelecaoExercicios">
                                    <tr><td colspan="5" style="text-align:center; color:var(--gray);">Carregando biblioteca do Supabase...</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div style="margin-top:12px; font-size:0.78rem; color:var(--gray);">
                            💡 Dica: O vídeo do exercício permanece centralizado na Biblioteca. O plano de treino armazena apenas a prescrição (séries, reps, carga e método).
                        </div>
                    </div>
                `;
                document.body.appendChild(div);

                try {
                    const exList = window.CorpofitnessExerciseStore ? await window.CorpofitnessExerciseStore.load() : (await _supabase.from('biblioteca_exercicios').select('id,nome,grupo_principal,equipamento,tipo,video_url,metadata').order('nome',{ascending:true})).data; const error = null;
                    const tbody = document.getElementById('tbodySelecaoExercicios');
                    if (!tbody) return;
                    if (error || !exList || exList.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--warning);">Biblioteca vazia ou erro de conexão com o Supabase.</td></tr>';
                        return;
                    }                    
                    window._cacheSelecaoExercicios = exList;
                    renderizarSelecaoExercicios(exList);
                    tbody.classList.remove('skeleton-loading'); // Remove skeleton

                } catch(err) {
                    const tbody = document.getElementById('tbodySelecaoExercicios');
                    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--danger);">Erro ao carregar biblioteca: ' + (err.message || err) + '</td></tr>';
                }
            };

            window.renderizarSelecaoExercicios = function(lista) {
                const tbody = document.getElementById('tbodySelecaoExercicios');
                if (!tbody) return;
                tbody.innerHTML = '';

                if (!lista || lista.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--gray);">Nenhum exercício encontrado.</td></tr>';
                    return;
                }

                lista.forEach(e => {
                    const indiceGlobal = Array.isArray(window._cacheSelecaoExercicios)
                        ? window._cacheSelecaoExercicios.indexOf(e)
                        : -1;

                    const temVideo = e.video_url && String(e.video_url).trim() !== ''
                        ? '<span style="color:var(--primary-light); font-size:0.75rem;">🎥 Vídeo cadastrado</span>'
                        : '<span style="color:var(--gray); font-size:0.75rem;">Sem vídeo</span>';

                    tbody.innerHTML += `
                        <tr>
                            <td><strong>${window.escapeHtmlTreino(e.nome || '-')}</strong><br>${temVideo}</td>
                            <td>${window.escapeHtmlTreino(e.grupo_principal || '-')}</td>
                            <td>${window.escapeHtmlTreino(e.equipamento || '-')}</td>
                            <td>${window.escapeHtmlTreino(e.tipo || '-')}</td>
                            <td style="text-align:right; white-space:nowrap;">
                                <button type="button" onclick="adicionarExercicioDiretoFichaPorIndice(${indiceGlobal})" class="btn-action-bar" style="background:var(--success); color:#fff;">➕ Adicionar ao Treino ${treinoAtualLetra}</button>
                            </td>
                        </tr>
                    `;
                });
            };

            window.filtrarSelecaoExercicios = function() {
                const termo = (document.getElementById('buscaExercicioSelecao')?.value || '').toLowerCase().trim();
                if (!window._cacheSelecaoExercicios) return;
                const filtrada = window._cacheSelecaoExercicios.filter(e => 
                    (e.nome || '').toLowerCase().includes(termo) ||
                    (e.grupo_principal || '').toLowerCase().includes(termo) ||
                    (e.equipamento || '').toLowerCase().includes(termo)
                );
                renderizarSelecaoExercicios(filtrada);
            };



            // Conjugados agora são gerenciados diretamente na Montagem de Exercícios.

            window.toggleTodosMusculos = function(master) {
                const checks = document.querySelectorAll('.chk-musculo');
                checks.forEach(c => { c.checked = master.checked; });
                atualizarMapaAnatomico();
            };

            window.atualizarMapaAnatomico = function() {
                document.querySelectorAll('.chk-musculo').forEach(chk => {
                    const musculo = chk.getAttribute('data-musculo');
                    const el = document.getElementById('map-' + musculo);
                    if (el) el.style.opacity = chk.checked ? "0.9" : "0.15";
                });
            };

            // ================================================================
            // FICHA A4 COMPACTA — simples, completa e elegante
            // ================================================================
            window.imprimirPlanoTreinoProfissional = function() {
                const escPrint = (v) => String(v ?? '')
                    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
                    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
                    .replace(/'/g,'&#039;');

                const value = (id, fallback='') => document.getElementById(id)?.value?.trim() || fallback;
                const nome=value('tr_nome','Aluno'), codigo=value('tr_cod','—'), codigoTreino=value('tr_codt','—');
                const dataAplicacao=value('tr_data',new Date().toLocaleDateString('pt-BR'));
                const objetivo=document.getElementById('tr_objetivo')?.value||'Não informado';
                const objetivoDesc=value('tr_objetivo_desc','');
                const nivel=[...document.querySelectorAll('input[name="tr_nivel"]')].find(r=>r.checked)?.parentElement?.textContent?.trim()||'Não informado';
                const divisao=[...document.querySelectorAll('input[name="tr_divisao"]')].find(r=>r.checked)?.parentElement?.textContent?.trim()||'Não informada';
                const peso=value('fiel_peso'),altura=value('fiel_altura'),gordura=value('fiel_gordura'),massa=value('fiel_massa');
                const ficha=(typeof exerciciosFichaMemoria==='object'&&exerciciosFichaMemoria)?exerciciosFichaMemoria:{A:[],B:[],C:[],D:[],E:[]};
                const blocos=['A','B','C','D','E'].filter(k=>Array.isArray(ficha[k])&&ficha[k].length);
                if(!blocos.length){window.showToast('Adicione exercícios antes de imprimir a ficha.','warning');return}
                const cel=v=>escPrint(v||'—');

                const simples=(item,index)=>`<tr><td class="n">${index+1}</td><td class="ex"><b>${cel(item.exercicio)}</b>${item.observacao?`<small>${cel(item.observacao)}</small>`:''}${(item.rir||item.rpe||item.cadencia)?`<small>${[item.rir?`RIR ${cel(item.rir)}`:'',item.rpe?`RPE ${cel(item.rpe)}`:'',item.cadencia?`Cad. ${cel(item.cadencia)}`:''].filter(Boolean).join(' • ')}</small>`:''}</td><td>${cel(item.series)}</td><td>${cel(item.reps)}</td><td>${cel(item.carga)}</td><td>${cel(item.descanso)}</td><td>${cel(item.metodo||'Tradicional')}</td></tr>`;

                const conjugado=(item,index,letra)=>`<tr class="conj-title"><td class="n">${index+1}</td><td colspan="6"><b>${cel(item.metodo||'Conjugado')}:</b> ${cel(item.exercicio)}${item.observacao?`<small>${cel(item.observacao)}</small>`:''}</td></tr>${(item.conjugado||[]).map((sub,j)=>`<tr class="conj"><td class="code">${letra}${j+1}</td><td class="ex"><b>${cel(sub.exercicio)}</b></td><td>${cel(item.series)}</td><td>${cel(sub.reps)}</td><td>${cel(sub.carga)}</td><td>${j===(item.conjugado.length-1)?cel(item.descanso):'—'}</td><td>${j===(item.conjugado.length-1)?'Descansar após bloco':'Sem descanso'}</td></tr>`).join('')}`;

                const blocosHtml=blocos.map(letra=>`<section class="block"><div class="block-head"><b>Treino ${letra}</b><span>${ficha[letra].length} item(ns)</span></div><table><thead><tr><th>#</th><th>Exercício</th><th>Séries</th><th>Reps</th><th>Carga</th><th>Desc.</th><th>Método</th></tr></thead><tbody>${ficha[letra].map((item,i)=>item?.tipo_item==='conjugado'&&Array.isArray(item.conjugado)&&item.conjugado.length>=2?conjugado(item,i,letra):simples(item,i)).join('')}</tbody></table></section>`).join('');

                const bio=[peso?`Peso: <b>${cel(peso)} kg</b>`:'',altura?`Altura: <b>${cel(altura)} m</b>`:'',gordura?`Gordura: <b>${cel(gordura)}%</b>`:'',massa?`Massa: <b>${cel(massa)} kg</b>`:''].filter(Boolean).join(' &nbsp;•&nbsp; ');
                const w=window.open('','_blank');
                if(!w){window.showToast('Permita pop-ups para imprimir a ficha.','warning');return}
                try{w.opener=null}catch(_){}

                w.document.open();
                w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Plano de Treino - ${cel(nome)}</title><style>
@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#172033;background:#fff;font-size:8.2px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{width:100%}.header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:5px;margin-bottom:5px;border-bottom:2px solid #1e88e5}.logo{width:140px;max-height:45px;object-fit:contain;object-position:left center}.header-text{text-align:right}.header-text h1{margin:0;font-size:14px}.header-text p{margin:2px 0 0;color:#667085;font-size:6.7px}.meta{display:grid;grid-template-columns:1.8fr .7fr .7fr .8fr;gap:4px;margin-bottom:4px}.box{border:1px solid #d7dee8;border-radius:4px;padding:4px 6px;background:#fafbfc}.box small{display:block;color:#667085;font-size:5.6px;font-weight:700}.box b{display:block;margin-top:1px;font-size:7.8px}.objective{border:1px solid #bed9f5;background:#f1f7fe;border-radius:4px;padding:5px 7px;margin-bottom:4px}.objective b{color:#1565c0}.objective span{color:#475467;margin-left:6px}.bio{color:#475467;margin:2px 0 5px;font-size:6.8px}.block{margin:5px 0 7px;break-inside:auto}.block-head{display:flex;justify-content:space-between;align-items:center;background:#182338;color:#fff;padding:4px 6px;border-radius:4px 4px 0 0}.block-head b{font-size:8.2px}.block-head span{font-size:5.8px;color:#d9e4f2}table{width:100%;border-collapse:collapse;table-layout:fixed}th{background:#edf3f9;color:#52606d;font-size:5.6px;text-transform:uppercase;padding:2.8px;border:1px solid #dce3eb}td{border:1px solid #e1e6ed;padding:3px;vertical-align:middle;line-height:1.18}th:nth-child(1),td:nth-child(1){width:4%}th:nth-child(2),td:nth-child(2){width:31%}th:nth-child(3),td:nth-child(3){width:7%}th:nth-child(4),td:nth-child(4){width:9%}th:nth-child(5),td:nth-child(5){width:17%}th:nth-child(6),td:nth-child(6){width:10%}th:nth-child(7),td:nth-child(7){width:22%}.n,.code{text-align:center;font-weight:800;color:#1976d2}.ex b{font-size:7.3px}.ex small,.conj-title small{display:block;color:#667085;font-size:5.8px;margin-top:1px}.conj-title td{background:#fff8e9;color:#7a4a00;border-color:#efd8a9}.conj-title b{font-size:7.2px}.conj td{background:#fffdf8}.code{color:#b66a00}.note{margin-top:5px;border-top:1px solid #dce3eb;padding-top:4px;color:#667085;font-size:6.1px;line-height:1.3}.sign{display:grid;grid-template-columns:1fr 1fr;gap:35px;margin-top:13px;break-inside:avoid}.sign div{border-top:1px solid #8b95a5;text-align:center;padding-top:3px;color:#667085;font-size:5.8px}.footer{display:flex;justify-content:space-between;margin-top:5px;color:#98a2b3;font-size:5.5px}
</style></head><body><div class="sheet"><header class="header"><img class="logo" src="${new URL('/img/logo.png',window.location.origin).href}" onerror="this.onerror=null;this.src='${new URL('/img/logo.svg',window.location.origin).href}'" alt="Corpofitness"><div class="header-text"><h1>Plano de Treino</h1><p>Ficha individual • vídeos disponíveis no Portal do Aluno</p></div></header><div class="meta"><div class="box"><small>ALUNO</small><b>${cel(nome)}</b></div><div class="box"><small>CÓDIGO</small><b>${cel(codigo)}</b></div><div class="box"><small>TREINO</small><b>${cel(codigoTreino)}</b></div><div class="box"><small>APLICAÇÃO</small><b>${cel(dataAplicacao)}</b></div></div><div class="meta" style="grid-template-columns:1fr .55fr .55fr"><div class="objective"><b>${cel(objetivo)}</b>${objetivoDesc?`<span>${cel(objetivoDesc)}</span>`:''}</div><div class="box"><small>NÍVEL</small><b>${cel(nivel)}</b></div><div class="box"><small>DIVISÃO</small><b>${cel(divisao)}</b></div></div>${bio?`<div class="bio">${bio}</div>`:''}${blocosHtml}<div class="note"><b>Orientação:</b> siga a prescrição da equipe técnica. Nos conjugados, execute A1/A2/A3 em sequência e descanse somente após completar o bloco. Em caso de dúvida, consulte o vídeo do exercício no Portal do Aluno.</div><div class="sign"><div>Professor / Responsável técnico</div><div>Aluno</div></div><div class="footer"><span>Academia Corpofitness</span><span>${new Date().toLocaleDateString('pt-BR')}</span></div></div></body></html>`);
                w.document.close();w.focus();w.onafterprint=()=>{try{w.close()}catch(_){}};setTimeout(()=>{try{w.print()}catch(_){}},350);
            };

            window.__salvarTreinoAnexoBase = async function() {
                const alunoId = document.getElementById('tr_aluno_id').value;
                const objetivo = document.getElementById('tr_objetivo').value;
                const objetivoDesc = document.getElementById('tr_objetivo_desc')?.value || '';

                let nivelSelecionado = 'Iniciante';
                document.querySelectorAll('input[name="tr_nivel"]').forEach(radio => {
                    if (radio.checked) nivelSelecionado = radio.parentElement.textContent.trim();
                });

                let divisaoSelecionada = 'ABC';
                document.querySelectorAll('input[name="tr_divisao"]').forEach(radio => {
                    if (radio.checked) divisaoSelecionada = radio.parentElement.textContent.trim();
                });

                const gruposMuscularesSelecionados = {};
                document.querySelectorAll('.chk-musculo').forEach(chk => {
                    const musculo = chk.getAttribute('data-musculo');
                    if (musculo) gruposMuscularesSelecionados[musculo] = chk.checked;
                });

                if (!alunoId) {
                    window.showToast("Erro: Nenhum aluno selecionado.", "error");
                    return;
                }

                try {
                    const payloadTreinoCompleto = {
                        objetivoTexto: objetivo,
                        objetivoDescricao: objetivoDesc,
                        nivel: nivelSelecionado,
                        divisao: divisaoSelecionada,
                        gruposMusculares: gruposMuscularesSelecionados,
                        exercicios: exerciciosFichaMemoria
                    };

                    const { error: erroTreino } = await _supabase.from('treinos_alunos').upsert({
                        aluno_id: alunoId,
                        dia: 'Geral',
                        objetivo: `${objetivo} - ${objetivoDesc}`,
                        conteudo: JSON.stringify(payloadTreinoCompleto),
                        created_at: new Date().toISOString() // Força a atualização do timestamp para o lembrete de 3 meses
                    }, { onConflict: 'aluno_id,dia' });

                    if (erroTreino) throw new Error("Erro ao salvar treino: " + erroTreino.message);

                    const pesoVal = document.getElementById('fiel_peso').value;
                    const alturaVal = document.getElementById('fiel_altura').value;
                    const gorduraVal = document.getElementById('fiel_gordura')?.value;
                    const massaVal = document.getElementById('fiel_massa')?.value;

                    const peso = pesoVal && pesoVal.trim() !== "" ? parseFloat(pesoVal) : null;
                    const altura = alturaVal && alturaVal.trim() !== "" ? parseFloat(alturaVal) : null;
                    const gordura = gorduraVal && gorduraVal.trim() !== "" ? parseFloat(gorduraVal) : null;
                    const massa = massaVal && massaVal.trim() !== "" ? parseFloat(massaVal) : null;

                    if (peso !== null || altura !== null || gordura !== null || massa !== null) {
                        const { error: erroAval } = await _supabase.from('avaliacoes_fisicas').insert([{
                            aluno_id: alunoId,
                            peso: peso,
                            altura: altura,
                            gordura: gordura,
                            massa: massa
                        }]);

                        if (erroAval) throw new Error("Erro ao salvar avaliação: " + erroAval.message);
                    }

                    window.showToast("Plano de Treino completo e Avaliação salvos com sucesso!");
                    fecharModal('modalTreinoFiel');
                    
                    window.carregarLembretesFixosAdmin();
                    
                } catch (err) {
                    console.error(err);
                    window.showToast("Erro ao salvar: " + err.message, "error");
                    alert("Falha ao salvar no banco de dados: " + err.message);
                }
            };
