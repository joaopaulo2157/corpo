# Auditoria técnica e de segurança

Data: 14 de agosto de 2026  
Escopo: arquivos entregues do projeto Corpofitness Premium.

## Resultado executivo

O estado original não era seguro para produção. A autenticação administrativa podia ser contornada com uma credencial fixa no HTML, senhas eram comparadas em texto puro, o portal aceitava qualquer `aluno_id` pela URL e conteúdo do banco era inserido em `innerHTML` sem escape. A versão corrigida substitui essas decisões por Supabase Auth, perfis vinculados a `auth.users`, RLS por função, vínculo de aluno por `auth.uid()`, validação de URL e escape de saída.

## Achados corrigidos

| Severidade | Achado original | Correção aplicada |
| --- | --- | --- |
| Crítica | Login `admin / 123456` embutido no navegador | Removido; login usa `signInWithPassword` e exige perfil ativo em `admin_profiles` |
| Crítica | Senhas administrativas em texto puro na tabela `usuarios` | Fluxo legado desativado; coluna `pass` removida pelo SQL e usuários passam a `auth.users` |
| Crítica | IDOR: `treinos.html?aluno_id=...` permitia trocar o aluno | Parâmetro removido; aluno é resolvido exclusivamente por `alunos.auth_user_id = auth.uid()` |
| Crítica | Banco acessível diretamente sem autorização confiável | RLS e privilégios explícitos para todas as tabelas usadas pelo sistema |
| Alta | XSS persistente por conteúdo e mensagens exibidos com `innerHTML` | Valores dinâmicos escapados; URLs, imagens, classes e mídia validadas |
| Alta | Gerenciamento de Auth exigiria chave privilegiada no frontend | Criada Edge Function autenticada; `service_role` permanece somente no servidor |
| Alta | Visitante podia tentar gravar diretamente em `contatos` sem limite | INSERT público revogado; RPC validada limita a 5 envios por 15 minutos |
| Alta | Upload de vídeo sem política completa de Storage | Bucket limitado por tamanho/MIME e políticas SELECT/INSERT/UPDATE/DELETE por cargo |
| Média | CSV permitia injeção de fórmulas ao abrir em planilhas | Células perigosas recebem prefixo e aspas são tratadas |
| Média | Dependências CDN sem versão fixa | Supabase JS, Swiper, Chart.js, jsPDF e AutoTable fixados em versões específicas |
| Média | Links em nova aba sem isolamento | `rel="noopener noreferrer"` aplicado e `<base target="_blank">` removido |
| Média | Arquivos essenciais ausentes (`css`, `js`, login e imagens) | Estrutura mínima completa adicionada |
| Média | `robots.txt` bloqueava CSS/JS e sitemap apontava para domínio diferente | Regras e domínio corrigidos; áreas privadas excluídas da indexação |
| Média | Sem cabeçalhos HTTP de proteção | CSP, HSTS, COOP, Permissions Policy, anti-sniffing e anti-framing adicionados |
| Baixa | CSS continha `@media` inválido dentro de atributo `style` | Regras responsivas movidas para classes CSS válidas |
| Baixa | README vazio e script de diagnóstico tinha configuração fixa | Documentação completa e diagnóstico orientado por variáveis de ambiente |

## Controles por perfil

| Perfil | Acesso permitido |
| --- | --- |
| Público | Conteúdo institucional e RPC limitada de contato |
| Aluno | Próprio cadastro, treino e avaliação; biblioteca de exercícios autenticada |
| Professor | Alunos em leitura, treinos, avaliações, biblioteca e vídeos |
| Recepção | Cadastros de alunos e contatos |
| Master | Conteúdo, usuários, alunos, treinos, contatos, relatórios e backups |

## Limitações e riscos residuais

- O projeto Supabase identificado nos arquivos não estava conectado à sessão de administração disponível. Por isso, o SQL e a Edge Function foram preparados, mas não aplicados ao banco remoto nesta revisão.
- O painel legado ainda usa vários scripts e manipuladores inline. A CSP precisa de `'unsafe-inline'` até uma refatoração posterior para módulos externos; a sanitização reduz o risco, mas remover inline scripts é o próximo endurecimento recomendado.
- O limite do formulário reduz spam por IP/e-mail, mas não substitui um desafio anti-bot como Cloudflare Turnstile em cenários de ataque distribuído.
- A segurança depende de SMTP, URLs de redirecionamento, MFA e tempo de expiração de JWT configurados corretamente no painel Supabase.
- Nenhum sistema conectado à internet pode ser garantido como livre de vulnerabilidades futuras. Dependências, logs e alertas devem ser revisados continuamente.

## Configurações recomendadas no Supabase

- Ativar MFA para contas `master` e exigir senhas fortes.
- Usar SMTP próprio e revisar os modelos de convite/redefinição.
- Manter JWT curto para o painel administrativo e revogar sessões ao desligar usuários.
- Executar os Advisors de segurança e performance depois do SQL.
- Usar o RLS Tester para validar `anon`, aluno, professor, recepção e master.
- Ativar alertas de uso, logs de Auth, Database, Storage e Edge Functions.
- Rotacionar imediatamente qualquer chave secreta que já tenha sido exposta fora do Supabase.

## Critério de liberação

Produção só deve ser liberada após a migração, a função e o primeiro master estarem configurados e todos os testes do README passarem. A simples publicação dos arquivos HTML sem a camada Supabase não corrige a autorização do banco.
