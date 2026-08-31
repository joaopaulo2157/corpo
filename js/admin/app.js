window.exportarRelatorioCSV = async function() {
        try {
            const { data: contatos } = await _supabase.from('contatos').select('*');
            if (!contatos || contatos.length === 0) {
                alert('Não há dados de contatos para exportar.');
                return;
            }
            let csvContent = "data:text/csv;charset=utf-8,ID,Data,Nome,Email,Telefone,Status\r\n";
            contatos.forEach(c => {
                csvContent += `"${c.id}","${c.created_at}","${c.nome}","${c.email}","${c.tel}","${c.status || 'Pendente'}"\r\n`;
            });
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "relatorio_contatos_corpofitness.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.showToast("Relatório CSV exportado com sucesso!");
        } catch (err) {
            alert('Erro ao exportar CSV: ' + err.message);
        }
    };

    window.compressImageFile = function(file, maxWidth = 1200, maxHeight = 1200, quality = 0.78) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const type = file.type.toLowerCase();
                let outputType = 'image/jpeg';
                let encoderOptions = quality;

                if (type === 'image/png') {
                    outputType = 'image/png';
                    encoderOptions = undefined;
                } else if (type === 'image/webp') {
                    outputType = 'image/webp';
                }

                const dataUrl = canvas.toDataURL(outputType, encoderOptions);
                resolve(dataUrl);
                URL.revokeObjectURL(img.src);
            };
            img.onerror = (err) => reject(err);
            img.src = URL.createObjectURL(file);
        });
    };

    // V6: uploads editoriais são enviados ao Supabase Storage por v6-core.js.

    let planosCache = [];
    let alunosCache = [];
    const ALUNOS_PAGE_SIZE_V6 = 25;
    window.alunosPaginaV6 = 1;
    window.alunosBuscaV6 = '';


    window.carregarOpcoesPlanosNoSelect = async function(selecionado = '') {
        const select = document.getElementById('alunoPlano');
        if (!select) return;
        try {
            const { data: planos } = await _supabase.from('planos').select('nome, valor');
            planosCache = planos || [];
            select.innerHTML = '<option value="">Selecione um plano...</option>';
            if (planosCache.length > 0) {
                planosCache.forEach(p => {
                    const isSel = (selecionado === p.nome) ? 'selected' : '';
                    select.innerHTML += `<option value="${p.nome}" data-valor="${p.valor}" ${isSel}>${p.nome} (R$ ${p.valor}/mês)</option>`;
                });
            } else {
                select.innerHTML = '<option value="Padrão" data-valor="100">Padrão (R$ 100/mês)</option>';
            }
        } catch (err) {
            select.innerHTML = '<option value="Padrão" data-valor="100">Padrão (R$ 100/mês)</option>';
        }
    };

    window.enviarLinkSenhaAluno = async function(email) {
        if (!email) return window.CorpofitnessUI?.aviso('Este aluno não possui e-mail cadastrado.');
        const ok = await window.CorpofitnessUI.confirmar(
            'Enviar acesso ao aluno',
            `Deseja enviar um link de redefinição/cadastro de senha para ${email}?`,
            { perigo:false, confirmar:'Enviar link' }
        );
        if (!ok) return;
        try {
            if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
                throw new Error('Envio de recuperação deve ser feito pela URL publicada na Vercel.');
            }
            const { error } = await _supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth-callback.html?area=aluno&mode=recovery`
            });
            if (error) throw error;
            window.showToast('Link de acesso enviado com sucesso para o e-mail do aluno!');
        } catch (err) {
            window.CorpofitnessUI?.erro('Erro ao enviar link: ' + err.message);
        }
    };

    window.carregarAlunosAdmin = async function(opcoes = {}) {
        const pagina = Math.max(1, Number(opcoes.pagina || window.alunosPaginaV6 || 1));
        const busca = String(opcoes.busca ?? window.alunosBuscaV6 ?? '').trim();
        window.alunosPaginaV6 = pagina;
        window.alunosBuscaV6 = busca;

        const tbody = document.getElementById('tabelaAlunosBody');
        if (!tbody) return;
        tbody.classList.add('skeleton-loading');
        tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton-placeholder skeleton-text-line full"></div><div class="skeleton-placeholder skeleton-text-line full"></div></td></tr>`;

        const from = (pagina - 1) * ALUNOS_PAGE_SIZE_V6;
        const to = from + ALUNOS_PAGE_SIZE_V6 - 1;
        let query = _supabase.from('alunos')
            .select('id,nome,email,tel,plano,status,created_at,auth_user_id', { count:'exact' })
            .is('arquivado_em', null)
            .order('created_at', { ascending:false })
            .range(from, to);

        if (busca) {
            const termo = busca.replace(/[,%()]/g, ' ').trim();
            if (termo) query = query.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%,tel.ilike.%${termo}%`);
        }

        const { data: alunos, error, count } = await query;
        tbody.classList.remove('skeleton-loading');
        if (error) {
            console.error('[Alunos V6]', error);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger)">Não foi possível carregar os alunos.</td></tr>';
            return;
        }

        alunosCache = alunos || [];
        const total = Number(count || 0);
        const paginas = Math.max(1, Math.ceil(total / ALUNOS_PAGE_SIZE_V6));
        if (pagina > paginas && total > 0) return window.carregarAlunosAdmin({ pagina:paginas, busca });

        const usuario = JSON.parse(sessionStorage.getItem('corpofitness_logado') || 'null');
        const nivel = String(usuario?.nivel || '').toLowerCase();
        const podeCadastro = ['master','recepcao'].includes(nivel);
        const podeTreino = ['master','professor'].includes(nivel);
        const podeArquivar = nivel === 'master';
        const safe = window.escapeHtmlTreino || (v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])));

        if (!alunosCache.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray)">Nenhum aluno encontrado.</td></tr>';
        } else {
            tbody.innerHTML = alunosCache.map(a => {
                const status = String(a.status || 'Pendente');
                const statusNorm = status.toLowerCase();
                const badgeClass = statusNorm === 'ativo' ? 'status-ativo' : (statusNorm.includes('bloque') ? 'status-bloqueado' : 'status-pendente');
                let acoes = '';
                if (podeCadastro) {
                    acoes += `<button onclick="toggleStatusAluno('${safe(a.id)}', this)" class="btn-action-bar" data-status-toggle="${statusNorm==='ativo'?'ativo':'inativo'}" title="Alternar status">${statusNorm==='ativo'?'🟢':'⚪'}</button>`;
                    acoes += `<button onclick="editarAluno('${safe(a.id)}')" class="btn-action-bar" title="Editar cadastro">✏️</button>`;
                }
                if (podeTreino) {
                    const nomeArg = safe(JSON.stringify(String(a.nome || '')));
                    acoes += `<button onclick="abrirModalTreinoFiel('${safe(a.id)}', ${nomeArg})" class="btn-action-bar" title="Plano de treino">🏋️</button>`;
                    acoes += `<button onclick="abrirModalAvaliacaoFisicaCompleta('${safe(a.id)}', ${nomeArg})" class="btn-action-bar" title="Avaliação corporal">📏</button>`;
                    acoes += `<button onclick="abrirModalHistoricoAvaliacoes('${safe(a.id)}', ${nomeArg})" class="btn-action-bar" title="Histórico de avaliações">📈</button>`;
                }
                if (podeArquivar) acoes += `<button onclick="removerAluno('${safe(a.id)}')" class="btn-action-bar btn-danger" title="Arquivar aluno">🗃️</button>`;

                return `<tr>
                    <td><strong>${safe(a.nome||'')}</strong></td>
                    <td>${safe(a.email||'—')}</td>
                    <td>${safe(a.tel||'—')}</td>
                    <td>${safe(a.plano||'Sem Plano')}</td>
                    <td><span class="status-badge ${badgeClass}">${safe(status)}</span></td>
                    <td style="text-align:right;white-space:nowrap"><div style="display:flex;justify-content:flex-end;gap:5px;flex-wrap:wrap">${acoes||'<span style="color:var(--gray)">Somente leitura</span>'}</div></td>
                </tr>`;
            }).join('');
        }

        const pg = document.getElementById('alunosPaginacaoV6');
        if (pg) {
            const start = total ? from + 1 : 0;
            const finish = Math.min(from + ALUNOS_PAGE_SIZE_V6, total);
            let botoes = `<span class="page-info">${start}-${finish} de ${total}</span>`;
            botoes += `<button ${pagina<=1?'disabled':''} onclick="carregarAlunosAdmin({pagina:${pagina-1},busca:window.alunosBuscaV6})">‹</button>`;
            const ini=Math.max(1,pagina-2), fim=Math.min(paginas,ini+4);
            for(let p=ini;p<=fim;p++) botoes += `<button class="${p===pagina?'active':''}" onclick="carregarAlunosAdmin({pagina:${p},busca:window.alunosBuscaV6})">${p}</button>`;
            botoes += `<button ${pagina>=paginas?'disabled':''} onclick="carregarAlunosAdmin({pagina:${pagina+1},busca:window.alunosBuscaV6})">›</button>`;
            pg.innerHTML=botoes;
        }

        const countEl=document.getElementById('countAlunos');
        if(countEl && !busca) countEl.textContent=String(total);
    };

    // V6: toggleStatusAluno definido na camada final.

    window.mudarStatusAluno = async function(id, novoStatus) {
        await _supabase.from('alunos').update({ status: novoStatus }).eq('id', id);
        window.carregarAlunosAdmin();
        window.showToast(`Cadastro alterado para ${novoStatus}!`);
    };

    window.abrirFormAluno = async function() {
        const formDinamico = document.getElementById('formAlunoDinamico');
        if (formDinamico) formDinamico.reset();
        alunosCache = await _supabase.from('alunos').select('id, nome, email, tel');
        document.getElementById('alunoId').value = "-1";
        document.getElementById('tituloFormAluno').textContent = "Cadastrar Novo Aluno";
        await window.carregarOpcoesPlanosNoSelect();
        document.getElementById('cardFormAluno').style.display = "block";
    };

    window.fecharFormAluno = function() {
        document.getElementById('cardFormAluno').style.display = "none";
    };

    window.editarAluno = async function(id) {
        const { data: a } = await _supabase.from('alunos').select('*').eq('id', id).single();
        if(!a) return;
        document.getElementById('alunoId').value = a.id;
        document.getElementById('alunoNome').value = a.nome;
        document.getElementById('alunoEmail').value = a.email;
        document.getElementById('alunoTel').value = a.tel;
        await window.carregarOpcoesPlanosNoSelect(a.plano);
        document.getElementById('alunoStatus').value = a.status || 'Ativo';
        document.getElementById('tituloFormAluno').textContent = "Editar Aluno";
        document.getElementById('cardFormAluno').style.display = "block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // V6: removerAluno final é definido em v6-core.js e arquiva em vez de apagar.

    document.getElementById('formAlunoDinamico')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('alunoId').value;
        const dados = {
            nome: document.getElementById('alunoNome').value,
            // ... (outros campos)
            email: document.getElementById('alunoEmail').value,
            tel: document.getElementById('alunoTel').value,
            plano: document.getElementById('alunoPlano').value,
            status: document.getElementById('alunoStatus').value
        };

        try {
            const btn = e.submitter;
            btn.textContent = 'Salvando...';
            btn.disabled = true;

            let res = id !== "-1" ? await _supabase.from('alunos').update(dados).eq('id', id) : await _supabase.from('alunos').insert([dados]);
            if (res.error) throw new Error(res.error.message);
            fecharFormAluno();
            window.carregarAlunosAdmin();
            window.showToast("Aluno salvo com sucesso!");
        } catch (err) {
            alert("Erro ao salvar aluno: " + err.message);
        } finally {
            e.submitter.textContent = 'Salvar Aluno';
            e.submitter.disabled = false;
        }

    });

    window.fecharModal = function(modalId) {
        const modalEl = document.getElementById(modalId);
        if (modalEl) modalEl.style.display = 'none';
    };

    window.carregarEstruturaAdmin = async function() {
        const { data: itens, error } = await _supabase.from('estrutura').select('*').order('ordem', { ascending: true });
        if (error) return;
        document.getElementById('listaEstruturaAdmin').classList.remove('skeleton-loading'); // Remove skeleton
        const container = document.getElementById('listaEstruturaAdmin');
        if (!container) return;
        container.innerHTML = '';
        (itens || []).forEach(e => {
            container.innerHTML += `
                <div class="draggable-card" draggable="true" data-id="${e.id}" style="background: var(--dark-2); padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
                    <div style="font-size:0.75rem; color:var(--primary-light); margin-bottom:6px; cursor:grab;">☰ Arraste para mover</div>
                    <div style="font-size: 1.5rem; margin-bottom: 10px; color:var(--primary-light);"><i class="${e.icone}"></i></div>
                    <h3 style="font-size: 1.1rem; color: var(--text-color); margin-bottom: 6px;">${e.titulo}</h3>
                    <p style="font-size: 0.85rem; color: var(--gray); margin-bottom: 15px;">${e.descricao}</p>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" onclick="editarEstrutura('${e.id}')" class="btn-action-bar" style="flex:1;">✏️ Editar</button>
                        <button type="button" onclick="removerEstrutura('${e.id}')" class="btn-action-bar btn-danger">🗑️ Excluir</button>
                    </div>
                </div>
            `;
        });
        iniciarDragAndDrop('listaEstruturaAdmin', 'estrutura', window.carregarEstruturaAdmin);
    };

    window.abrirFormEstrutura = function() {
        document.getElementById('formEstruturaDinamico').reset();
        document.getElementById('estId').value = "-1";
        document.getElementById('tituloFormEstrutura').textContent = "Cadastrar Item de Estrutura";
        document.getElementById('cardFormEstrutura').style.display = "block";
    };

    window.fecharFormEstrutura = function() { document.getElementById('cardFormEstrutura').style.display = "none"; };

    window.editarEstrutura = async function(id) {
        const { data: e } = await _supabase.from('estrutura').select('*').eq('id', id).single();
        if(!e) return;
        document.getElementById('estId').value = e.id;
        document.getElementById('estTitulo').value = e.titulo;
        document.getElementById('estIcone').value = e.icone;
        document.getElementById('estDesc').value = e.descricao;
        document.getElementById('tituloFormEstrutura').textContent = "Editar Item de Estrutura";
        document.getElementById('cardFormEstrutura').style.display = "block";
    };

    // V6: removerEstrutura definido na camada final.

    document.getElementById('formEstruturaDinamico')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('estId').value;
        const dados = {
            titulo: document.getElementById('estTitulo').value,
            icone: document.getElementById('estIcone').value,
            descricao: document.getElementById('estDesc').value
        };
        if (id !== "-1") await _supabase.from('estrutura').update(dados).eq('id', id);
        else await _supabase.from('estrutura').insert([{ ...dados, ordem: 0 }]);
        fecharFormEstrutura();
        window.carregarEstruturaAdmin();
        window.showToast("Item de estrutura salvo com sucesso!");
    });

    window.carregarModalidadesAdmin = async function() {
        const { data: mods, error } = await _supabase.from('modalidades').select('*').order('ordem', { ascending: true });
        if (error) return;
        const container = document.getElementById('listaModalidadesAdmin');
        container.classList.remove('skeleton-loading'); // Remove skeleton
        if (!container) return;
        container.innerHTML = '';
        (mods || []).forEach(m => {
            container.innerHTML += `
                <div class="draggable-card" draggable="true" data-id="${m.id}" style="background: var(--dark-2); padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
                    <div style="font-size:0.75rem; color:var(--primary-light); margin-bottom:6px; cursor:grab;">☰ Arraste para mover</div>
                    <div style="font-size: 1.5rem; margin-bottom: 10px; color:var(--primary-light);"><i class="${m.icone}"></i></div>
                    <h3 style="font-size: 1.1rem; color: var(--text-color); margin-bottom: 6px;">${m.nome}</h3>
                    <p style="font-size: 0.82rem; color: var(--gray); margin-bottom: 4px;"><strong>Nível:</strong> ${m.nivel}</p>
                    <p style="font-size: 0.82rem; color: var(--gray); margin-bottom: 15px;"><strong>Duração:</strong> ${m.duracao}</p>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" onclick="editarModalidade('${m.id}')" class="btn-action-bar" style="flex:1;">✏️ Editar</button>
                        <button type="button" onclick="removerModalidade('${m.id}')" class="btn-action-bar btn-danger">🗑️ Excluir</button>
                    </div>
                </div>
            `;
        });
        iniciarDragAndDrop('listaModalidadesAdmin', 'modalidades', window.carregarModalidadesAdmin);
    };

    window.abrirFormModalidade = function() {
        document.getElementById('formModalidadeDinamico').reset();
        document.getElementById('modId').value = "-1";
        document.getElementById('tituloFormModalidade').textContent = "Cadastrar Modalidade";
        document.getElementById('cardFormModalidade').style.display = "block";
    };

    window.fecharFormModalidade = function() { document.getElementById('cardFormModalidade').style.display = "none"; };

    window.editarModalidade = async function(id) {
        const { data: m } = await _supabase.from('modalidades').select('*').eq('id', id).single();
        if(!m) return;
        document.getElementById('modId').value = m.id;
        document.getElementById('modNome').value = m.nome;
        document.getElementById('modIcone').value = m.icone;
        document.getElementById('modNivel').value = m.nivel;
        document.getElementById('modDuracao').value = m.duracao;
        document.getElementById('modEquip').value = m.equipamento;
        document.getElementById('modBeneficios').value = m.beneficios;
        document.getElementById('modDesc').value = m.descricao;
        document.getElementById('tituloFormModalidade').textContent = "Editar Modalidade";
        document.getElementById('cardFormModalidade').style.display = "block";
    };

    // V6: removerModalidade definido na camada final.

    document.getElementById('formModalidadeDinamico')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('modId').value;
        const dados = {
            nome: document.getElementById('modNome').value,
            icone: document.getElementById('modIcone').value,
            nivel: document.getElementById('modNivel').value,
            duracao: document.getElementById('modDuracao').value,
            equipamento: document.getElementById('modEquip').value,
            beneficios: document.getElementById('modBeneficios').value,
            descricao: document.getElementById('modDesc').value
        };
        if (id !== "-1") await _supabase.from('modalidades').update(dados).eq('id', id);
        else await _supabase.from('modalidades').insert([{ ...dados, ordem: 0 }]);
        fecharFormModalidade();
        window.carregarModalidadesAdmin();
        window.showToast("Modalidade salva com sucesso!");
    });

    window.carregarFeedbackAdmin = async function() {
        const { data: feeds, error } = await _supabase.from('feedbacks').select('*').order('ordem', { ascending: true });
        if (error) return;
        document.getElementById('listaFeedbackAdmin').classList.remove('skeleton-loading'); // Remove skeleton
        const container = document.getElementById('listaFeedbackAdmin');
        if (!container) return;
        container.innerHTML = '';
        (feeds || []).forEach(f => {
            container.innerHTML += `
                <div class="draggable-card" draggable="true" data-id="${f.id}" style="background: var(--dark-2); padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
                    <div style="font-size:0.75rem; color:var(--primary-light); margin-bottom:6px; cursor:grab;">☰ Arraste para mover</div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <img src="${f.foto}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/40';">
                        <div>
                            <h4 style="font-size: 0.95rem; color: #fff; margin:0;">${f.nome}</h4>
                            <span style="font-size: 0.75rem; color: var(--gray);">${f.unidade}</span>
                        </div>
                    </div>
                    <div style="color: #f59e0b; font-size: 0.8rem; margin-bottom: 6px;">${f.estrelas}</div>
                    <p style="font-size: 0.85rem; color: var(--gray); margin-bottom: 15px;">"${f.texto}"</p>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" onclick="editarFeedback('${f.id}')" class="btn-action-bar" style="flex:1;">✏️ Editar</button>
                        <button type="button" onclick="removerFeedback('${f.id}')" class="btn-action-bar btn-danger">🗑️ Excluir</button>
                    </div>
                </div>
            `;
        });
        iniciarDragAndDrop('listaFeedbackAdmin', 'feedbacks', window.carregarFeedbackAdmin);
    };

    window.abrirFormFeedback = function() {
        document.getElementById('formFeedbackDinamico').reset();
        document.getElementById('feedId').value = "-1";
        document.getElementById('feedAlunoId').value = "";
        document.getElementById('tituloFormFeedback').textContent = "Cadastrar Depoimento";
        document.getElementById('cardFormFeedback').style.display = "block";
    };

    window.fecharFormFeedback = function() { document.getElementById('cardFormFeedback').style.display = "none"; };

    window.editarFeedback = async function(id) {
        const { data: f } = await _supabase.from('feedbacks').select('*').eq('id', id).single();
        if(!f) return;
        document.getElementById('feedId').value = f.id;
        document.getElementById('feedNome').value = f.nome;
        document.getElementById('feedUnidade').value = f.unidade;
        document.getElementById('feedEstrelas').value = f.estrelas;
        document.getElementById('feedAlunoId').value = f.aluno_id || '';
        document.getElementById('feedFoto').value = f.foto;
        document.getElementById('feedTexto').value = f.texto;
        document.getElementById('tituloFormFeedback').textContent = "Editar Depoimento";
        document.getElementById('cardFormFeedback').style.display = "block";
    };

    // V6: removerFeedback definido na camada final.

    document.getElementById('formFeedbackDinamico')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('feedId').value;
        const dados = {
            nome: document.getElementById('feedNome').value,
            aluno_id: document.getElementById('feedAlunoId').value || null,
            unidade: document.getElementById('feedUnidade').value,
            estrelas: document.getElementById('feedEstrelas').value,
            foto: document.getElementById('feedFoto').value,
            texto: document.getElementById('feedTexto').value
        };
        if (id !== "-1") await _supabase.from('feedbacks').update(dados).eq('id', id);
        else await _supabase.from('feedbacks').insert([{ ...dados, ordem: 0 }]);
        fecharFormFeedback();
        window.carregarFeedbackAdmin();
        window.showToast("Depoimento salvo com sucesso!");
    });

    // Lógica de Autocomplete para Alunos no Formulário de Feedback
    const inputFeedNome = document.getElementById('feedNome');
    const suggestionsBox = document.getElementById('alunoSuggestions');

    if (inputFeedNome && suggestionsBox) {
        inputFeedNome.addEventListener('input', () => {
            const termo = inputFeedNome.value.toLowerCase();
            if (termo.length < 2) {
                suggestionsBox.style.display = 'none';
                return;
            }

            const sugestoes = alunosCache.filter(aluno => 
                aluno.nome.toLowerCase().includes(termo)
            );

            suggestionsBox.innerHTML = '';
            if (sugestoes.length > 0) {
                sugestoes.slice(0, 5).forEach(aluno => {
                    const div = document.createElement('div');
                    div.textContent = aluno.nome;
                    div.style.cssText = 'padding: 10px; cursor: pointer; border-bottom: 1px solid var(--border);';
                    div.onmouseover = () => div.style.backgroundColor = 'var(--primary)';
                    div.onmouseout = () => div.style.backgroundColor = '';
                    div.onclick = () => {
                        inputFeedNome.value = aluno.nome;
                        document.getElementById('feedAlunoId').value = aluno.id;
                        suggestionsBox.style.display = 'none';
                    };
                    suggestionsBox.appendChild(div);
                });
                suggestionsBox.style.display = 'block';
            } else {
                suggestionsBox.style.display = 'none';
            }
        });

        document.addEventListener('click', (e) => {
            if (!inputFeedNome.contains(e.target) && !suggestionsBox.contains(e.target)) {
                suggestionsBox.style.display = 'none';
            }
        });
    }

    window.carregarFaqAdmin = async function() {
        const { data: faqs, error } = await _supabase.from('faq').select('*').order('ordem', { ascending: true });
        if (error) return;
        document.getElementById('listaFaqAdmin').classList.remove('skeleton-loading'); // Remove skeleton
        const container = document.getElementById('listaFaqAdmin');
        if (!container) return;
        container.innerHTML = '';
        (faqs || []).forEach(f => {
            container.innerHTML += `
                <div class="draggable-card" draggable="true" data-id="${f.id}" style="background: var(--dark-2); padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
                    <div style="font-size:0.75rem; color:var(--primary-light); margin-bottom:6px; cursor:grab;">☰ Arraste para mover</div>
                    <h4 style="font-size: 0.95rem; color: #fff; margin-bottom: 6px;">Q: ${f.pergunta}</h4>
                    <p style="font-size: 0.85rem; color: var(--gray); margin-bottom: 15px;">R: ${f.resposta}</p>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" onclick="editarFaq('${f.id}')" class="btn-action-bar" style="flex:1;">✏️ Editar</button>
                        <button type="button" onclick="removerFaq('${f.id}')" class="btn-action-bar btn-danger">🗑️ Excluir</button>
                    </div>
                </div>
            `;
        });
        iniciarDragAndDrop('listaFaqAdmin', 'faq', window.carregarFaqAdmin);
    };

    window.abrirFormFaq = function() {
        document.getElementById('formFaqDinamico').reset();
        document.getElementById('faqId').value = "-1";
        document.getElementById('tituloFormFaq').textContent = "Cadastrar Pergunta FAQ";
        document.getElementById('cardFormFaq').style.display = "block";
    };

    window.fecharFormFaq = function() { document.getElementById('cardFormFaq').style.display = "none"; };

    window.editarFaq = async function(id) {
        const { data: f } = await _supabase.from('faq').select('*').eq('id', id).single();
        if(!f) return;
        document.getElementById('faqId').value = f.id;
        document.getElementById('faqPergunta').value = f.pergunta;
        document.getElementById('faqResposta').value = f.resposta;
        document.getElementById('tituloFormFaq').textContent = "Editar Pergunta FAQ";
        document.getElementById('cardFormFaq').style.display = "block";
    };

    // V6: removerFaq definido na camada final.

    document.getElementById('formFaqDinamico')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('faqId').value;
        const dados = {
            pergunta: document.getElementById('faqPergunta').value,
            resposta: document.getElementById('faqResposta').value
        };
        if (id !== "-1") await _supabase.from('faq').update(dados).eq('id', id);
        else await _supabase.from('faq').insert([{ ...dados, ordem: 0 }]);
        fecharFormFaq();
        window.carregarFaqAdmin();
        window.showToast("Pergunta FAQ salva com sucesso!");
    });

    window.carregarPlanosAdmin = async function() {
        const { data: planos, error } = await _supabase.from('planos').select('*').order('ordem', { ascending: true });
        if (error) return;

        const container = document.getElementById('listaPlanosAdmin');
        container.classList.remove('skeleton-loading'); // Remove skeleton
        if (!container) return;

        container.innerHTML = '';
        planos.forEach((p) => {
            const itensHTML = (p.itens || []).map(i => `<li style="font-size:0.8rem; color:var(--gray); margin: 3px 0;">✔ ${i}</li>`).join('');
            container.innerHTML += `
                <div class="draggable-card" draggable="true" data-id="${p.id}" style="background: var(--dark-2); padding: 20px; border-radius: 12px; border: 1px solid ${p.destaque === 'sim' ? 'var(--primary)' : 'var(--border)'}; position: relative;">
                    <div style="font-size:0.75rem; color:var(--primary-light); margin-bottom:6px; cursor:grab;">☰ Arraste para mover</div>
                    ${p.badge ? `<span style="background: var(--primary); font-size: 0.65rem; padding: 2px 8px; border-radius: 10px; font-weight: bold; position: absolute; top: 12px; right: 12px;">${p.badge}</span>` : ''}
                    <h3 style="font-size: 1.2rem; color: var(--text-color);">${p.nome}</h3>
                    <div style="font-size: 1.8rem; font-weight: bold; color: var(--primary-light); margin: 10px 0;">
                        R$${p.valor}<small style="font-size: 0.8rem; color: var(--gray);">${p.sufixo}</small>
                    </div>
                    <ul style="list-style: none; margin-bottom: 15px;">${itensHTML}</ul>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" onclick="editarPlano('${p.id}')" class="btn-action-bar" style="flex:1;">✏️ Editar</button>
                        <button type="button" onclick="removerPlano('${p.id}')" class="btn-action-bar btn-danger">🗑️ Excluir</button>
                    </div>
                </div>
            `;
        });
        iniciarDragAndDrop('listaPlanosAdmin', 'planos', window.carregarPlanosAdmin);
    };

    window.editarPlano = async function(id) {
        const { data: p } = await _supabase.from('planos').select('*').eq('id', id).single();
        if(!p) return;
        document.getElementById('planoId').value = p.id;
        document.getElementById('planoNome').value = p.nome;
        document.getElementById('planoValor').value = p.valor;
        document.getElementById('planoSufixo').value = p.sufixo;
        document.getElementById('planoBadge').value = p.badge || '';
        document.getElementById('planoDestaque').value = p.destaque || 'nao';
        document.getElementById('planoItens').value = (p.itens || []).join('\n');
        document.getElementById('tituloFormPlano').textContent = "Editar Plano";
        document.getElementById('cardFormPlano').style.display = "block";
    };

    // V6: removerPlano definido na camada final.

    window.carregarParceirosAdmin = async function() {
        const container = document.getElementById('listaParceirosAdmin');
        if (!container) return;
        try {
            container.classList.add('skeleton-loading'); // Adiciona skeleton
            const { data: parceiros, error } = await _supabase.from('parceiros').select('id,nome,ordem').order('ordem', { ascending: true });
            container.innerHTML = '';
            if (error) {
                container.innerHTML = `<p style="color:var(--warning); grid-column: 1/-1;">Erro ao carregar parceiros.</p>`;
                return;
            }
            if (!parceiros || parceiros.length === 0) {
                container.innerHTML = `<p style="color:var(--gray); grid-column: 1/-1;">Nenhum parceiro cadastrado ainda.</p>`;
                return;
            }
            container.classList.remove('skeleton-loading'); // Remove skeleton
            parceiros.forEach((p) => {
                container.innerHTML += `
                    <div style="background: var(--dark-2); padding: 15px; border-radius: 12px; border: 1px solid var(--border); text-align: center;">
                        <h4 style="color: #fff; font-size: 0.95rem; margin-bottom: 10px;">${p.nome}</h4>
                        <div style="display: flex; gap: 6px;">
                            <button type="button" onclick="editarParceiro('${p.id}')" class="btn-action-bar" style="flex:1;">✏️ Editar</button>
                            <button type="button" onclick="removerParceiro('${p.id}')" class="btn-action-bar btn-danger" style="flex:1;">🗑️ Excluir</button>
                        </div>
                    </div>
                `;
            });
        } catch (err) {
            container.innerHTML = `<p style="color:var(--warning); grid-column: 1/-1;">Erro ao carregar parceiros.</p>`;
        }
    };

    window.abrirFormParceiro = function() {
        const card = document.getElementById('cardFormParceiro');
        document.getElementById('formParceiroDinamico').reset();
        document.getElementById('parceiroId').value = '-1';
        document.getElementById('parceiroPreviewBox').style.display = 'none';
        document.getElementById('tituloFormParceiro').textContent = 'Cadastrar Novo Parceiro';
        if (card) { card.style.display = 'block'; card.scrollIntoView({ behavior: 'smooth' }); }
    };

    window.fecharFormParceiro = function() {
        document.getElementById('cardFormParceiro').style.display = 'none';
    };

    window.editarParceiro = async function(id) {
        const { data: p } = await _supabase.from('parceiros').select('*').eq('id', id).single();
        if(!p) return;
        document.getElementById('parceiroId').value = p.id;
        document.getElementById('parceiroNome').value = p.nome;
        document.getElementById('parceiroLogo').value = p.logo;
        document.getElementById('parceiroPreview').src = p.logo;
        document.getElementById('parceiroPreview').parentElement.style.display = 'flex';
        document.getElementById('tituloFormParceiro').textContent = "Editar Parceiro";
        document.getElementById('cardFormParceiro').style.display = "block";
    };

    // V6: removerParceiro definido na camada final.

    function iniciarDragAndDrop(containerId, tabelaSupabase, callback) {
        const container = document.getElementById(containerId);
        if (!container) return;
        let draggedItem = null;
        container.querySelectorAll('.draggable-card').forEach(item => {
            item.addEventListener('dragstart', () => {
                draggedItem = item;
                setTimeout(() => item.classList.add('dragging'), 0);
            });
            item.addEventListener('dragend', async () => {
                item.classList.remove('dragging');
                draggedItem = null;
                const items = container.querySelectorAll('.draggable-card');
                for (let index = 0; index < items.length; index++) {
                    const id = items[index].getAttribute('data-id');
                    if (id) await _supabase.from(tabelaSupabase).update({ ordem: index }).eq('id', id);
                }
                window.showToast("Ordem salva no banco!");
                if (callback) callback();
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const target = e.currentTarget;
                if (target && target !== draggedItem) {
                    const rect = target.getBoundingClientRect();
                    const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
                    container.insertBefore(draggedItem, next ? target.nextSibling : target);
                }
            });
        });
    }

    window.fecharFormGaleria = function() { document.getElementById('cardFormGaleria').style.display = 'none'; };
    window.fecharFormProf = function() { document.getElementById('cardFormProf').style.display = 'none'; };
    window.fecharFormNoticia = function() { document.getElementById('cardFormNoticia').style.display = 'none'; };
    window.fecharFormBanner = function() { document.getElementById('cardFormBanner').style.display = 'none'; };
    window.fecharFormUsr = function() { document.getElementById('cardFormUsr').style.display = 'none'; };

    window.editarFoto = async function(id) {
        const { data: f } = await _supabase.from('galeria').select('*').eq('id', id).single();
        if(!f) return;
        document.getElementById('fotoId').value = f.id;
        document.getElementById('fotoTitulo').value = f.titulo;
        document.getElementById('fotoCategoria').value = f.categoria;
        document.getElementById('fotoImg').value = f.img;
        document.getElementById('galeriaPreview').src = f.img;
        document.getElementById('galeriaPreview').parentElement.style.display = 'flex';
        document.getElementById('cardFormGaleria').style.display = 'block';
    };
    // V6: removerFoto definido na camada final.

    window.editarProf = async function(id) {
        const { data: p } = await _supabase.from('professores').select('*').eq('id', id).single();
        if(!p) return;
        document.getElementById('profId').value = p.id;
        document.getElementById('profNome').value = p.nome;
        document.getElementById('profEspecialidade').value = p.esp;
        document.getElementById('profInstagram').value = p.instagram || '';
        document.getElementById('profFacebook').value = p.facebook || '';
        document.getElementById('profFoto').value = p.foto;
        document.getElementById('profPreview').src = p.foto;
        document.getElementById('profPreview').parentElement.style.display = 'flex';
        document.getElementById('cardFormProf').style.display = 'block';
    };
    // V6: removerProf definido na camada final.

    window.editarNoticia = async function(id) {
        const { data: n } = await _supabase.from('noticias').select('*').eq('id', id).single();
        if(!n) return;
        document.getElementById('noticiaId').value = n.id;
        document.getElementById('noticiaTitulo').value = n.titulo;
        document.getElementById('noticiaCat').value = n.cat;
        document.getElementById('noticiaConteudo').value = n.conteudo;
        document.getElementById('cardFormNoticia').style.display = 'block';
    };
    // V6: removerNoticia definido na camada final.

    window.editarBanner = async function(id) {
        const { data: b } = await _supabase.from('banners').select('*').eq('id', id).single();
        if(!b) return;
        document.getElementById('bannerId').value = b.id;
        document.getElementById('bannerTitulo').value = b.titulo;
        document.getElementById('bannerPosicao').value = b.posicao;
        document.getElementById('bannerImg').value = b.img;
        document.getElementById('bannerPreview').src = b.img;
        document.getElementById('bannerPreview').parentElement.style.display = 'flex';
        document.getElementById('cardFormBanner').style.display = 'block';
    };
    // V6: removerBanner definido na camada final.

    // Gestão de usuários V2 é definida na camada segura ao final do arquivo.
    window.editarUsuario = function(id) { return window.editarStaffSeguro?.(id); };
    window.removerUsuario = function(id) { return window.desativarStaffSeguro?.(id); };


    window.alterarStatusContato = async function(id, novoStatus) {
        await _supabase.from('contatos').update({ status: novoStatus }).eq('id', id);
        window.carregarContatos();
        window.showToast("Status atualizado!");
    };

    // V6: backup final definido em v6-core.js.

    window.atualizarStatusBackupUI = function() {
        const el = document.getElementById('statusUltimoBackup');
        if (el) {
            const agora = new Date();
            el.textContent = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}`;
        }
    };

    window.toggleFeedbackAnonimo = function(isAnonimo) {
        const inputNome = document.getElementById('feedNome');
        const inputFoto = document.getElementById('feedFoto');
        const inputAlunoId = document.getElementById('feedAlunoId');

        if (isAnonimo) {
            inputNome.value = 'Aluno(a) Corpofitness';
            inputFoto.value = '';
            inputAlunoId.value = '';
            inputNome.disabled = true;
            inputFoto.disabled = true;
        } else {
            inputNome.disabled = false;
            inputFoto.disabled = false;
        }
    };

    window.verificarVencimentosTreinos3Meses = function() {
        if (typeof window.carregarLembretesFixosAdmin === 'function') {
            window.carregarLembretesFixosAdmin();
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const loginOverlay = document.getElementById('loginOverlay');
        const mainAppContainer = document.getElementById('mainAppContainer');
        const loginForm = document.getElementById('loginForm');
        const btnLogout = document.getElementById('btnLogout');
        const btnThemeToggle = document.getElementById('btnThemeToggle');
        const menuToggle = document.getElementById('menuToggle');
        const appSidebar = document.getElementById('appSidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        if (menuToggle && appSidebar && sidebarOverlay) {
            menuToggle.addEventListener('click', () => {
                appSidebar.classList.toggle('open');
                sidebarOverlay.classList.toggle('active');
            });
            sidebarOverlay.addEventListener('click', () => {
                appSidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            });
        }

        if (btnThemeToggle) {
            btnThemeToggle.addEventListener('click', () => {
                document.body.classList.toggle('light-mode');
                localStorage.setItem('corpofitness_admin_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
            });
            if (localStorage.getItem('corpofitness_admin_theme') === 'light') document.body.classList.add('light-mode');
        }

        let usuarioLogado = null;

        async function carregarPerfilStaff(authUser) {
            if (!authUser?.id) return null;
            const { data, error } = await _supabase
                .from('staff_profiles')
                .select('user_id,nome,email,nivel,ativo')
                .eq('user_id', authUser.id)
                .maybeSingle();
            if (error) throw error;
            if (!data || data.ativo === false) return null;
            return data;
        }

        const NIVEIS_ADMIN_PERMITIDOS = Object.freeze(['master', 'professor', 'recepcao']);

        function limparCredenciaisDaUrlAdmin() {
            try {
                const url = new URL(window.location.href);
                if (/access_token|refresh_token|error_description/i.test(url.hash || '') || url.searchParams.has('code')) {
                    url.hash = '';
                    url.searchParams.delete('code');
                    history.replaceState({}, document.title, url.pathname + (url.search || ''));
                }
            } catch (_) {}
        }

        function perfilAdministrativoValido(perfil) {
            return !!(
                perfil &&
                perfil.user_id &&
                perfil.ativo !== false &&
                NIVEIS_ADMIN_PERMITIDOS.includes(String(perfil.nivel || '').toLowerCase())
            );
        }

        async function negarAcessoAdministrativo(mensagem = 'Acesso não autorizado. Seu usuário não está cadastrado para acessar o painel administrativo.') {
            usuarioLogado = null;
            sessionStorage.removeItem('corpofitness_logado');
            localStorage.removeItem('corpofitness_logado');

            if (mainAppContainer) mainAppContainer.style.display = 'none';
            if (loginOverlay) loginOverlay.style.display = 'flex';

            const erroEl = document.getElementById('loginError');
            if (erroEl) {
                erroEl.textContent = mensagem;
                erroEl.style.display = 'block';
            }

            try {
                const { data: { session } } = await _supabase.auth.getSession();
                if (session) await _supabase.auth.signOut({ scope: 'local' });
            } catch (_) {}
        }

        async function autorizarSessaoAdministrativa(authUser) {
            if (!authUser?.id) {
                await negarAcessoAdministrativo('Faça login com um usuário previamente cadastrado no painel.');
                return null;
            }

            const perfil = await carregarPerfilStaff(authUser);

            if (!perfilAdministrativoValido(perfil)) {
                await negarAcessoAdministrativo(
                    'Acesso não autorizado. Esta conta não está cadastrada ou está desativada no painel administrativo.'
                );
                return null;
            }

            usuarioLogado = perfil;
            sessionStorage.setItem('corpofitness_logado', JSON.stringify(perfil));
            limparCredenciaisDaUrlAdmin();
            liberarPainel(perfil);
            return perfil;
        }

        async function restaurarSessaoSegura() {
            try {
                const { data:{ session }, error } = await _supabase.auth.getSession();
                if (error) throw error;
                if (!session?.user) {
                    if (mainAppContainer) mainAppContainer.style.display = 'none';
                    if (loginOverlay) loginOverlay.style.display = 'flex';
                    return;
                }
                await autorizarSessaoAdministrativa(session.user);
            } catch (err) {
                console.warn('[Auth] sessão administrativa não restaurada:', err?.message || err);
                await negarAcessoAdministrativo('Não foi possível validar sua autorização administrativa.');
            }
        }

        restaurarSessaoSegura();

        // OAuth/Google pode concluir a sessão depois do carregamento inicial da página.
        // Toda sessão SIGNED_IN é validada novamente contra staff_profiles.
        _supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setTimeout(() => {
                    autorizarSessaoAdministrativa(session.user).catch(err => {
                        console.error('[Auth] falha ao validar whitelist:', err);
                    });
                }, 0);
            }

            if (event === 'SIGNED_OUT') {
                usuarioLogado = null;
                sessionStorage.removeItem('corpofitness_logado');
                if (mainAppContainer) mainAppContainer.style.display = 'none';
                if (loginOverlay) loginOverlay.style.display = 'flex';
            }
        });

        if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
            const info = document.getElementById('loginSecurityInfo');
            if (info) info.innerHTML = '⚠️ <strong>Ambiente local:</strong> use a URL publicada na Vercel para login Google.';
        }

        const btnLoginGoogle = document.getElementById('btnLoginGoogle');
        if (btnLoginGoogle) {
            btnLoginGoogle.addEventListener('click', async () => {
                const erroEl = document.getElementById('loginError');
                if (erroEl) erroEl.style.display = 'none';

                const textoOriginal = btnLoginGoogle.innerHTML;
                btnLoginGoogle.disabled = true;
                btnLoginGoogle.innerHTML = '⏳ Abrindo Google...';

                try {
                    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
                        throw new Error('Login Google desativado no localhost. Abra a URL publicada na Vercel.');
                    }

                    sessionStorage.setItem('corpofitness.auth.area', 'admin');

                    const { data, error } = await _supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                            redirectTo: `${window.location.origin}/auth-callback.html?area=admin`,
                            queryParams: {
                                access_type: 'offline',
                                prompt: 'select_account'
                            }
                        }
                    });

                    if (error) throw error;
                    if (data?.url) window.location.assign(data.url);
                } catch (err) {
                    console.error('[Auth] falha no login Google:', err);
                    if (erroEl) {
                        erroEl.textContent = err?.message || 'Não foi possível iniciar o login com Google.';
                        erroEl.style.display = 'block';
                    }
                    btnLoginGoogle.disabled = false;
                    btnLoginGoogle.innerHTML = textoOriginal;
                }
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginUser').value.trim().toLowerCase();
                const senha = document.getElementById('loginPass').value;
                const erroEl = document.getElementById('loginError');
                if (erroEl) erroEl.style.display = 'none';

                try {
                    const { data, error } = await _supabase.auth.signInWithPassword({ email, password: senha });
                    if (error) throw error;

                    const perfil = await autorizarSessaoAdministrativa(data.user);
                    if (!perfil) return;
                } catch (err) {
                    console.error('[Auth] falha de login:', err);
                    if (erroEl) {
                        const msg = String(err?.message || '');
                        erroEl.textContent = /invalid login credentials/i.test(msg)
                            ? 'E-mail/senha inválidos. Se esta conta usa Google, clique em “Continuar com Google”.'
                            : (msg || 'Não foi possível entrar. Apenas usuários previamente cadastrados podem acessar.');
                        erroEl.style.display = 'block';
                    }
                }
            });
        }

        if (btnLogout) {
            btnLogout.addEventListener('click', async () => {
                try { await _supabase.auth.signOut({ scope: 'local' }); } catch (_) {}
                usuarioLogado = null;
                sessionStorage.removeItem('corpofitness_logado');
                localStorage.removeItem('corpofitness_logado');
                if (mainAppContainer) mainAppContainer.style.display = 'none';
                if (loginOverlay) loginOverlay.style.display = 'flex';
                const userInp = document.getElementById('loginUser');
                const passInp = document.getElementById('loginPass');
                if (userInp) userInp.value = '';
                if (passInp) passInp.value = '';
                window.showToast('Sessão encerrada com sucesso!');
            });
        }

        function liberarPainel(usuario) {
            if (!perfilAdministrativoValido(usuario)) {
                negarAcessoAdministrativo('Acesso não autorizado ao painel administrativo.');
                return;
            }

            if (loginOverlay) loginOverlay.style.display = 'none';
            if (mainAppContainer) mainAppContainer.style.display = 'flex';
            
            const topbarUserName = document.getElementById('topbarUserName');
            if (topbarUserName) topbarUserName.textContent = usuario.nome || 'Administrador';
            
            const nivel = usuario.nivel || 'professor';
            const topbarUserRole = document.getElementById('topbarUserRole');
            if (topbarUserRole) topbarUserRole.textContent = nivel.toUpperCase();

            const topbarAvatar = document.getElementById('topbarAvatar');
            if (topbarAvatar) topbarAvatar.textContent = (usuario.nome || 'AD').substring(0, 2).toUpperCase();

            montarMenuLateralPorNivel(nivel);
            iniciarPainel();
            window.aplicarPermissoesVisuaisV6?.(usuario);

        }

        const inputBusca = document.getElementById('inputBuscaAluno');
        if (inputBusca) {
            let buscaTimerV6 = null;
            inputBusca.addEventListener('input', () => {
                clearTimeout(buscaTimerV6);
                buscaTimerV6 = setTimeout(() => {
                    window.carregarAlunosAdmin?.({ pagina: 1, busca: inputBusca.value.trim() });
                }, 280);
            });
        }

        function montarMenuLateralPorNivel(nivel) {
            const menuList = document.getElementById('menuListDynamic');
            if (!menuList) return;

            const item = (target, icon, label, active=false) =>
                `<li><a href="#${target}" class="menu-link ${active?'active':''}" data-target="${target}">${icon} ${label}</a></li>`;
            const grupo = label => `<li class="menu-group-label">${label}</li>`;

            let htmlMenu = '';
            if (nivel === 'master') {
                htmlMenu = [
                    grupo('Operação'),
                    item('dashboard','📊','Visão Geral',true),
                    item('alunos','💪','Alunos & Treinos'),
                    item('biblioteca','🏋️','Biblioteca de Exercícios'),
                    item('contatos','📩','Atendimento'),
                    grupo('Academia'),
                    item('professores','👥','Professores'),
                    item('planos','💳','Planos & Preços'),
                    item('modalidadessecao','🥊','Modalidades'),
                    grupo('Site & Conteúdo'),
                    item('hero','🖼️','Banner Principal'),
                    item('estruturasecao','🏢','Estrutura'),
                    item('feedbacksecao','💬','Depoimentos'),
                    item('galeria','🖼️','Galeria'),
                    item('noticias','📰','Notícias'),
                    item('banners','📢','Banners'),
                    item('faqsecao','❓','FAQ'),
                    item('parceiros','🤝','Parceiros'),
                    grupo('Sistema'),
                    item('configuracoes','⚙️','Usuários & Acessos'),
                    item('auditsecao','🛡️','Auditoria'),
                    item('lixeirasecao','🗑️','Lixeira'),
                    item('backupsecao','💾','Backup & Segurança')
                ].join('');
            } else if (nivel === 'recepcao') {
                htmlMenu = [
                    grupo('Operação'),
                    item('dashboard','📊','Visão Geral',true),
                    item('alunos','👤','Cadastros de Alunos'),
                    item('contatos','📩','Atendimento')
                ].join('');
            } else if (nivel === 'professor') {
                htmlMenu = [
                    grupo('Treinamento'),
                    item('alunos','💪','Alunos, Treinos & Avaliações',true),
                    item('biblioteca','🏋️','Biblioteca de Exercícios')
                ].join('');
            }
            menuList.innerHTML = htmlMenu;
        }

        function iniciarPainel() {
            const menuLinks = document.querySelectorAll('.menu-link');
            const tabContents = document.querySelectorAll('.tab-content');
            
            menuLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = link.getAttribute('data-target');
                    menuLinks.forEach(l => l.classList.remove('active'));
                    tabContents.forEach(t => t.classList.remove('active'));
                    link.classList.add('active');
                    const targetTab = document.getElementById(`tab-${target}`);
                    if (targetTab) targetTab.classList.add('active');

                    if(window.innerWidth <= 900) {
                        appSidebar.classList.remove('open');
                        sidebarOverlay.classList.remove('active');
                    }
                });
            });

            const usuarioLogado = JSON.parse(sessionStorage.getItem('corpofitness_logado'));
            if (usuarioLogado && usuarioLogado.nivel === 'professor') {
                document.querySelectorAll('.menu-link').forEach(l => l.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                const linkAlunos = document.querySelector('[data-target="alunos"]');
                if(linkAlunos) linkAlunos.classList.add('active');
                const tabAlunos = document.getElementById('tab-alunos');
                if(tabAlunos) tabAlunos.classList.add('active');
            }

            async function carregarHeroConfig() {
                const { data: hero } = await _supabase.from('hero_config').select('*').eq('id', 1).single();
                if(hero) {
                    const t1 = document.getElementById('cfgHeroTitle1');
                    if (t1) t1.value = hero.t1 || '';
                    const t2 = document.getElementById('cfgHeroTitle2');
                    if (t2) t2.value = hero.t2 || '';
                    const sub = document.getElementById('cfgHeroSub');
                    if (sub) sub.value = hero.sub || '';
                    const video = document.getElementById('cfgHeroVideo');
                    if (video) video.value = hero.video || '';
                }
            }
            carregarHeroConfig();

            const formHeroConfig = document.getElementById('formHeroConfig');
            if (formHeroConfig) {
                formHeroConfig.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await _supabase.from('hero_config').upsert({
                        id: 1,
                        t1: document.getElementById('cfgHeroTitle1').value,
                        t2: document.getElementById('cfgHeroTitle2').value,
                        sub: document.getElementById('cfgHeroSub').value,
                        video: document.getElementById('cfgHeroVideo').value
                    });
                    window.showToast("Hero atualizada!");
                });
            }

            const btnAbrirNovoAluno = document.getElementById('btnAbrirNovoAluno');
            if (btnAbrirNovoAluno) btnAbrirNovoAluno.onclick = abrirFormAluno;

            const btnAbrirNovoPlano = document.getElementById('btnAbrirNovoPlano');
            if (btnAbrirNovoPlano) {
                btnAbrirNovoPlano.onclick = () => {
                    document.getElementById('formPlanoDinamico').reset();
                    document.getElementById('planoId').value = "-1";
                    document.getElementById('tituloFormPlano').textContent = "Cadastrar Novo Plano";
                    document.getElementById('cardFormPlano').style.display = "block";
                };
            }
            const btnFecharFormPlano = document.getElementById('btnFecharFormPlano');
            if (btnFecharFormPlano) btnFecharFormPlano.onclick = () => { document.getElementById('cardFormPlano').style.display = "none"; };

            const formPlanoDinamico = document.getElementById('formPlanoDinamico');
            if (formPlanoDinamico) {
                formPlanoDinamico.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const id = document.getElementById('planoId').value;
                    const novo = {
                        nome: document.getElementById('planoNome').value,
                        valor: document.getElementById('planoValor').value,
                        sufixo: document.getElementById('planoSufixo').value,
                        badge: document.getElementById('planoBadge').value,
                        destaque: document.getElementById('planoDestaque').value,
                        itens: document.getElementById('planoItens').value.split('\n').map(i => i.trim()).filter(i => i.length > 0)
                    };
                    if (id !== "-1") await _supabase.from('planos').update(novo).eq('id', id);
                    else await _supabase.from('planos').insert([novo]);
                    document.getElementById('cardFormPlano').style.display = "none";
                    window.carregarPlanosAdmin();
                    window.showToast("Plano salvo!");
                });
            }

            const formParceiro = document.getElementById('formParceiroDinamico');
            if (formParceiro) {
                formParceiro.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const id = document.getElementById('parceiroId').value;
                    const nome = document.getElementById('parceiroNome').value.trim();
                    const logo = document.getElementById('parceiroLogo').value.trim();
                    if (!logo) { alert('Selecione uma logomarca.'); return; }
                    const dadosParceiro = { nome, logo };
                    if (id !== "-1") await _supabase.from('parceiros').update(dadosParceiro).eq('id', id);
                    else await _supabase.from('parceiros').insert([{ ...dadosParceiro, ordem: 0 }]);
                    window.fecharFormParceiro();
                    window.carregarParceirosAdmin();
                    window.showToast("Parceiro salvo!");
                });
            }

            window.carregarGaleria = async function() {
                const { data: db } = await _supabase.from('galeria').select('*').order('ordem', { ascending: true });
                const container = document.getElementById('galeriaList');
                if(!container) return;
                container.classList.remove('skeleton-loading'); // Remove skeleton
                container.innerHTML = '';
                (db || []).forEach((f) => {
                    container.innerHTML += `
                        <div class="draggable-card" draggable="true" data-id="${f.id}" style="background: var(--dark-2); padding: 12px; border-radius: 12px; border: 1px solid var(--border); text-align: center;">
                            <div style="font-size:0.7rem; color:var(--primary-light); margin-bottom:4px; cursor:grab;">☰ Arraste</div>
                            <img src="${f.img}" style="width: 100%; height: 130px; border-radius: 8px; object-fit: cover; margin-bottom: 8px;">
                            <h4 style="font-size: 0.88rem; color: var(--text-color);">${f.titulo}</h4>
                            <div style="display:flex; gap:5px; justify-content:center; margin-top:8px;">
                                <button onclick="editarFoto('${f.id}')" class="btn-action-bar">✏️</button>
                                <button onclick="removerFoto('${f.id}')" class="btn-action-bar btn-danger">🗑️</button>
                            </div>
                        </div>
                    `;
                });
                const countGaleria = document.getElementById('countGaleria');
                if (countGaleria) countGaleria.textContent = (db || []).length;
                iniciarDragAndDrop('galeriaList', 'galeria', window.carregarGaleria);
            };

            const btnAbrirFoto = document.getElementById('btnAbrirNovaFoto');
            if(btnAbrirFoto) {
                btnAbrirFoto.onclick = () => {
                    document.getElementById('formGaleria').reset();
                    document.getElementById('fotoId').value = "-1";
                    document.getElementById('galeriaPreviewBox').style.display = 'none';
                    document.getElementById('tituloFormGaleria').textContent = "Adicionar Foto";
                    document.getElementById('cardFormGaleria').style.display = "block";
                };
            }

            const formGaleria = document.getElementById('formGaleria');
            if (formGaleria) {
                formGaleria.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const id = document.getElementById('fotoId').value;
                    const novaFoto = {
                        titulo: document.getElementById('fotoTitulo').value,
                        categoria: document.getElementById('fotoCategoria').value,
                        img: document.getElementById('fotoImg').value || 'https://via.placeholder.com/300x200'
                    };
                    if (id !== "-1") await _supabase.from('galeria').update(novaFoto).eq('id', id);
                    else await _supabase.from('galeria').insert([novaFoto]);
                    window.fecharFormGaleria();
                    window.carregarGaleria();
                    window.showToast("Foto salva!");
                });
            }

            window.carregarProfessores = async function() {
                const { data: db } = await _supabase.from('professores').select('*').order('created_at', { ascending: false });
                const container = document.getElementById('professoresList');
                container.classList.remove('skeleton-loading'); // Remove skeleton
                if(!container) return;
                container.innerHTML = '';
                (db || []).forEach((p) => {
                    container.innerHTML += `
                        <div style="background: var(--dark-2); padding: 15px; border-radius: 12px; border: 1px solid var(--border); text-align: center;">
                            <img src="${p.foto}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 10px;" onerror="this.src='https://via.placeholder.com/80';">
                            <h4 style="font-size: 0.95rem; color: var(--text-color);">${p.nome}</h4>
                            <p style="font-size: 0.75rem; color: var(--gray); margin-bottom: 8px;">${p.esp}</p>
                            <div style="display:flex; gap:5px; justify-content:center;">
                                <button onclick="editarProf('${p.id}')" class="btn-action-bar">✏️</button>
                                <button onclick="removerProf('${p.id}')" class="btn-action-bar btn-danger">🗑️</button>
                            </div>
                        </div>
                    `;
                });
                const countProf = document.getElementById('countProfessores');
                if (countProf) countProf.textContent = (db || []).length;
            };

            const btnAbrirNovoProf = document.getElementById('btnAbrirNovoProf');
            if (btnAbrirNovoProf) {
                btnAbrirNovoProf.onclick = () => {
                    document.getElementById('formProfessor').reset();
                    document.getElementById('profId').value = "-1";
                    document.getElementById('profPreviewBox').style.display = 'none';
                    document.getElementById('tituloFormProf').textContent = "Cadastrar Professor";
                    document.getElementById('cardFormProf').style.display = "block";
                };
            }

            const formProfessor = document.getElementById('formProfessor');
            if (formProfessor) {
                formProfessor.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const id = document.getElementById('profId').value;
                    const novoProf = {
                        nome: document.getElementById('profNome').value,
                        esp: document.getElementById('profEspecialidade').value,
                        instagram: document.getElementById('profInstagram').value,
                        facebook: document.getElementById('profFacebook').value,
                        foto: document.getElementById('profFoto').value || 'img/prof1.jpg'
                    };
                    if (id !== "-1") await _supabase.from('professores').update(novoProf).eq('id', id);
                    else await _supabase.from('professores').insert([novoProf]);
                    window.fecharFormProf();
                    window.carregarProfessores();
                    window.showToast("Professor salvo!");
                });
            }

            window.carregarNoticias = async function() {
                const { data: db } = await _supabase.from('noticias').select('*').order('created_at', { ascending: false });
                const tbody = document.getElementById('tabelaNoticiasBody');
                if(!tbody) return;
                tbody.classList.remove('skeleton-loading'); // Remove skeleton
                tbody.innerHTML = '';
                if (!db || db.length === 0) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--gray);">Nenhuma notícia.</td></tr>';
                else {
                    db.forEach((n) => {
                        tbody.innerHTML += `
                            <tr>
                                <td><strong>${n.titulo}</strong></td>
                                <td>${n.cat}</td>
                                <td><small style="color:var(--gray);">${(n.conteudo || '').substring(0, 40)}...</small></td>
                                <td style="text-align: right; white-space: nowrap;">
                                    <button onclick="editarNoticia('${n.id}')" class="btn-action-bar">✏️</button>
                                    <button onclick="removerNoticia('${n.id}')" class="btn-action-bar btn-danger">🗑️</button>
                                </td>
                            </tr>
                        `;
                    });
                }
            };

            const btnAbrirNovaNoticia = document.getElementById('btnAbrirNovaNoticia');
            if (btnAbrirNovaNoticia) {
                btnAbrirNovaNoticia.onclick = () => {
                    document.getElementById('formNoticia').reset();
                    document.getElementById('noticiaId').value = "-1";
                    document.getElementById('tituloFormNoticia').textContent = "Nova Postagem";
                    document.getElementById('cardFormNoticia').style.display = "block";
                };
            }

            const formNoticia = document.getElementById('formNoticia');
            if (formNoticia) {
                formNoticia.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const id = document.getElementById('noticiaId').value;
                    const nova = {
                        titulo: document.getElementById('noticiaTitulo').value,
                        cat: document.getElementById('noticiaCat').value,
                        conteudo: document.getElementById('noticiaConteudo').value
                    };
                    if (id !== "-1") await _supabase.from('noticias').update(nova).eq('id', id);
                    else await _supabase.from('noticias').insert([nova]);
                    window.fecharFormNoticia();
                    window.carregarNoticias();
                    window.showToast("Notícia salva!");
                });
            }

            window.carregarBanners = async function() {
                const { data: db } = await _supabase.from('banners').select('*').order('created_at', { ascending: false });
                const tbody = document.getElementById('tabelaBannersBody');
                if(!tbody) return;
                tbody.classList.remove('skeleton-loading'); // Remove skeleton
                tbody.innerHTML = '';
                if (!db || db.length === 0) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--gray);">Nenhum banner.</td></tr>';
                else {
                    db.forEach((b) => {
                        tbody.innerHTML += `
                            <tr>
                                <td><strong>${b.titulo}</strong></td>
                                <td><span style="background: var(--dark-2); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem;">${b.posicao}</span></td>
                                <td><img src="${b.img}" style="height: 40px; border-radius: 6px; object-fit: cover;"></td>
                                <td style="text-align: right; white-space: nowrap;">
                                    <button onclick="editarBanner('${b.id}')" class="btn-action-bar">✏️</button>
                                    <button onclick="removerBanner('${b.id}')" class="btn-action-bar btn-danger">🗑️</button>
                                </td>
                            </tr>
                        `;
                    });
                }
            };

            const btnAbrirNovoBanner = document.getElementById('btnAbrirNovoBanner');
            if (btnAbrirNovoBanner) {
                btnAbrirNovoBanner.onclick = () => {
                    document.getElementById('formBanner').reset();
                    document.getElementById('bannerId').value = "-1";
                    document.getElementById('bannerPreviewBox').style.display = 'none';
                    document.getElementById('tituloFormBanner').textContent = "Cadastrar Banner";
                    document.getElementById('cardFormBanner').style.display = "block";
                };
            }

            const formBanner = document.getElementById('formBanner');
            if (formBanner) {
                formBanner.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const id = document.getElementById('bannerId').value;
                    const novo = {
                        titulo: document.getElementById('bannerTitulo').value,
                        posicao: document.getElementById('bannerPosicao').value,
                        img: document.getElementById('bannerImg').value || 'https://via.placeholder.com/300x100'
                    };
                    if (id !== "-1") await _supabase.from('banners').update(novo).eq('id', id);
                    else await _supabase.from('banners').insert([novo]);
                    window.fecharFormBanner();
                    window.carregarBanners();
                    window.showToast("Banner salvo!");
                });
            }

            window.carregarUsuarios = async function() {
                if (typeof window.carregarStaffSeguro === 'function') return window.carregarStaffSeguro();
            };

            const btnAbrirNovoUsr = document.getElementById('btnAbrirNovoUsr');
            if (btnAbrirNovoUsr) {
                btnAbrirNovoUsr.onclick = () => {
                    document.getElementById('formUsuario')?.reset();
                    document.getElementById('usrId').value = '-1';
                    document.getElementById('usrNivel').value = 'professor';
                    document.getElementById('tituloFormUsr').textContent = 'Convidar Usuário';
                    document.getElementById('cardFormUsr').style.display = 'block';
                };
            }

            const formUsuario = document.getElementById('formUsuario');
            if (formUsuario) {
                formUsuario.addEventListener('submit', (e) => {
                    e.preventDefault();
                    window.salvarConviteStaffSeguro?.();
                });
            }


            window.carregarContatos = async function() {
                const { data: db } = await _supabase.from('contatos').select('*').order('created_at', { ascending: false });
                const tbody = document.getElementById('tabelaContatosBody');
                const dashBody = document.getElementById('dashboardUltimosContatos');
                if(tbody) tbody.innerHTML = '';
                if(dashBody) dashBody.innerHTML = '';
                tbody.classList.remove('skeleton-loading'); // Remove skeleton

                if (!db || db.length === 0) {
                    if(tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--gray);">Nenhuma mensagem cadastrada.</td></tr>';
                } else {
                    db.forEach((c, i) => {
                        const dataHora = new Date(c.created_at).toLocaleDateString('pt-BR') + ' ' + new Date(c.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                        const statusClass = c.status === 'Respondido' ? 'status-respondido' : (c.status === 'Matriculado' ? 'status-matriculado' : 'status-pendente');
                        const statusTexto = c.status || 'Pendente';

                        if(tbody) {
                            tbody.innerHTML += `
                                <tr>
                                    <td><small style="color:var(--gray);">${dataHora}</small></td>
                                    <td><strong>${c.nome}</strong></td>
                                    <td>${c.email}</td>
                                    <td>${c.tel}</td>
                                    <td>${c.msg}</td>
                                    <td><span class="status-badge ${statusClass}">${statusTexto}</span></td>
                                    <td style="text-align: right; display:flex; gap:4px; justify-content:flex-end; white-space: nowrap;">
                                        <select onchange="alterarStatusContato('${c.id}', this.value)" class="btn-action-bar">
                                            <option value="Pendente" ${statusTexto === 'Pendente' ? 'selected' : ''}>Pendente</option>
                                            <option value="Respondido" ${statusTexto === 'Respondido' ? 'selected' : ''}>Respondido</option>
                                            <option value="Matriculado" ${statusTexto === 'Matriculado' ? 'selected' : ''}>Matriculado</option>
                                        </select>
                                        <button onclick="removerContato('${c.id}')" class="btn-action-bar btn-danger">🗑️</button>
                                    </td>
                                </tr>
                            `;
                        }
                        if (dashBody && i < 5) {
                            dashBody.innerHTML += `
                                <tr>
                                    <td><small style="color:var(--gray);">${dataHora}</small></td>
                                    <td><strong>${c.nome}</strong></td>
                                    <td>${c.email}</td>
                                    <td>${c.tel}</td>
                                    <td><span class="status-badge ${statusClass}">${statusTexto}</span></td>
                                </tr>
                            `;
                        }
                    });
                }
                const countContatos = document.getElementById('countContatos');
                if (countContatos) countContatos.textContent = (db || []).length;
            };

            window.removerContato = async function(id) {
                if (confirm('Excluir mensagem?')) {
                    await _supabase.from('contatos').delete().eq('id', id);
                    window.carregarContatos();
                    window.showToast("Mensagem excluída!");
                }
            };

            window.carregarAlunosAdmin();
            window.carregarBiblioteca();
            window.carregarPlanosAdmin();
            window.carregarParceirosAdmin();
            window.carregarEstruturaAdmin();
            window.carregarModalidadesAdmin();
            window.carregarFeedbackAdmin();
            window.carregarFaqAdmin();
            window.carregarGaleria();
            window.carregarProfessores();
            window.carregarContatos();
            window.carregarNoticias();
            window.carregarBanners();
            window.carregarUsuarios();
            window.carregarLembretesFixosAdmin();
        }
    });

    window.abrirVideoDuvidaAdmin = function(nomeExercicio, urlVideo) {
        if (!urlVideo || urlVideo.trim() === "") {
            alert("Vídeo demonstrativo não cadastrado para este exercício.");
            return;
        }
        document.getElementById('videoModalTitulo').textContent = `Execução: ${nomeExercicio}`;

        let embedUrl = urlVideo;
        if (urlVideo.includes('watch?v=')) {
            embedUrl = urlVideo.replace('watch?v=', 'embed/');
        } else if (urlVideo.includes('youtu.be/')) {
            embedUrl = urlVideo.replace('youtu.be/', 'www.youtube.com/embed/');
        }

        document.getElementById('iframeVideoYoutube').src = embedUrl;
        document.getElementById('modalVideoAluno').style.display = 'flex';
    };

    window.fecharModalVideoAluno = function() {
        document.getElementById('modalVideoAluno').style.display = 'none';
        document.getElementById('iframeVideoYoutube').src = '';
    };

    window.abrirModalAvaliacaoFisicaCompleta = async function(idParam = null, nomeParam = null) {
        const alunoId = idParam || document.getElementById('tr_aluno_id')?.value;
        const alunoNome = nomeParam || document.getElementById('tr_nome')?.value || "Aluno";

        if (!alunoId || alunoId === '-1') {
            alert("Por favor, selecione ou salve um aluno válido primeiro.");
            return;
        }

        document.getElementById('aval_aluno_id').value = alunoId;
        document.getElementById('aval_nome_aluno').textContent = `Aluno(a): ${alunoNome}`;

        const hoje = new Date();
        document.getElementById('aval_data').value = String(hoje.getDate()).padStart(2, '0') + '/' + String(hoje.getMonth() + 1).padStart(2, '0') + '/' + hoje.getFullYear();

        document.querySelectorAll('.dobra-input').forEach(i => i.value = '');
        document.querySelectorAll('.perim-dir').forEach(i => i.value = '');
        document.querySelectorAll('.perim-esq').forEach(i => i.value = '');
        document.getElementById('aval_peso').value = '';
        document.getElementById('aval_altura').value = '';
        document.getElementById('aval_idade').value = '';
        document.getElementById('aval_sexo').value = '';
        document.getElementById('aval_imc_val').textContent = '0,00';
        document.getElementById('aval_soma_dobras').textContent = '0';
        document.getElementById('aval_gordura_pct').textContent = '—';

        try {
            const { data: avalList } = await _supabase.from('avaliacoes_fisicas').select('*').eq('aluno_id', alunoId).order('created_at', { ascending: false }).limit(1);
            if (avalList && avalList.length > 0) {
                const aval = avalList[0];
                document.getElementById('aval_peso').value = aval.peso || '';
                document.getElementById('aval_altura').value = aval.altura || '';
                
                if (aval.conteudo_detalhado) {
                    try {
                        const detalhe = JSON.parse(aval.conteudo_detalhado);
                        if (detalhe.idade != null) document.getElementById('aval_idade').value = detalhe.idade;
                        if (detalhe.sexo) document.getElementById('aval_sexo').value = detalhe.sexo;
                        if (detalhe.dobras) {
                            document.querySelectorAll('.dobra-input').forEach(inp => {
                                const nome = inp.getAttribute('data-nome');
                                if (detalhe.dobras[nome] !== undefined) inp.value = detalhe.dobras[nome];
                            });
                        }
                        if (detalhe.perimetria_dir) {
                            document.querySelectorAll('.perim-dir').forEach(inp => {
                                const nome = inp.getAttribute('data-nome');
                                if (detalhe.perimetria_dir[nome] !== undefined) inp.value = detalhe.perimetria_dir[nome];
                            });
                        }
                        if (detalhe.perimetria_esq) {
                            document.querySelectorAll('.perim-esq').forEach(inp => {
                                const nome = inp.getAttribute('data-nome');
                                if (detalhe.perimetria_esq[nome] !== undefined) inp.value = detalhe.perimetria_esq[nome];
                            });
                        }
                    } catch(e) {}
                }
            }
        } catch(e) {
            console.log("Erro ao carregar histórico de avaliação: ", e);
        }

        calcularIMCIMAGEM();
        somarDobras();
        calcularPercentualGordura();
        calcularRCQ();

        document.getElementById('modalAvaliacaoCorporalCompleta').style.display = 'flex';
    };

    window.fecharModalAvaliacaoCorporal = function() {
        document.getElementById('modalAvaliacaoCorporalCompleta').style.display = 'none';
    };

    window.calcularIMCIMAGEM = function() {
        const peso = parseFloat(document.getElementById('aval_peso').value) || 0;
        const altura = parseFloat(document.getElementById('aval_altura').value) || 0;

        if (peso > 0 && altura > 0) {
            const imc = peso / (altura * altura);
            document.getElementById('aval_imc_val').textContent = imc.toFixed(2).replace('.', ',');
            
            let classificacao = "Normal";
            let cor = "var(--accent-success)";
            if (imc < 18.5) { classificacao = "Abaixo do peso"; cor = "var(--accent-warning)"; }
            else if (imc >= 25 && imc < 30) { classificacao = "Sobrepeso"; cor = "var(--accent-warning)"; }
            else if (imc >= 30) { classificacao = "Obesidade"; cor = "var(--accent-danger)"; }

            const classEl = document.getElementById('aval_imc_class');
            classEl.textContent = classificacao;
            classEl.style.color = cor;
        } else {
            document.getElementById('aval_imc_val').textContent = '0,00';
        }
    };

    window.somarDobras = function() {
        let soma = 0;
        document.querySelectorAll('.dobra-input').forEach(input => { soma += parseFloat(input.value) || 0; });
        document.getElementById('aval_soma_dobras').textContent = soma.toFixed(1).replace(/\.0$/, '');
        window.calcularPercentualGordura?.();
    };

    window.obterDadosCalculoGordura = function() {
        const idade = parseInt(document.getElementById('aval_idade')?.value, 10);
        const sexo = document.getElementById('aval_sexo')?.value || '';
        const dobras = {};
        document.querySelectorAll('.dobra-input').forEach(inp => { dobras[inp.dataset.nome] = parseFloat(inp.value) || 0; });
        const jp7 = ['peitoral','axilar_media','tricipital','subescapular','abdominal','supra_iliaca','coxa'];
        const vals = jp7.map(k => Number(dobras[k]) || 0);
        return { idade, sexo, dobras, soma7: vals.reduce((a,b)=>a+b,0), preenchidas: vals.every(v=>v>0) };
    };

    window.calcularPercentualGordura = function() {
        const el = document.getElementById('aval_gordura_pct');
        if (!el) return null;
        const { idade, sexo, soma7, preenchidas } = window.obterDadosCalculoGordura();
        if (!preenchidas || !sexo || !Number.isFinite(idade) || idade < 18 || idade > 100) {
            el.textContent = '—'; el.dataset.valor = ''; return null;
        }
        let dc = null;
        if (sexo === 'M') dc = 1.112 - 0.00043499*soma7 + 0.00000055*soma7*soma7 - 0.00028826*idade;
        if (sexo === 'F') dc = 1.097 - 0.00046971*soma7 + 0.00000056*soma7*soma7 - 0.00012828*idade;
        if (!dc || dc <= 0) { el.textContent='—'; el.dataset.valor=''; return null; }
        const pct = (495/dc)-450;
        if (!Number.isFinite(pct) || pct < 1 || pct > 70) { el.textContent='—'; el.dataset.valor=''; return null; }
        const v = Number(pct.toFixed(1));
        el.textContent = v.toFixed(1).replace('.', ',') + '%'; el.dataset.valor = String(v);
        return v;
    };

    window.calcularRCQ = function() {
        let cintura = 0;
        let quadril = 0;
        document.querySelectorAll('.perim-dir').forEach(inp => {
            if (inp.getAttribute('data-nome') === 'cintura') cintura = parseFloat(inp.value) || 0;
            if (inp.getAttribute('data-nome') === 'quadril') quadril = parseFloat(inp.value) || 0;
        });

        if (cintura > 0 && quadril > 0) {
            const rcq = cintura / quadril;
            document.getElementById('aval_rcq_val').textContent = rcq.toFixed(2).replace('.', ',');
            
            let risco = "Baixo";
            if (rcq > 0.85) risco = "Moderado/Alto";
            document.getElementById('aval_rcq_class').textContent = risco;
        } else {
            document.getElementById('aval_rcq_val').textContent = '0,00';
        }
    };

    window.salvarAvaliacaoCorporalCompleta = async function() {
        const alunoId = document.getElementById('aval_aluno_id').value;
        const peso = parseFloat(document.getElementById('aval_peso').value) || null;
        const altura = parseFloat(document.getElementById('aval_altura').value) || null;

        const dobras = {};
        document.querySelectorAll('.dobra-input').forEach(inp => {
            dobras[inp.getAttribute('data-nome')] = parseFloat(inp.value) || 0;
        });

        const perimetria_dir = {};
        document.querySelectorAll('.perim-dir').forEach(inp => {
            perimetria_dir[inp.getAttribute('data-nome')] = parseFloat(inp.value) || 0;
        });

        const perimetria_esq = {};
        document.querySelectorAll('.perim-esq').forEach(inp => {
            if (inp.getAttribute('data-nome')) {
                perimetria_esq[inp.getAttribute('data-nome')] = parseFloat(inp.value) || 0;
            }
        });

        const idade = parseInt(document.getElementById('aval_idade')?.value, 10) || null;
        const sexo = document.getElementById('aval_sexo')?.value || null;
        const calcGordura = window.obterDadosCalculoGordura();
        const percentualGordura = window.calcularPercentualGordura();
        const somaDobras9 = Array.from(document.querySelectorAll('.dobra-input')).reduce((t,i)=>t+(parseFloat(i.value)||0),0);

        const pacoteDetalhado = {
            dobras: dobras,
            perimetria_dir: perimetria_dir,
            perimetria_esq: perimetria_esq,
            idade: idade,
            sexo: sexo,
            soma_dobras_9: Number(somaDobras9.toFixed(1)),
            soma_dobras_jp7: Number((calcGordura?.soma7 || 0).toFixed(1)),
            percentual_gordura: percentualGordura,
            metodo_gordura: percentualGordura !== null ? 'Jackson-Pollock 7 + Siri' : null
        };

        if (!alunoId || alunoId === '-1') {
            alert("Erro: ID do aluno inválido.");
            return;
        }

        try {
            const dadosPayload = {
                aluno_id: alunoId,
                peso: peso,
                altura: altura,
                gordura: percentualGordura,
                soma_dobras: Number(somaDobras9.toFixed(1)),
                metodo_gordura: percentualGordura !== null ? 'Jackson-Pollock 7 + Siri' : null,
                idade: idade,
                sexo: sexo,
                avaliado_em: new Date().toISOString(),
                conteudo_detalhado: JSON.stringify(pacoteDetalhado)
            };

            // Sempre insere um novo registro para criar um histórico de avaliações
            const { error: insertError } = await _supabase
                .from('avaliacoes_fisicas')
                .insert([dadosPayload]);

            if (insertError) throw insertError;
            // A avaliação não altera mais created_at do treino. Datas de treino e avaliação são independentes.

            window.showToast("Avaliação Corporal salva e atualizada com sucesso!");
            fecharModalAvaliacaoCorporal();
            
            if (typeof window.carregarLembretesFixosAdmin === 'function') {
                await window.carregarLembretesFixosAdmin();
            }
            if (typeof window.carregarAlunosAdmin === 'function') {
                await window.carregarAlunosAdmin();
            }

        } catch(err) {
            console.error("Erro crítico ao salvar avaliação no Supabase: ", err);
            alert("Erro ao atualizar o banco de dados: " + (err.message || JSON.stringify(err)));
        }
    };

    let chartInstance = null;
    let chartGorduraInstance = null;

    window.abrirModalHistoricoAvaliacoes = async function(alunoId, alunoNome) {
        const modal = document.getElementById('modalHistoricoAvaliacoes');
        const tbody = document.getElementById('tabelaHistoricoAvaliacoesBody');
        const titulo = document.getElementById('tituloHistoricoAvaliacoes');
        const btnExportar = document.getElementById('btnExportarPDFHistorico');
        
        if (!modal || !tbody || !titulo) return;

        titulo.textContent = `Histórico de Avaliações: ${alunoNome}`;
        if (btnExportar) {
            btnExportar.onclick = () => exportarHistoricoPDF(alunoId, alunoNome);
        }

        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray);">Carregando histórico...</td></tr>';
        modal.style.display = 'flex';

        try {
            const { data: avaliacoes, error } = await _supabase
                .from('avaliacoes_fisicas')
                .select('*')
                .eq('aluno_id', alunoId)
                .order('created_at', { ascending: true }); // Ascendente para o gráfico

            if (error) throw error;

            const chartsContainer = document.getElementById('chartsContainer');
            if (!avaliacoes || avaliacoes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--gray);">Nenhum histórico de avaliação encontrado para este aluno.</td></tr>';
                if (chartsContainer) chartsContainer.style.display = 'none';
                return;
            }

            if (chartsContainer) chartsContainer.style.display = 'grid';
            tbody.innerHTML = '';
            // Inverte para a tabela mostrar o mais recente primeiro
            avaliacoes.slice().reverse().forEach(aval => {
                const dataFormatada = new Date(aval.created_at).toLocaleDateString('pt-BR');
                const peso = aval.peso || '-';
                const altura = aval.altura || '-';
                let imc = '-';
                if (peso !== '-' && altura > 0) {
                    imc = (peso / (altura * altura)).toFixed(2);
                }
                const gordura = aval.gordura ? `${aval.gordura.toFixed(1)}` : '-';

                tbody.innerHTML += `<tr><td><strong>${dataFormatada}</strong></td><td>${peso}</td><td>${altura}</td><td>${imc}</td><td>${gordura}</td></tr>`;
            });

            // --- Lógica do Gráfico ---
            const ctxPeso = document.getElementById('graficoEvolucaoPeso').getContext('2d');
            if (chartInstance) {
                chartInstance.destroy();
            }

            const labels = avaliacoes.map(a => new Date(a.created_at).toLocaleDateString('pt-BR'));
            const pesos = avaliacoes.map(a => a.peso || null);

            chartInstance = new Chart(ctxPeso, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Evolução do Peso (kg)',
                        data: pesos,
                        borderColor: 'var(--primary)',
                        backgroundColor: 'rgba(30, 136, 229, 0.2)',
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: 'var(--primary-light)',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        spanGaps: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: false, ticks: { color: 'var(--gray)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { ticks: { color: 'var(--gray)' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    },
                    plugins: { legend: { labels: { color: 'var(--text-color)' } } }
                }
            });

            // --- Lógica do Gráfico de Gordura ---
            const gorduraChartDiv = document.getElementById('gorduraChartContainer');
            const ctxGordura = document.getElementById('graficoEvolucaoGordura').getContext('2d');
            if (chartGorduraInstance) {
                chartGorduraInstance.destroy();
            }

            const gorduras = avaliacoes.map(a => a.gordura || null);

            if (gorduras.some(g => g !== null)) {
                if (gorduraChartDiv) gorduraChartDiv.style.display = 'block';
                if (chartsContainer) chartsContainer.style.gridTemplateColumns = '1fr 1fr';

                chartGorduraInstance = new Chart(ctxGordura, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Evolução do % de Gordura',
                            data: gorduras,
                            borderColor: 'var(--warning)',
                            backgroundColor: 'rgba(255, 152, 0, 0.2)',
                            fill: true,
                            tension: 0.3,
                            pointBackgroundColor: '#ffb74d',
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            spanGaps: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: false, ticks: { color: 'var(--gray)', callback: value => value + '%' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                            x: { ticks: { color: 'var(--gray)' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                        },
                        plugins: { 
                            legend: { labels: { color: 'var(--text-color)' } },
                            tooltip: {
                                callbacks: {
                                    label: (context) => `${context.dataset.label || ''}: ${context.parsed.y !== null ? context.parsed.y.toFixed(1) + '%' : 'N/A'}`
                                }
                            }
                        }
                    }
                });
            } else {
                if (gorduraChartDiv) gorduraChartDiv.style.display = 'none';
                if (chartsContainer) chartsContainer.style.gridTemplateColumns = '1fr';
            }
        } catch (err) {
            console.error("Erro ao carregar histórico de avaliações:", err);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Erro ao carregar histórico: ${err.message}</td></tr>`;
        }
    };

    window.exportarHistoricoPDF = async function(alunoId, alunoNome) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        try {
            const { data: avaliacoes, error } = await _supabase
                .from('avaliacoes_fisicas')
                .select('*')
                .eq('aluno_id', alunoId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            doc.setFontSize(18);
            doc.text(`Histórico de Avaliações - ${alunoNome}`, 14, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

            if (!avaliacoes || avaliacoes.length === 0) {
                doc.text("Nenhum histórico de avaliação encontrado para este aluno.", 14, 40);
            } else {
                const tableColumn = ["Data", "Peso (kg)", "Altura (m)", "IMC", "% Gordura"];
                const tableRows = avaliacoes.map(aval => {
                    const dataFormatada = new Date(aval.created_at).toLocaleDateString('pt-BR');
                    const peso = aval.peso || '-';
                    const altura = aval.altura || '-';
                    const imc = (peso && altura) ? (peso / (altura * altura)).toFixed(2) : '-';
                    const gordura = aval.gordura ? `${aval.gordura.toFixed(1)}` : '-';
                    return [dataFormatada, peso, altura, imc, gordura];
                });

                doc.autoTable({ head: [tableColumn], body: tableRows, startY: 35, theme: 'striped', headStyles: { fillColor: [30, 136, 229] } });
            }

            doc.save(`historico_avaliacoes_${alunoNome.replace(/\s+/g, '_').toLowerCase()}.pdf`);
            window.showToast("PDF gerado com sucesso!");

        } catch (err) {
            alert("Erro ao gerar PDF: " + err.message);
        }
    };

    window.carregarLembretesFixosAdmin = async function() {
        const tbody = document.getElementById('tabelaLembretesFixosAdminBody');
        const badgeTotal = document.getElementById('badgeTotalAlertasAdmin');
        if (!tbody) return;

        try {
            tbody.classList.add('skeleton-loading'); // Adiciona skeleton
            const { data: treinos } = await _supabase.from('treinos_alunos').select('*');
            const { data: alunos } = await _supabase.from('alunos').select('*');

            if (!treinos || treinos.length === 0 || !alunos || alunos.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--gray);">Nenhum registro encontrado para análise.</td></tr>`;
                if (badgeTotal) badgeTotal.textContent = '0 Alertas';
                return;
            }

            tbody.classList.remove('skeleton-loading'); // Remove skeleton
            tbody.innerHTML = '';
            let totalAlertas = 0;
            const hoje = new Date();

            const ultimosTreinosPorAluno = {};
            treinos.forEach(t => {
                if (!ultimosTreinosPorAluno[t.aluno_id] || new Date(t.created_at) > new Date(ultimosTreinosPorAluno[t.aluno_id].created_at)) {
                    ultimosTreinosPorAluno[t.aluno_id] = t;
                }
            });

            Object.values(ultimosTreinosPorAluno).forEach(t => {
                const alunoObj = alunos.find(a => a.id === t.aluno_id);
                if (!alunoObj) return;

                const dataInicio = new Date(t.created_at);
                const dataVencimento = new Date(dataInicio);
                dataVencimento.setMonth(dataVencimento.getMonth() + 3);

                const diferencaTempo = dataVencimento.getTime() - hoje.getTime();
                const diasRestantes = Math.ceil(diferencaTempo / (1000 * 3600 * 24));

                if (diasRestantes <= 15) {
                    totalAlertas++;
                    const formatoVenc = dataVencimento.toLocaleDateString('pt-BR');
                    const formatoInicio = dataInicio.toLocaleDateString('pt-BR');

                    let statusTag = '';
                    if (diasRestantes < 0) {
                        statusTag = `<span style="color: var(--danger); font-weight: bold;">Vencido há ${Math.abs(diasRestantes)} dias</span>`;
                    } else if (diasRestantes === 0) {
                        statusTag = `<span style="color: var(--warning); font-weight: bold;">Vence HOJE!</span>`;
                    } else {
                        statusTag = `<span style="color: var(--warning);">Vence em ${diasRestantes} dias</span>`;
                    }

                    tbody.innerHTML += `
                        <tr>
                            <td><strong>${alunoObj.nome}</strong><br><span style="font-size:0.75rem; color: var(--text-muted);">${alunoObj.tel || 'Sem tel'}</span></td>
                            <td>${alunoObj.plano || 'Musculação'}</td>
                            <td>${formatoInicio}</td>
                            <td>${formatoVenc}<br>${statusTag}</td>
                            <td style="text-align: right; white-space: nowrap;">
                                <button onclick="abrirModalAvaliacaoFisicaCompleta('${alunoObj.id}', '${alunoObj.nome}')" class="btn-action-bar" style="background: var(--primary); color: #fff;" title="Fazer Avaliação Corporal"><i class="fa-solid fa-scale-balanced"></i> Reavaliar</button>
                            </td>
                        </tr>
                    `;
                }
            });

            if (badgeTotal) badgeTotal.textContent = `${totalAlertas} Alerta(s)`;

            if (totalAlertas === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--gray);">Nenhum aluno com ciclo de 3 meses próximo ao vencimento no momento. Todos em dia!</td></tr>`;
            }

        } catch (err) {
            console.error("Erro ao carregar lembretes administrativos:", err);
        }
    };
// ============================================
// BIBLIOTECA DE EXERCÍCIOS (SUPABASE STORAGE)
// ============================================
const STORAGE_BUCKET = 'videos-exercicios';
const VIDEO_MAX_SIZE_MB = 250;

function normalizarLinkVideo(url) {
    if (!url) return '';
    let valor = String(url).trim();

    try {
        const github = valor.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i);
        if (github) {
            valor = `https://raw.githubusercontent.com/${github[1]}/${github[2]}/${github[3]}`;
        }
    } catch (_) {}

    return valor;
}

function videoUrlEhStorage(url) {
    return !!url && (
        url.includes(`/storage/v1/object/public/${STORAGE_BUCKET}/`) ||
        url.includes(`/storage/v1/object/authenticated/${STORAGE_BUCKET}/`) ||
        url.includes(`/storage/v1/object/sign/${STORAGE_BUCKET}/`)
    );
}

async function uploadVideoToStorage(file, nomeExercicio) {
    try {
        if (!file) throw new Error('Nenhum arquivo de vídeo foi selecionado.');

        const maxBytes = VIDEO_MAX_SIZE_MB * 1024 * 1024;
        if (file.size > maxBytes) {
            throw new Error(`O vídeo excede o limite definido pelo painel (${VIDEO_MAX_SIZE_MB} MB).`);
        }

        const timestamp = Date.now();
        const nomeBase = String(nomeExercicio || 'exercicio')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .toLowerCase();

        const extensao = (file.name.split('.').pop() || 'mp4').toLowerCase();
        const fileName = `${nomeBase}_${timestamp}.${extensao}`;
        const filePath = `exercicios/${fileName}`;

        const statusEl = document.getElementById('uploadStatus');
        if (statusEl) statusEl.textContent = `⏳ Enviando ${(file.size / 1024 / 1024).toFixed(1)} MB...`;

        const { error } = await _supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || 'video/mp4'
            });

        if (error) {
            console.error('Erro no upload:', error);
            if (statusEl) statusEl.textContent = '❌ Erro no upload: ' + error.message;
            throw new Error('Erro ao fazer upload do vídeo: ' + error.message);
        }

        const { data: urlData } = _supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
            throw new Error('O arquivo foi enviado, mas o Supabase não retornou uma URL pública.');
        }

        if (statusEl) statusEl.textContent = '✅ Upload concluído e URL gerada!';
        return urlData.publicUrl;

    } catch (err) {
        console.error('Erro no upload do vídeo:', err);
        const statusEl = document.getElementById('uploadStatus');
        if (statusEl) statusEl.textContent = '❌ ' + err.message;
        throw err;
    }
}

async function deleteVideoFromStorage(videoUrl) {
    if (!videoUrl || !videoUrlEhStorage(videoUrl)) return;

    try {
        const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
        const marker2 = `/storage/v1/object/authenticated/${STORAGE_BUCKET}/`;
        const marker3 = `/storage/v1/object/sign/${STORAGE_BUCKET}/`;

        let filePath = '';
        if (videoUrl.includes(marker)) filePath = decodeURIComponent(videoUrl.split(marker)[1].split('?')[0]);
        else if (videoUrl.includes(marker2)) filePath = decodeURIComponent(videoUrl.split(marker2)[1].split('?')[0]);
        else if (videoUrl.includes(marker3)) filePath = decodeURIComponent(videoUrl.split(marker3)[1].split('?')[0]);

        if (!filePath) return;

        const { error } = await _supabase.storage
            .from(STORAGE_BUCKET)
            .remove([filePath]);

        if (error) console.warn('Erro ao deletar vídeo do Storage:', error);
    } catch (err) {
        console.warn('Erro ao deletar vídeo:', err);
    }
}

window.previewVideoUpload = function(input) {
    const file = input.files[0];
    const container = document.getElementById('videoPreviewContainer');
    const video = document.getElementById('videoPreview');
    const fileName = document.getElementById('videoFileName');
    const fileSize = document.getElementById('videoFileSize');
    const hiddenInput = document.getElementById('exercicioVideo');
    const urlInput = document.getElementById('exercicioVideoUrl');
    const statusEl = document.getElementById('uploadStatus');

    if (file) {
        if (file.size > VIDEO_MAX_SIZE_MB * 1024 * 1024) {
            alert(`O arquivo é muito grande! O limite definido pelo painel é ${VIDEO_MAX_SIZE_MB}MB.`);
            input.value = '';
            container.style.display = 'none';
            hiddenInput.value = '';
            if (statusEl) statusEl.textContent = '';
            return;
        }

        const tiposPermitidos = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
        if (file.type && !tiposPermitidos.includes(file.type)) {
            alert('Formato de vídeo não suportado. Use MP4, WebM, OGG ou MOV.');
            input.value = '';
            container.style.display = 'none';
            hiddenInput.value = '';
            if (statusEl) statusEl.textContent = '';
            return;
        }

        if (urlInput) urlInput.value = '';

        video.src = URL.createObjectURL(file);
        container.style.display = 'flex';
        fileName.textContent = file.name;
        fileSize.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
        if (statusEl) statusEl.textContent = '📤 Pronto para enviar ao Supabase Storage';
        hiddenInput.value = '';
    } else {
        container.style.display = 'none';
        hiddenInput.value = '';
        if (statusEl) statusEl.textContent = '';
    }
};

window.usarLinkVideoExercicio = function() {
    const urlInput = document.getElementById('exercicioVideoUrl');
    const fileInput = document.getElementById('exercicioVideoFile');
    const url = normalizarLinkVideo(urlInput?.value || '');

    if (!url) {
        alert('Informe o link do vídeo primeiro.');
        return;
    }

    if (!/^https?:\/\//i.test(url)) {
        alert('O link precisa começar com http:// ou https://');
        return;
    }

    if (fileInput) fileInput.value = '';

    const video = document.getElementById('videoPreview');
    const container = document.getElementById('videoPreviewContainer');
    const fileName = document.getElementById('videoFileName');
    const fileSize = document.getElementById('videoFileSize');
    const statusEl = document.getElementById('uploadStatus');

    document.getElementById('exercicioVideo').value = url;
    if (video) video.src = url;
    if (container) container.style.display = 'flex';
    if (fileName) fileName.textContent = 'Vídeo por URL';
    if (fileSize) fileSize.textContent = 'Link salvo no banco';
    if (statusEl) statusEl.textContent = '🔗 URL pronta para salvar';
};

window.converterLinkGithubVideo = function() {
    const input = document.getElementById('exercicioVideoUrl');
    if (!input || !input.value.trim()) {
        alert('Cole primeiro o link do GitHub.');
        return;
    }
    const convertido = normalizarLinkVideo(input.value.trim());
    input.value = convertido;
    usarLinkVideoExercicio();
};

window.limparVideoExercicio = function() {
    const inputUrl = document.getElementById('exercicioVideoUrl');
    const inputFile = document.getElementById('exercicioVideoFile');
    const hidden = document.getElementById('exercicioVideo');
    const preview = document.getElementById('videoPreview');
    const container = document.getElementById('videoPreviewContainer');
    const status = document.getElementById('uploadStatus');
    if (inputUrl) inputUrl.value = '';
    if (inputFile) inputFile.value = '';
    if (hidden) hidden.value = '';
    if (preview) {
        preview.pause();
        preview.removeAttribute('src');
        preview.load();
    }
    if (container) container.style.display = 'none';
    if (status) status.textContent = '🗑️ Vídeo marcado para remoção ao salvar.';
};

window.abrirFormExercicio = function() {
    document.getElementById('formExercicioDinamico').reset();
    document.getElementById('exercicioId').value = "-1";
    document.getElementById('videoPreviewContainer').style.display = 'none';
    document.getElementById('exercicioVideo').value = '';
    const urlInputNovo = document.getElementById('exercicioVideoUrl');
    if (urlInputNovo) urlInputNovo.value = '';
    const fileInputNovo = document.getElementById('exercicioVideoFile');
    if (fileInputNovo) fileInputNovo.value = '';
    document.getElementById('uploadStatus').textContent = '';
    document.getElementById('tituloFormExercicio').textContent = "Cadastrar Exercício";
    document.getElementById('cardFormExercicio').style.display = "block";
};

window.fecharFormExercicio = function() {
    document.getElementById('cardFormExercicio').style.display = "none";
};

// V6: carregarBiblioteca definido na camada final.

window.editarExercicio = async function(id) {
    try {
        const { data: ex, error } = await _supabase
            .from('biblioteca_exercicios')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !ex) {
            alert('Erro ao carregar dados do exercício.');
            return;
        }

        document.getElementById('exercicioId').value = ex.id;
        document.getElementById('exercicioNome').value = ex.nome || '';
        document.getElementById('exercicioGrupo').value = ex.grupo_principal || 'Outros';
        document.getElementById('exercicioEquipamento').value = ex.equipamento || 'Outros';
        document.getElementById('exercicioTipo').value = ex.tipo || 'Composto';

        const urlInputEdicao = document.getElementById('exercicioVideoUrl');
        const fileInputEdicao = document.getElementById('exercicioVideoFile');
        if (urlInputEdicao) urlInputEdicao.value = ex.video_url || '';
        if (fileInputEdicao) fileInputEdicao.value = '';
        
        if (ex.video_url && ex.video_url.trim() !== "") {
            const videoPreview = document.getElementById('videoPreview');
            const container = document.getElementById('videoPreviewContainer');
            const fileName = document.getElementById('videoFileName');
            const fileSize = document.getElementById('videoFileSize');
            const statusEl = document.getElementById('uploadStatus');
            
            videoPreview.src = ex.video_url;
            container.style.display = 'flex';
            fileName.textContent = 'Vídeo atual carregado do servidor';
            fileSize.textContent = 'Clique em "Atualizar" para trocar o vídeo';
            if (statusEl) statusEl.textContent = '✅ Vídeo existente';
            document.getElementById('exercicioVideo').value = ex.video_url;
        } else {
            document.getElementById('videoPreviewContainer').style.display = 'none';
            document.getElementById('exercicioVideo').value = '';
            document.getElementById('uploadStatus').textContent = '';
        }

        document.getElementById('tituloFormExercicio').textContent = "Editar Exercício";
        document.getElementById('cardFormExercicio').style.display = "block";
        document.getElementById('cardFormExercicio').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        alert('Erro ao carregar exercício: ' + err.message);
    }
};

// V6: removerExercicio definido na camada final.

document.getElementById('formExercicioDinamico')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btnSalvar = document.getElementById('btnSalvarExercicio');
    const id = document.getElementById('exercicioId').value;
    const nome = document.getElementById('exercicioNome').value.trim();
    const videoFile = document.getElementById('exercicioVideoFile').files[0];
    const videoAtual = document.getElementById('exercicioVideo').value;
    const videoUrlInformada = normalizarLinkVideo(document.getElementById('exercicioVideoUrl')?.value || '');

    if (!nome) {
        alert('Por favor, preencha o nome do exercício.');
        return;
    }

    btnSalvar.disabled = true;
    btnSalvar.textContent = '⏳ Salvando...';

    try {
        let videoUrl = videoAtual || videoUrlInformada || null;

        if (videoFile) {
            videoUrl = await uploadVideoToStorage(videoFile, nome);
        } else if (videoUrlInformada) {
            videoUrl = videoUrlInformada;
        }

        const dados = {
            nome: nome,
            grupo_principal: document.getElementById('exercicioGrupo').value,
            equipamento: document.getElementById('exercicioEquipamento').value,
            tipo: document.getElementById('exercicioTipo').value,
            video_url: videoUrl
        };

        let resultado;
        if (id !== "-1") {
            if (videoAtual && videoAtual !== videoUrl) {
                await deleteVideoFromStorage(videoAtual);
            }
            
            resultado = await _supabase
                .from('biblioteca_exercicios')
                .update(dados)
                .eq('id', id);
        } else {
            resultado = await _supabase
                .from('biblioteca_exercicios')
                .insert([dados]);
        }

        if (resultado.error) throw resultado.error;

        window.fecharFormExercicio();
        window.CorpofitnessExerciseStore?.invalidate();
        window.carregarBiblioteca();
        window.showToast(`Exercício ${id !== "-1" ? 'atualizado' : 'cadastrado'} com sucesso!`);
        
        document.getElementById('exercicioVideoFile').value = '';
        
    } catch (err) {
        console.error('Erro ao salvar exercício:', err);
        alert('Erro ao salvar: ' + err.message);
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar Exercício no Supabase';
        btnSalvar.classList.remove('btn-loading'); // Remove loading class
    }
});

document.getElementById('inputBuscaExercicio')?.addEventListener('input', function() {
    const termo = this.value.toLowerCase().trim();
    const linhas = document.querySelectorAll('#tabelaBibliotecaBody tr');
    linhas.forEach(linha => {
        if (linha.cells && linha.cells.length > 0) {
            const texto = linha.textContent.toLowerCase();
            linha.style.display = texto.includes(termo) ? '' : 'none';
        }
    });
});

// Listener duplicado da Biblioteca removido na V2.

        /* ================================================================
           EVOLUÇÃO 2026.08 — VÍDEOS CENTRALIZADOS NA BIBLIOTECA
           Regra de arquitetura:
           - O vídeo pertence exclusivamente à biblioteca_exercicios.
           - O plano de treino salva apenas a referência do exercício e
             seus parâmetros de prescrição.
           - Código legado é preservado para compatibilidade, mas seus
             video_url são removidos antes de permanecerem no plano.
           ================================================================ */
        (function implementarCentralizacaoVideosBiblioteca() {
            'use strict';

            const CAMPOS_VIDEO_LEGADOS = [
                'video_url',
                'videoUrl',
                'video',
                'url_video',
                'video_url_final',
                'videoUrlFinal'
            ];

            function removerCamposVideoDoObjeto(objeto) {
                if (!objeto || typeof objeto !== 'object') return objeto;

                const copia = Array.isArray(objeto) ? [...objeto] : { ...objeto };

                if (!Array.isArray(copia)) {
                    CAMPOS_VIDEO_LEGADOS.forEach(campo => {
                        if (Object.prototype.hasOwnProperty.call(copia, campo)) {
                            delete copia[campo];
                        }
                    });
                }

                return copia;
            }

            function sanitizarListaExercicios(lista) {
                if (!Array.isArray(lista)) return [];

                return lista.map(item => {
                    const limpo = removerCamposVideoDoObjeto(item);

                    if (limpo && Array.isArray(limpo.conjugado)) {
                        limpo.conjugado = limpo.conjugado.map(subitem => removerCamposVideoDoObjeto(subitem));
                    }

                    return limpo;
                });
            }

            function sanitizarFichaCompleta(ficha) {
                const origem = (ficha && typeof ficha === 'object') ? ficha : {};
                const resultado = {};

                Object.keys(origem).forEach(bloco => {
                    resultado[bloco] = sanitizarListaExercicios(origem[bloco]);
                });

                return resultado;
            }

            function sanitizarMemoriaGlobal() {
                if (typeof exerciciosFichaMemoria !== 'undefined' && exerciciosFichaMemoria) {
                    exerciciosFichaMemoria = sanitizarFichaCompleta(exerciciosFichaMemoria);
                }

                if (typeof dadosTreinoAdmin !== 'undefined' && dadosTreinoAdmin) {
                    Object.keys(dadosTreinoAdmin).forEach(bloco => {
                        dadosTreinoAdmin[bloco] = sanitizarListaExercicios(dadosTreinoAdmin[bloco]);
                    });
                }
            }

            // V6: wrappers encadeados removidos; a política é aplicada pelo wrapper público único.

            /*
             * API pública para outras páginas/scripts do sistema. Permite que
             * qualquer módulo que monte um plano aplique a mesma regra sem
             * duplicar a lógica.
             */
            window.CorpofitnessTreinoVideoPolicy = Object.freeze({
                sanitizarExercicio: removerCamposVideoDoObjeto,
                sanitizarLista: sanitizarListaExercicios,
                sanitizarFicha: sanitizarFichaCompleta,
                limparMemoria: sanitizarMemoriaGlobal,
                versao: '2026.08-biblioteca-centralizada'
            });

            /* Executa uma limpeza inicial para estruturas legadas já carregadas. */
            sanitizarMemoriaGlobal();

            console.info(
                '[Corpofitness] Política de vídeos ativa: vídeos pertencem à Biblioteca de Exercícios; '
                + 'planos de treino armazenam apenas referência e prescrição.'
            );
        })();
