create extension if not exists pgcrypto;

create or replace function public.cf_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.avaliacoes_oficiais (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  professor_id uuid null default auth.uid(),
  data_avaliacao date not null default current_date,
  objetivo text null,
  observacoes text null,
  peso numeric(7,2) null,
  altura numeric(5,2) null,
  idade integer null,
  sexo text null check (sexo is null or sexo in ('M','F','Outro')),
  imc numeric(7,2) null,
  gordura_percentual numeric(7,2) null,
  massa_magra numeric(7,2) null,
  soma_dobras numeric(8,2) null,
  dobras jsonb not null default '{}'::jsonb,
  perimetria jsonb not null default '{}'::jsonb,
  ia_professor text null,
  ia_aluno text null,
  relatorio_professor text null,
  liberado_aluno boolean not null default false,
  liberar_fotos boolean not null default false,
  liberar_ia boolean not null default false,
  liberar_pdf boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.avaliacao_fotos_oficiais (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes_oficiais(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  posicao text not null check (posicao in ('frente','lado_direito','lado_esquerdo','costas')),
  storage_bucket text not null default 'avaliacao-fotos-oficial',
  storage_path text not null,
  mime_type text null,
  file_size integer null,
  width integer null,
  height integer null,
  released_to_student boolean not null default false,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (avaliacao_id, posicao)
);

create index if not exists idx_avaliacoes_oficiais_aluno_data on public.avaliacoes_oficiais(aluno_id, data_avaliacao desc, created_at desc);
create index if not exists idx_avaliacao_fotos_oficiais_avaliacao on public.avaliacao_fotos_oficiais(avaliacao_id);
create index if not exists idx_avaliacao_fotos_oficiais_aluno on public.avaliacao_fotos_oficiais(aluno_id, released_to_student);

alter table public.avaliacoes_oficiais enable row level security;
alter table public.avaliacao_fotos_oficiais enable row level security;

drop trigger if exists trg_avaliacoes_oficiais_updated_at on public.avaliacoes_oficiais;
create trigger trg_avaliacoes_oficiais_updated_at
before update on public.avaliacoes_oficiais
for each row execute function public.cf_set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avaliacao-fotos-oficial','avaliacao-fotos-oficial',false,12582912,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=12582912, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "avaliacoes oficiais staff select" on public.avaliacoes_oficiais;
drop policy if exists "avaliacoes oficiais staff insert" on public.avaliacoes_oficiais;
drop policy if exists "avaliacoes oficiais staff update" on public.avaliacoes_oficiais;
drop policy if exists "avaliacoes oficiais aluno select liberado" on public.avaliacoes_oficiais;

create policy "avaliacoes oficiais staff select" on public.avaliacoes_oficiais for select to authenticated using (exists (select 1 from public.staff_profiles sp where sp.user_id = (select auth.uid()) and sp.ativo = true and lower(sp.nivel) in ('master','professor','recepcao')));
create policy "avaliacoes oficiais staff insert" on public.avaliacoes_oficiais for insert to authenticated with check (exists (select 1 from public.staff_profiles sp where sp.user_id = (select auth.uid()) and sp.ativo = true and lower(sp.nivel) in ('master','professor','recepcao')));
create policy "avaliacoes oficiais staff update" on public.avaliacoes_oficiais for update to authenticated using (exists (select 1 from public.staff_profiles sp where sp.user_id = (select auth.uid()) and sp.ativo = true and lower(sp.nivel) in ('master','professor','recepcao'))) with check (exists (select 1 from public.staff_profiles sp where sp.user_id = (select auth.uid()) and sp.ativo = true and lower(sp.nivel) in ('master','professor','recepcao')));
create policy "avaliacoes oficiais aluno select liberado" on public.avaliacoes_oficiais for select to authenticated using (liberado_aluno = true and exists (select 1 from public.alunos a where a.id = avaliacoes_oficiais.aluno_id and a.arquivado_em is null and (a.auth_user_id = (select auth.uid()) or lower(a.email) = lower(coalesce((select auth.email()), '')))));

drop policy if exists "fotos oficiais staff select" on public.avaliacao_fotos_oficiais;
drop policy if exists "fotos oficiais staff insert" on public.avaliacao_fotos_oficiais;
drop policy if exists "fotos oficiais staff update" on public.avaliacao_fotos_oficiais;
drop policy if exists "fotos oficiais aluno select liberado" on public.avaliacao_fotos_oficiais;

create policy "fotos oficiais staff select" on public.avaliacao_fotos_oficiais for select to authenticated using (exists (select 1 from public.staff_profiles sp where sp.user_id = (select auth.uid()) and sp.ativo = true and lower(sp.nivel) in ('master','professor','recepcao')));
create policy "fotos oficiais staff insert" on public.avaliacao_fotos_oficiais for insert to authenticated with check (exists (select 1 from public.staff_profiles sp where sp.user_id = (select auth.uid()) and sp.ativo = true and lower(sp.nivel) in ('master','professor','recepcao')));
create policy "fotos oficiais staff update" on public.avaliacao_fotos_oficiais for update to authenticated using (exists (select 1 from public.staff_profiles sp where sp.user_id = (select auth.uid()) and sp.ativo = true and lower(sp.nivel) in ('master','professor','recepcao'))) with check (exists (select 1 from public.staff_profiles sp where sp.user_id = (select auth.uid()) and sp.ativo = true and lower(sp.nivel) in ('master','professor','recepcao')));
create policy "fotos oficiais aluno select liberado" on public.avaliacao_fotos_oficiais for select to authenticated using (released_to_student = true and exists (select 1 from public.avaliacoes_oficiais av join public.alunos a on a.id = av.aluno_id where av.id = avaliacao_fotos_oficiais.avaliacao_id and av.liberado_aluno = true and av.liberar_fotos = true and a.arquivado_em is null and (a.auth_user_id = (select auth.uid()) or lower(a.email) = lower(coalesce((select auth.email()), '')))));

drop policy if exists "storage fotos oficiais staff select" on storage.objects;
drop policy if exists "storage fotos oficiais staff insert" on storage.objects;
drop policy if exists "storage fotos oficiais staff update" on storage.objects;
drop policy if exists "storage fotos oficiais staff delete" on storage.objects;
drop policy if exists "storage fotos oficiais aluno select liberado" on storage.objects;

create policy "storage fotos oficiais staff select" on storage.objects for select to authenticated using (bucket_id = 'avaliacao-fotos-oficial' and exists (select 1 from public.staff_profiles sp where sp.user_id = (select auth.uid()) and sp.ativo = true and lower(sp.nivel) in ('master','professor','recepcao')));
create policy "storage fotos oficiais staff insert" on storage.objects for insert to authenticated with check (bucket_id = 'avaliacao-fotos-oficial' and exists (select 1 from public.staff_profiles sp where sp.user_id = (select auth.uid()) and sp.ativo = true and lower(sp.nivel) in ('master','professor','recepcao')));
create policy "storage fotos oficiais staff update" on storage.objects for update to authenticated using (bucket_id = 'avaliacao-fotos-oficial' and exists (select 1 from public.staff_profiles sp where sp.user_id = (select auth.uid()) and sp.ativo = true and lower(sp.nivel) in ('master','professor','recepcao'))) with check (bucket_id = 'avaliacao-fotos-oficial' and exists (select 1 from public.staff_profiles sp where sp.user_id = (select auth.uid()) and sp.ativo = true and lower(sp.nivel) in ('master','professor','recepcao')));
create policy "storage fotos oficiais staff delete" on storage.objects for delete to authenticated using (bucket_id = 'avaliacao-fotos-oficial' and exists (select 1 from public.staff_profiles sp where sp.user_id = (select auth.uid()) and sp.ativo = true and lower(sp.nivel) in ('master','professor')));
create policy "storage fotos oficiais aluno select liberado" on storage.objects for select to authenticated using (bucket_id = 'avaliacao-fotos-oficial' and exists (select 1 from public.avaliacao_fotos_oficiais p join public.avaliacoes_oficiais av on av.id = p.avaliacao_id join public.alunos a on a.id = av.aluno_id where p.storage_path = storage.objects.name and p.released_to_student = true and av.liberado_aluno = true and av.liberar_fotos = true and a.arquivado_em is null and (a.auth_user_id = (select auth.uid()) or lower(a.email) = lower(coalesce((select auth.email()), '')))));

grant select, insert, update on public.avaliacoes_oficiais to authenticated;
grant select, insert, update on public.avaliacao_fotos_oficiais to authenticated;