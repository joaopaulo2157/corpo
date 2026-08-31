/* ======================================================================
       CORPOFITNESS 2026.08 — PRÉ-PRESCRIÇÃO ASSISTIDA PELO PROFESSOR
       ----------------------------------------------------------------------
       Objetivo:
       - analisar objetivo, nível, divisão, grupos selecionados e a avaliação
         antropométrica mais recente do aluno;
       - montar uma SUGESTÃO EDITÁVEL usando somente exercícios cadastrados na
         biblioteca_exercicios;
       - nunca salvar automaticamente e nunca substituir uma ficha existente
         sem confirmação do professor;
       - preservar a política de vídeos: o plano guarda referência/prescrição,
         enquanto o vídeo continua exclusivamente na biblioteca.
       ====================================================================== */
    (function iniciarPrescricaoAssistidaCorpofitness(){
        'use strict';

        const ORDEM_GRUPOS_FULL = [
            'quadriceps','posterior','gluteos','peitoral','dorsal','deltoides',
            'biceps','triceps','abdomen','panturrilhas','trapezio','lombar',
            'antebraco','obliquos','tibial','infraespinhal'
        ];

        const DIVISOES = {
            Full: {
                A: ORDEM_GRUPOS_FULL
            },
            A: {
                A: ORDEM_GRUPOS_FULL
            },
            AB: {
                A: ['peitoral','dorsal','deltoides','biceps','triceps','trapezio','antebraco'],
                B: ['quadriceps','posterior','gluteos','panturrilhas','abdomen','obliquos','lombar','tibial']
            },
            ABC: {
                A: ['peitoral','deltoides','triceps'],
                B: ['dorsal','biceps','trapezio','antebraco','infraespinhal'],
                C: ['quadriceps','posterior','gluteos','panturrilhas','abdomen','obliquos','lombar','tibial']
            },
            ABCD: {
                A: ['peitoral','triceps'],
                B: ['dorsal','biceps','trapezio','antebraco'],
                C: ['quadriceps','posterior','gluteos','panturrilhas','tibial'],
                D: ['deltoides','abdomen','obliquos','lombar','infraespinhal']
            },
            ABCDE: {
                A: ['peitoral'],
                B: ['dorsal','trapezio','infraespinhal'],
                C: ['quadriceps','posterior','gluteos','panturrilhas','tibial'],
                D: ['deltoides','abdomen','obliquos','lombar'],
                E: ['biceps','triceps','antebraco']
            }
        };

        const CONFIG_OBJETIVOS = {
            Hipertrofia: {
                metodo: 'Tradicional',
                descanso: '60-90s',
                reps: { Iniciante:'10-12', Intermediário:'8-12', Avançado:'8-12' },
                series: { Iniciante:'3', Intermediário:'3-4', Avançado:'4' },
                conjugacao: false
            },
            Emagrecimento: {
                metodo: 'Circuito / Tradicional',
                descanso: '45-60s',
                reps: { Iniciante:'12-15', Intermediário:'12-15', Avançado:'12-20' },
                series: { Iniciante:'2-3', Intermediário:'3', Avançado:'3-4' },
                conjugacao: true
            },
            Força: {
                metodo: 'Força técnica',
                descanso: '90-120s',
                reps: { Iniciante:'6-8', Intermediário:'5-8', Avançado:'4-6' },
                series: { Iniciante:'3', Intermediário:'4', Avançado:'4-5' },
                conjugacao: false
            },
            Condicionamento: {
                metodo: 'Circuito',
                descanso: '45-60s',
                reps: { Iniciante:'12-15', Intermediário:'15-20', Avançado:'15-20' },
                series: { Iniciante:'2-3', Intermediário:'3', Avançado:'3-4' },
                conjugacao: true
            }
        };

        function normalizar(valor) {
            return String(valor || '')
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .toLowerCase().trim();
        }

        function escapar(valor) {
            if (typeof window.escapeHtmlTreino === 'function') return window.escapeHtmlTreino(valor);
            return String(valor ?? '')
                .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
        }

        function grupoCanonicoBiblioteca(grupo) {
            const g = normalizar(grupo);
            if (g.includes('peitoral')) return 'peitoral';
            if (g.includes('dorsal') || g.includes('costa')) return 'dorsal';
            if (g.includes('quadr')) return 'quadriceps';
            if (g.includes('posterior')) return 'posterior';
            if (g.includes('delto') || g.includes('ombro')) return 'deltoides';
            if (g.includes('biceps')) return 'biceps';
            if (g.includes('triceps')) return 'triceps';
            if (g.includes('glute')) return 'gluteos';
            if (g.includes('panturr')) return 'panturrilhas';
            if (g.includes('abd')) return 'abdomen';
            if (g.includes('trape')) return 'trapezio';
            if (g.includes('lomb')) return 'lombar';
            if (g.includes('antebr')) return 'antebraco';
            if (g.includes('obli')) return 'obliquos';
            if (g.includes('tib')) return 'tibial';
            if (g.includes('infra')) return 'infraespinhal';
            return 'outros';
        }

        function obterLabelRadio(nome, padrao) {
            let valor = padrao;
            document.querySelectorAll(`input[name="${nome}"]`).forEach(radio => {
                if (radio.checked) valor = radio.parentElement.textContent.trim();
            });
            return valor;
        }

        function obterGruposSelecionados() {
            const selecionados = new Set();
            document.querySelectorAll('.chk-musculo').forEach(chk => {
                if (chk.checked) selecionados.add(chk.getAttribute('data-musculo'));
            });
            return selecionados;
        }

        function contarExerciciosFicha() {
            if (typeof exerciciosFichaMemoria === 'undefined' || !exerciciosFichaMemoria) return 0;
            return Object.values(exerciciosFichaMemoria).reduce((total, lista) => total + (Array.isArray(lista) ? lista.length : 0), 0);
        }

        function limparBlocosNaoUsados(blocosAtivos) {
            ['A','B','C','D','E'].forEach(letra => {
                if (!blocosAtivos.includes(letra)) exerciciosFichaMemoria[letra] = [];
            });
        }

        function qtdBasePorDivisao(divisao, nivel) {
            let qtd = ({Full:7, A:7, AB:6, ABC:5, ABCD:4, ABCDE:4})[divisao] || 5;
            if (nivel === 'Iniciante') qtd -= 1;
            if (nivel === 'Avançado') qtd += 1;
            return Math.max(4, Math.min(8, qtd));
        }

        async function carregarAvaliacaoParaSugestao(alunoId) {
            const pesoTela = parseFloat(document.getElementById('fiel_peso')?.value) || null;
            const alturaTela = parseFloat(document.getElementById('fiel_altura')?.value) || null;
            const massaTela = parseFloat(document.getElementById('fiel_massa')?.value) || null;

            let avaliacao = null;
            try {
                const { data, error } = await _supabase
                    .from('avaliacoes_fisicas')
                    .select('*')
                    .eq('aluno_id', alunoId)
                    .order('created_at', { ascending:false })
                    .limit(1);
                if (!error && data && data.length) avaliacao = data[0];
            } catch (e) {
                console.warn('[Pré-prescrição] Não foi possível consultar avaliação:', e);
            }

            const peso = pesoTela || parseFloat(avaliacao?.peso) || null;
            const altura = alturaTela || parseFloat(avaliacao?.altura) || null;
            const massa = massaTela || parseFloat(avaliacao?.massa) || null;
            const imc = peso && altura ? peso / (altura * altura) : null;

            let detalhado = null;
            if (avaliacao?.conteudo_detalhado) {
                try {
                    detalhado = typeof avaliacao.conteudo_detalhado === 'string'
                        ? JSON.parse(avaliacao.conteudo_detalhado)
                        : avaliacao.conteudo_detalhado;
                } catch (_) {}
            }

            let medidasDetalhadas = 0;
            if (detalhado && typeof detalhado === 'object') {
                ['dobras','perimetria_dir','perimetria_esq'].forEach(chave => {
                    const obj = detalhado[chave];
                    if (obj && typeof obj === 'object') {
                        medidasDetalhadas += Object.values(obj).filter(v => Number(v) > 0).length;
                    }
                });
            }

            return { avaliacao, peso, altura, massa, imc, medidasDetalhadas };
        }

        function analisarPerfil(objetivo, nivel, avaliacao) {
            const alertas = [];
            let conservador = false;

            if (!avaliacao.peso || !avaliacao.altura || !avaliacao.imc) {
                alertas.push('Sem peso/altura suficientes: a sugestão usa objetivo, nível, divisão e grupos musculares, sem ajuste antropométrico.');
            } else {
                if (avaliacao.imc < 18.5 || avaliacao.imc >= 30) {
                    conservador = true;
                    alertas.push('A avaliação indica que o professor deve revisar com atenção volume, impacto e progressão antes de aplicar a sugestão.');
                }
                if (objetivo === 'Emagrecimento' && avaliacao.imc < 18.5) {
                    alertas.push('Objetivo "Emagrecimento" merece revisão profissional antes de aplicar esta sugestão.');
                }
            }

            if (nivel === 'Iniciante') conservador = true;

            return {
                conservador,
                permitirConjugados: !conservador && (objetivo === 'Emagrecimento' || objetivo === 'Condicionamento'),
                alertas
            };
        }

        function pontuarExercicio(ex, grupoDesejado, perfil) {
            let score = 0;
            const grupo = grupoCanonicoBiblioteca(ex.grupo_principal);
            const tipo = normalizar(ex.tipo);
            const equip = normalizar(ex.equipamento);
            if (grupo === grupoDesejado) score += 100;
            if (tipo.includes('composto')) score += 20;
            if (perfil.conservador && equip.includes('maquina')) score += 12;
            if (perfil.conservador && tipo.includes('isolado')) score += 4;
            return score;
        }

        function selecionarParaBloco(biblioteca, gruposPermitidos, gruposMarcados, limite, perfil) {
            const gruposEfetivos = gruposPermitidos.filter(g => gruposMarcados.size === 0 || gruposMarcados.has(g));
            const usados = new Set();
            const selecionados = [];

            // 1 exercício por grupo para dar equilíbrio ao bloco.
            gruposEfetivos.forEach(grupo => {
                if (selecionados.length >= limite) return;
                const candidatos = biblioteca
                    .map((ex, idx) => ({ex, idx, score:pontuarExercicio(ex, grupo, perfil)}))
                    .filter(item => grupoCanonicoBiblioteca(item.ex.grupo_principal) === grupo && !usados.has(item.idx))
                    .sort((a,b) => b.score - a.score || String(a.ex.nome||'').localeCompare(String(b.ex.nome||'')));
                if (candidatos.length) {
                    selecionados.push(candidatos[0].ex);
                    usados.add(candidatos[0].idx);
                }
            });

            // Completa o volume mantendo somente os grupos autorizados.
            if (selecionados.length < limite) {
                const resto = biblioteca
                    .map((ex, idx) => ({ex, idx, grupo:grupoCanonicoBiblioteca(ex.grupo_principal)}))
                    .filter(item => gruposEfetivos.includes(item.grupo) && !usados.has(item.idx))
                    .sort((a,b) => {
                        const ta = normalizar(a.ex.tipo).includes('composto') ? 1 : 0;
                        const tb = normalizar(b.ex.tipo).includes('composto') ? 1 : 0;
                        return tb - ta || String(a.ex.nome||'').localeCompare(String(b.ex.nome||''));
                    });
                for (const item of resto) {
                    if (selecionados.length >= limite) break;
                    selecionados.push(item.ex);
                    usados.add(item.idx);
                }
            }

            return selecionados;
        }

        function criarItemSimples(ex, config, nivel, objetivo, perfil) {
            return {
                tipo_item: 'simples',
                biblioteca_id: ex?.id ?? null,
                exercicio: ex?.nome || 'Exercício',
                series: config.series[nivel] || '3',
                reps: config.reps[nivel] || '10-12',
                carga: 'A definir pelo professor',
                metodo: config.metodo,
                descanso: config.descanso,
                origem_prescricao: 'assistida',
                objetivo_prescricao: objetivo,
                revisao_professor: true,
                ajuste_conservador: perfil.conservador
            };
        }

        function transformarEmConjugados(itens, config, nivel, objetivo, perfil) {
            if (!perfil.permitirConjugados || itens.length < 4) return itens;

            const resultado = [];
            let paresCriados = 0;
            const maxPares = objetivo === 'Emagrecimento' ? 2 : 1;

            for (let i = 0; i < itens.length; ) {
                if (paresCriados < maxPares && i + 1 < itens.length) {
                    const a = itens[i];
                    const b = itens[i + 1];
                    const conjugado = [a,b].map((item, ordem) => ({
                        biblioteca_id: item.biblioteca_id,
                        exercicio: item.exercicio,
                        reps: item.reps,
                        carga: item.carga,
                        ordem: ordem + 1
                    }));

                    resultado.push({
                        tipo_item: 'conjugado',
                        exercicio: `${a.exercicio} + ${b.exercicio}`,
                        series: config.series[nivel] || '3',
                        reps: `${a.reps} + ${b.reps}`,
                        carga: 'Individual por exercício',
                        metodo: 'Bi-set',
                        descanso: config.descanso,
                        observacao: 'Executar os exercícios em sequência; descanso após completar o bloco.',
                        conjugado,
                        origem_prescricao: 'assistida',
                        objetivo_prescricao: objetivo,
                        revisao_professor: true
                    });
                    paresCriados++;
                    i += 2;
                } else {
                    resultado.push(itens[i]);
                    i += 1;
                }
            }
            return resultado;
        }

        function atualizarPainelAnalise(html, tipo='info') {
            const painel = document.getElementById('painelAnalisePreTreino');
            const texto = document.getElementById('textoAnalisePreTreino');
            if (!painel || !texto) return;
            painel.style.display = 'block';
            painel.style.borderColor = tipo === 'warning' ? 'rgba(255,152,0,.35)' : 'rgba(30,136,229,.25)';
            painel.style.background = tipo === 'warning' ? 'rgba(255,152,0,.07)' : 'rgba(30,136,229,.07)';
            texto.innerHTML = html;
        }

        window.gerarPreTreinoAssistido = async function(opcoes = {}) {
            const objetivo = document.getElementById('tr_objetivo')?.value || '';
            const alunoId = document.getElementById('tr_aluno_id')?.value || '';
            const nivel = obterLabelRadio('tr_nivel', 'Iniciante');
            const divisao = obterLabelRadio('tr_divisao', 'ABC');
            const forcar = !!opcoes.forcar;

            if (!objetivo) {
                window.showToast?.('Selecione primeiro o objetivo do treino.', 'warning');
                atualizarPainelAnalise('Selecione um objetivo para que o sistema monte a sugestão.', 'warning');
                return;
            }
            if (!alunoId || alunoId === '-1') {
                window.showToast?.('Selecione um aluno válido antes de gerar o pré-treino.', 'error');
                return;
            }

            const existentes = contarExerciciosFicha();
            if (existentes > 0) {
                if (!forcar) {
                    atualizarPainelAnalise('A ficha já possui exercícios. Use <strong>Gerar / Regerar Pré-Treino</strong> se quiser substituir a sugestão atual.', 'warning');
                    return;
                }
                const confirmar = confirm(`A ficha possui ${existentes} item(ns). Deseja substituir os exercícios atuais por uma nova sugestão baseada em ${objetivo}?`);
                if (!confirmar) return;
            }

            const btn = document.getElementById('btnGerarPreTreino');
            const textoOriginal = btn?.innerHTML;
            if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Analisando avaliação e biblioteca...'; }

            try {
                const avaliacao = await carregarAvaliacaoParaSugestao(alunoId);
                const perfil = analisarPerfil(objetivo, nivel, avaliacao);
                const config = CONFIG_OBJETIVOS[objetivo];
                const estrutura = DIVISOES[divisao] || DIVISOES.ABC;
                const blocos = Object.keys(estrutura);
                const gruposMarcados = obterGruposSelecionados();

                const { data:biblioteca, error } = await _supabase
                    .from('biblioteca_exercicios')
                    .select('*')
                    .order('nome', {ascending:true});

                if (error) throw error;
                if (!biblioteca || biblioteca.length === 0) {
                    throw new Error('A Biblioteca de Exercícios está vazia. Cadastre exercícios antes de gerar um pré-treino.');
                }

                const novaFicha = { A:[], B:[], C:[], D:[], E:[] };
                const limite = qtdBasePorDivisao(divisao, nivel);
                const blocosSemExercicio = [];

                for (const letra of blocos) {
                    const gruposPermitidos = estrutura[letra];
                    const escolhidos = selecionarParaBloco(biblioteca, gruposPermitidos, gruposMarcados, limite, perfil);
                    let itens = escolhidos.map(ex => criarItemSimples(ex, config, nivel, objetivo, perfil));
                    itens = transformarEmConjugados(itens, config, nivel, objetivo, perfil);
                    novaFicha[letra] = itens;
                    if (itens.length === 0) blocosSemExercicio.push(letra);
                }

                exerciciosFichaMemoria = novaFicha;
                limparBlocosNaoUsados(blocos);
                treinoAtualLetra = blocos[0] || 'A';
                document.querySelectorAll('.btn-treino-aba').forEach(b => b.classList.remove('active'));
                document.getElementById('tabTreino' + treinoAtualLetra)?.classList.add('active');
                window.renderizarTabelaExerciciosFicha?.();

                const total = contarExerciciosFicha();
                const imcTxt = avaliacao.imc ? avaliacao.imc.toFixed(1).replace('.', ',') : 'não calculado';
                const pesoTxt = avaliacao.peso ? `${avaliacao.peso} kg` : 'não informado';
                const alturaTxt = avaliacao.altura ? `${avaliacao.altura} m` : 'não informada';
                const massaTxt = avaliacao.massa ? ` • Massa registrada: ${avaliacao.massa} kg` : '';
                const medidasTxt = avaliacao.medidasDetalhadas > 0 ? ` • ${avaliacao.medidasDetalhadas} medida(s) detalhada(s) encontrada(s)` : '';
                const alertas = [...perfil.alertas];
                if (blocosSemExercicio.length) alertas.push(`Sem exercícios compatíveis na biblioteca para o(s) bloco(s): ${blocosSemExercicio.join(', ')}. Revise os grupos musculares marcados ou cadastre mais exercícios.`);

                const alertaHtml = alertas.length
                    ? `<div style="margin-top:6px; color:var(--warning);">⚠️ ${alertas.map(escapar).join('<br>⚠️ ')}</div>`
                    : '';

                atualizarPainelAnalise(`
                    <div><strong style="color:var(--text-color);">${escapar(objetivo)}</strong> • ${escapar(nivel)} • Divisão ${escapar(divisao)}</div>
                    <div>Avaliação usada: ${escapar(pesoTxt)} • ${escapar(alturaTxt)} • IMC ${escapar(imcTxt)}${escapar(massaTxt)}${escapar(medidasTxt)}</div>
                    <div>Pré-treino criado: <strong style="color:var(--text-color);">${total} item(ns)</strong> em ${blocos.length} bloco(s). Cargas permanecem <strong style="color:var(--text-color);">a definir pelo professor</strong>.</div>
                    <div style="margin-top:4px;">O sistema pode organizar automaticamente <strong style="color:var(--warning);">conjugados</strong> quando forem compatíveis com o objetivo, nível e perfil analisado.</div>
                    ${alertaHtml}
                    <div style="margin-top:6px; color:var(--primary-light);">✓ Tudo permanece editável: o professor pode agrupar, editar, desfazer, substituir ou reorganizar os exercícios antes de salvar.</div>
                `, alertas.length ? 'warning' : 'info');

                window.showToast?.(`Pré-treino de ${objetivo} gerado. Revise antes de salvar!`);
            } catch (err) {
                console.error('[Pré-prescrição] Erro:', err);
                atualizarPainelAnalise(`Erro ao gerar sugestão: ${escapar(err?.message || err)}`, 'warning');
                window.showToast?.('Erro ao gerar pré-treino: ' + (err?.message || err), 'error');
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal; }
            }
        };

        function prepararEventos() {
            const objetivo = document.getElementById('tr_objetivo');
            if (objetivo && !objetivo.dataset.prescricaoAssistidaLigada) {
                objetivo.dataset.prescricaoAssistidaLigada = '1';
                objetivo.addEventListener('change', () => {
                    const valor = objetivo.value;
                    if (!valor) {
                        atualizarPainelAnalise('Selecione um objetivo para que o sistema monte a sugestão.');
                        return;
                    }
                    // Só gera automaticamente se a ficha ainda estiver vazia.
                    if (contarExerciciosFicha() === 0) {
                        window.gerarPreTreinoAssistido({forcar:false});
                    } else {
                        atualizarPainelAnalise(`Objetivo alterado para <strong>${escapar(valor)}</strong>. A ficha existente foi preservada. Clique em <strong>Gerar / Regerar Pré-Treino</strong> para recalcular.`, 'warning');
                    }
                });
            }

            document.querySelectorAll('input[name="tr_nivel"], input[name="tr_divisao"], .chk-musculo').forEach(el => {
                if (el.dataset.prescricaoAssistidaLigada) return;
                el.dataset.prescricaoAssistidaLigada = '1';
                el.addEventListener('change', () => {
                    if (contarExerciciosFicha() > 0) {
                        atualizarPainelAnalise('Nível, divisão ou grupos musculares foram alterados. A ficha atual foi preservada; use <strong>Gerar / Regerar Pré-Treino</strong> para recalcular a sugestão.', 'warning');
                    }
                });
            });
        }

        function aposAbrirPrescricaoV6() {
            if (typeof exerciciosFichaMemoria !== 'undefined' && exerciciosFichaMemoria && !Array.isArray(exerciciosFichaMemoria.E)) {
                exerciciosFichaMemoria.E = [];
            }
            prepararEventos();
            const objetivoAtual = document.getElementById('tr_objetivo')?.value || '';
            const total = contarExerciciosFicha();
            if (total > 0) {
                atualizarPainelAnalise(`Ficha carregada com <strong>${total} item(ns)</strong>. Você pode manter o plano ou usar <strong>Gerar / Regerar Pré-Treino</strong> para obter uma nova sugestão a partir da avaliação atual.`);
            } else if (objetivoAtual) {
                atualizarPainelAnalise(`Objetivo atual: <strong>${escapar(objetivoAtual)}</strong>. Clique em Gerar Pré-Treino ou altere o objetivo para gerar automaticamente.`);
            } else {
                atualizarPainelAnalise('Selecione o objetivo. Com a ficha vazia, a primeira escolha gera automaticamente uma sugestão baseada na avaliação.');
            }
        }

        prepararEventos();

        window.CorpofitnessPrescricaoAssistida = Object.freeze({
            versao: '2026.08-prescricao-assistida-v1',
            gerar: window.gerarPreTreinoAssistido,
            objetivos: Object.keys(CONFIG_OBJETIVOS),
            divisoes: Object.keys(DIVISOES),
            prepararEventos,
            aposAbrir: aposAbrirPrescricaoV6
        });

        console.info('[Corpofitness] Pré-prescrição assistida ativa: objetivo + avaliação + nível + divisão + biblioteca, sempre sujeita à revisão do professor.');
    })();
