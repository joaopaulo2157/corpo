# Corpofitness Premium

Site institucional, painel administrativo e portal do aluno integrados ao Supabase.

## Arquivos principais

- `index.html`: site público e formulário de contato.
- `admin.html`: painel protegido por Supabase Auth e perfis administrativos.
- `login-cliente.html`: autenticação do aluno.
- `treinos.html`: treino e avaliação do aluno autenticado.
- `supabase/security_hardening.sql`: RLS, privilégios, vínculo de usuários, Storage e limite do formulário.
- `supabase/functions/admin-users/index.ts`: criação e manutenção segura de administradores e alunos.
- `vercel.json`: cabeçalhos HTTP de segurança e regras de cache.
- `SECURITY_AUDIT.md`: resultado detalhado da auditoria.

## Ativação segura

> Faça um backup do banco antes de alterar produção. Não publique o painel antes de concluir todos os passos.

1. No Supabase, abra o SQL Editor e execute `supabase/security_hardening.sql`.
2. Em **Authentication > URL Configuration**, configure:
   - Site URL: `https://corpofitnesspremium.com.br`
   - Redirect URL: `https://corpofitnesspremium.com.br/login-cliente.html`
3. Em **Authentication > Users**, crie o primeiro usuário administrativo com e-mail e senha forte.
4. Execute no SQL Editor, trocando o e-mail:

```sql
insert into public.admin_profiles (user_id, nome, email, nivel)
select id, 'Administrador Master', email, 'master'
from auth.users
where lower(email) = lower('SEU_EMAIL_AQUI');
```

5. Instale a CLI atual do Supabase, vincule o projeto e implante a função:

```bash
supabase login
supabase link --project-ref rylbznbtrrsuyzxgsivg
supabase secrets set SITE_URL=https://corpofitnesspremium.com.br
supabase functions deploy admin-users --verify-jwt
```

6. Publique o conteúdo desta pasta na raiz do projeto Vercel.
7. Valide os fluxos abaixo antes de liberar o domínio.

## Validação obrigatória

- Um visitante lê somente conteúdo público e consegue enviar até 5 contatos por 15 minutos.
- Um visitante não consegue listar `contatos`, `alunos`, `treinos_alunos` ou `avaliacoes_fisicas` pela API.
- Um aluno autenticado acessa apenas a própria linha, o próprio treino e a própria avaliação.
- Alterar `?aluno_id=` na URL não muda o aluno exibido.
- Professor gerencia treino, avaliação e biblioteca, mas não usuários administrativos ou conteúdo do site.
- Recepção gerencia cadastros e contatos, mas não conteúdo, treinos ou backups.
- Master possui acesso completo e cria novos usuários pela função protegida.
- Logout remove a sessão e impede retorno ao painel/portal sem novo login.
- Upload aceita somente MP4, WebM ou QuickTime de até 100 MB.
- Os cabeçalhos CSP, HSTS, `X-Content-Type-Options` e `X-Frame-Options` aparecem na resposta do domínio.

## Testes locais

Sirva os arquivos por HTTP; não abra as páginas com `file://`:

```bash
python3 -m http.server 3000 --directory .
```

O teste opcional do Data API não contém credenciais fixas:

```bash
export SUPABASE_URL='https://SEU_PROJETO.supabase.co'
export SUPABASE_PUBLISHABLE_KEY='sb_publishable_...'
python3 temp_check_supabase.py
```

## Observações de segurança

A chave `sb_publishable_...` é pública por definição e pode existir no navegador. A segurança depende das políticas RLS e dos privilégios do banco. Nunca coloque `service_role`, secret key, senha do banco ou token pessoal em HTML, JavaScript público ou no repositório.
