-- Corpofitness Premium - hardening do Supabase
-- Execute uma única vez no SQL Editor após fazer backup do banco.
-- O script é idempotente para políticas e objetos criados por ele.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.admin_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    nome text not null check (char_length(nome) between 2 and 120),
    email text not null,
    nivel text not null check (nivel in ('master', 'recepcao', 'professor')),
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists admin_profiles_email_lower_key
    on public.admin_profiles (lower(email));

alter table public.admin_profiles enable row level security;

create or replace function private.has_admin_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
    select exists (
        select 1
        from public.admin_profiles p
        where p.user_id = (select auth.uid())
          and p.ativo is true
          and p.nivel = any(required_roles)
    );
$$;

revoke all on function private.has_admin_role(text[]) from public, anon;
grant execute on function private.has_admin_role(text[]) to authenticated;

drop policy if exists admin_profiles_self_read on public.admin_profiles;
create policy admin_profiles_self_read
on public.admin_profiles for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists admin_profiles_master_all on public.admin_profiles;
create policy admin_profiles_master_all
on public.admin_profiles for all
to authenticated
using ((select private.has_admin_role(array['master']::text[])))
with check ((select private.has_admin_role(array['master']::text[])));

grant select on public.admin_profiles to authenticated;
revoke all on public.admin_profiles from anon;

-- Vincula cada aluno a uma identidade real do Supabase Auth.
alter table if exists public.alunos
    add column if not exists auth_user_id uuid;

update public.alunos a
set auth_user_id = u.id
from auth.users u
where a.auth_user_id is null
  and a.email is not null
  and lower(a.email) = lower(u.email);

create unique index if not exists alunos_auth_user_id_key
    on public.alunos(auth_user_id)
    where auth_user_id is not null;

do $$
begin
    if to_regclass('public.alunos') is not null
       and not exists (
           select 1 from pg_constraint
           where conname = 'alunos_auth_user_id_fkey'
             and conrelid = 'public.alunos'::regclass
       ) then
        alter table public.alunos
            add constraint alunos_auth_user_id_fkey
            foreign key (auth_user_id) references auth.users(id) on delete set null;
    end if;
end
$$;

create index if not exists treinos_alunos_aluno_id_idx on public.treinos_alunos(aluno_id);
create index if not exists avaliacoes_fisicas_aluno_id_idx on public.avaliacoes_fisicas(aluno_id);

-- Conteúdo que pode ser lido no site público, mas só alterado pelo master.
do $$
declare
    table_name text;
begin
    foreach table_name in array array[
        'estrutura', 'modalidades', 'feedbacks', 'faq', 'planos', 'galeria',
        'professores', 'banners', 'parceiros', 'noticias', 'hero_config'
    ] loop
        if to_regclass(format('public.%I', table_name)) is not null then
            execute format('alter table public.%I enable row level security', table_name);
            execute format('revoke all on public.%I from anon, authenticated', table_name);
            execute format('grant insert, update, delete on public.%I to authenticated', table_name);
            execute format('drop policy if exists public_read on public.%I', table_name);
            execute format('create policy public_read on public.%I for select to anon, authenticated using (true)', table_name);
            execute format('drop policy if exists master_write on public.%I', table_name);
            execute format(
                'create policy master_write on public.%I for all to authenticated using ((select private.has_admin_role(array[''master'']::text[]))) with check ((select private.has_admin_role(array[''master'']::text[])))',
                table_name
            );
        end if;
    end loop;
end
$$;

grant select (id, titulo, descricao, icone, ordem) on public.estrutura to anon, authenticated;
grant select (id, nome, icone, descricao, nivel, duracao, equipamento, beneficios, ordem) on public.modalidades to anon, authenticated;
grant select (id, nome, foto, estrelas, unidade, texto, ordem) on public.feedbacks to anon, authenticated;
grant select (id, pergunta, resposta, ordem) on public.faq to anon, authenticated;
grant select (id, nome, valor, sufixo, itens, destaque, badge, ordem) on public.planos to anon, authenticated;
grant select (id, img, titulo, categoria, ordem) on public.galeria to anon, authenticated;
grant select (id, nome, esp, bio, foto, instagram, facebook, created_at) on public.professores to anon, authenticated;
grant select (id, titulo, posicao, img, link, created_at) on public.banners to anon, authenticated;
grant select (id, nome, logo, ordem) on public.parceiros to anon, authenticated;
grant select (id, titulo, cat, conteudo, created_at) on public.noticias to anon, authenticated;
grant select (id, t1, t2, sub, video) on public.hero_config to anon, authenticated;

-- Dados de alunos: o aluno lê apenas a própria linha; equipe autorizada gerencia.
alter table if exists public.alunos enable row level security;
revoke all on public.alunos from anon, authenticated;
grant select, insert, update, delete on public.alunos to authenticated;

drop policy if exists alunos_self_read on public.alunos;
create policy alunos_self_read
on public.alunos for select
to authenticated
using (auth_user_id = (select auth.uid()));

drop policy if exists alunos_staff_read on public.alunos;
create policy alunos_staff_read
on public.alunos for select
to authenticated
using ((select private.has_admin_role(array['master','recepcao','professor']::text[])));

drop policy if exists alunos_management_write on public.alunos;
create policy alunos_management_write
on public.alunos for all
to authenticated
using ((select private.has_admin_role(array['master','recepcao']::text[])))
with check ((select private.has_admin_role(array['master','recepcao']::text[])));

-- Treinos e avaliações: aluno lê somente os próprios dados; professor/master gerenciam.
do $$
declare
    table_name text;
begin
    foreach table_name in array array['treinos_alunos', 'avaliacoes_fisicas'] loop
        if to_regclass(format('public.%I', table_name)) is not null then
            execute format('alter table public.%I enable row level security', table_name);
            execute format('revoke all on public.%I from anon, authenticated', table_name);
            execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
            execute format('drop policy if exists student_own_read on public.%I', table_name);
            execute format(
                'create policy student_own_read on public.%I for select to authenticated using (exists (select 1 from public.alunos a where a.id = aluno_id and a.auth_user_id = (select auth.uid()) and a.status = ''Ativo''))',
                table_name
            );
            execute format('drop policy if exists training_staff_all on public.%I', table_name);
            execute format(
                'create policy training_staff_all on public.%I for all to authenticated using ((select private.has_admin_role(array[''master'',''professor'']::text[]))) with check ((select private.has_admin_role(array[''master'',''professor'']::text[])))',
                table_name
            );
        end if;
    end loop;
end
$$;

-- Biblioteca de exercícios: leitura autenticada; escrita por professor/master.
alter table if exists public.biblioteca_exercicios enable row level security;
revoke all on public.biblioteca_exercicios from anon, authenticated;
grant select on public.biblioteca_exercicios to authenticated;
grant insert, update, delete on public.biblioteca_exercicios to authenticated;

drop policy if exists exercise_library_read on public.biblioteca_exercicios;
create policy exercise_library_read
on public.biblioteca_exercicios for select
to authenticated
using (true);

drop policy if exists exercise_library_staff_write on public.biblioteca_exercicios;
create policy exercise_library_staff_write
on public.biblioteca_exercicios for all
to authenticated
using ((select private.has_admin_role(array['master','professor']::text[])))
with check ((select private.has_admin_role(array['master','professor']::text[])));

-- Contatos nunca podem ser listados pelo público. O envio passa por RPC com limite.
alter table if exists public.contatos enable row level security;
revoke all on public.contatos from anon, authenticated;
grant select, update, delete on public.contatos to authenticated;

drop policy if exists contacts_staff_all on public.contatos;
create policy contacts_staff_all
on public.contatos for all
to authenticated
using ((select private.has_admin_role(array['master','recepcao']::text[])))
with check ((select private.has_admin_role(array['master','recepcao']::text[])));

create table if not exists private.contact_rate_limits (
    fingerprint text not null,
    created_at timestamptz not null default now()
);
create index if not exists contact_rate_limits_lookup_idx
    on private.contact_rate_limits(fingerprint, created_at desc);
alter table private.contact_rate_limits enable row level security;
revoke all on private.contact_rate_limits from public, anon, authenticated;

create or replace function public.submit_contact(
    p_nome text,
    p_email text,
    p_tel text,
    p_msg text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
    headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
    request_ip text := split_part(coalesce(headers->>'x-forwarded-for', 'unknown'), ',', 1);
    fingerprint_value text;
    recent_attempts integer;
begin
    p_nome := btrim(p_nome);
    p_email := lower(btrim(p_email));
    p_tel := btrim(p_tel);
    p_msg := btrim(p_msg);

    if char_length(p_nome) not between 3 and 120
       or char_length(p_email) not between 5 and 254
       or p_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
       or char_length(p_tel) not between 10 and 30
       or char_length(p_msg) not between 10 and 1000 then
        raise sqlstate '22023' using message = 'Dados de contato inválidos.';
    end if;

    fingerprint_value := encode(extensions.digest(request_ip || '|' || p_email, 'sha256'), 'hex');
    select count(*) into recent_attempts
    from private.contact_rate_limits
    where fingerprint = fingerprint_value
      and created_at >= now() - interval '15 minutes';

    if recent_attempts >= 5 then
        raise sqlstate 'PGRST' using
            message = '{"message":"Muitas tentativas. Tente novamente mais tarde."}',
            detail = '{"status":429,"status_text":"Too Many Requests"}';
    end if;

    insert into public.contatos(nome, email, tel, msg, status)
    values (p_nome, p_email, p_tel, p_msg, 'Pendente');

    insert into private.contact_rate_limits(fingerprint) values (fingerprint_value);
    delete from private.contact_rate_limits where created_at < now() - interval '1 day';
end;
$$;

revoke all on function public.submit_contact(text, text, text, text) from public;
grant execute on function public.submit_contact(text, text, text, text) to anon, authenticated;

-- Tabela legada: bloqueia a antiga autenticação com senhas em texto puro.
do $$
begin
    if to_regclass('public.usuarios') is not null then
        alter table public.usuarios enable row level security;
        revoke all on public.usuarios from anon, authenticated;
        alter table public.usuarios drop column if exists pass;
        comment on table public.usuarios is 'Legado desativado. Use auth.users + public.admin_profiles.';
    end if;
end
$$;

-- Storage dos vídeos: leitura pública compatível com getPublicUrl; escrita restrita.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'videos-exercicios',
    'videos-exercicios',
    true,
    104857600,
    array['video/mp4','video/webm','video/quicktime']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists exercise_videos_public_read on storage.objects;
create policy exercise_videos_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'videos-exercicios');

drop policy if exists exercise_videos_staff_insert on storage.objects;
create policy exercise_videos_staff_insert
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'videos-exercicios'
    and (select private.has_admin_role(array['master','professor']::text[]))
);

drop policy if exists exercise_videos_staff_update on storage.objects;
create policy exercise_videos_staff_update
on storage.objects for update
to authenticated
using (
    bucket_id = 'videos-exercicios'
    and (select private.has_admin_role(array['master','professor']::text[]))
)
with check (
    bucket_id = 'videos-exercicios'
    and (select private.has_admin_role(array['master','professor']::text[]))
);

drop policy if exists exercise_videos_staff_delete on storage.objects;
create policy exercise_videos_staff_delete
on storage.objects for delete
to authenticated
using (
    bucket_id = 'videos-exercicios'
    and (select private.has_admin_role(array['master','professor']::text[]))
);

-- Privilégios explícitos: compatível com a mudança de exposição do Data API em 2026.
grant usage on schema public to anon, authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

alter default privileges for role postgres in schema public
    revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
    revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
    revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
    revoke execute on functions from public;

notify pgrst, 'reload schema';

commit;

-- Depois de criar o primeiro usuário em Authentication > Users, execute separadamente:
-- insert into public.admin_profiles (user_id, nome, email, nivel)
-- select id, 'Administrador Master', email, 'master'
-- from auth.users where lower(email) = lower('SEU_EMAIL_AQUI');
