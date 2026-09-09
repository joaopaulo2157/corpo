create extension if not exists pgcrypto;

create or replace function public.cf_v7_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.v7_assessments (
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

create table if not exists public.v7_assessment_photos (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.v7_assessments(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  posicao text not null check (posicao in ('frente','lado_direito','lado_esquerdo','costas')),
  storage_bucket text not null default 'avaliacao-fotos-v7',
  storage_path text not null,
  mime_type text null,
  file_size integer null,
  width integer null,
  height integer null,
  released_to_student boolean not null default false,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (assessment_id, posicao)
);

create index if not exists idx_v7_assessments_aluno_date
  on public.v7_assessments(aluno_id, data_avaliacao desc, created_at desc);

create index if not exists idx_v7_assessment_photos_assessment
  on public.v7_assessment_photos(assessment_id);

create index if not exists idx_v7_assessment_photos_student
  on public.v7_assessment_photos(aluno_id, released_to_student);

alter table public.v7_assessments enable row level security;
alter table public.v7_assessment_photos enable row level security;

drop trigger if exists trg_v7_assessments_updated_at on public.v7_assessments;
create trigger trg_v7_assessments_updated_at
before update on public.v7_assessments
for each row execute function public.cf_v7_set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avaliacao-fotos-v7',
  'avaliacao-fotos-v7',
  false,
  12582912,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 12582912,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "v7 assessments staff select" on public.v7_assessments;
drop policy if exists "v7 assessments staff insert" on public.v7_assessments;
drop policy if exists "v7 assessments staff update" on public.v7_assessments;
drop policy if exists "v7 assessments student select released" on public.v7_assessments;

create policy "v7 assessments staff select"
on public.v7_assessments for select
to authenticated
using (exists (
  select 1 from public.staff_profiles sp
  where sp.user_id = (select auth.uid())
    and sp.ativo = true
    and lower(sp.nivel) in ('master','professor','recepcao')
));

create policy "v7 assessments staff insert"
on public.v7_assessments for insert
to authenticated
with check (exists (
  select 1 from public.staff_profiles sp
  where sp.user_id = (select auth.uid())
    and sp.ativo = true
    and lower(sp.nivel) in ('master','professor','recepcao')
));

create policy "v7 assessments staff update"
on public.v7_assessments for update
to authenticated
using (exists (
  select 1 from public.staff_profiles sp
  where sp.user_id = (select auth.uid())
    and sp.ativo = true
    and lower(sp.nivel) in ('master','professor','recepcao')
))
with check (exists (
  select 1 from public.staff_profiles sp
  where sp.user_id = (select auth.uid())
    and sp.ativo = true
    and lower(sp.nivel) in ('master','professor','recepcao')
));

create policy "v7 assessments student select released"
on public.v7_assessments for select
to authenticated
using (
  liberado_aluno = true
  and exists (
    select 1 from public.alunos a
    where a.id = v7_assessments.aluno_id
      and a.arquivado_em is null
      and (
        a.auth_user_id = (select auth.uid())
        or lower(a.email) = lower(coalesce((select auth.email()), ''))
      )
  )
);

drop policy if exists "v7 photos staff select" on public.v7_assessment_photos;
drop policy if exists "v7 photos staff insert" on public.v7_assessment_photos;
drop policy if exists "v7 photos staff update" on public.v7_assessment_photos;
drop policy if exists "v7 photos student select released" on public.v7_assessment_photos;

create policy "v7 photos staff select"
on public.v7_assessment_photos for select
to authenticated
using (exists (
  select 1 from public.staff_profiles sp
  where sp.user_id = (select auth.uid())
    and sp.ativo = true
    and lower(sp.nivel) in ('master','professor','recepcao')
));

create policy "v7 photos staff insert"
on public.v7_assessment_photos for insert
to authenticated
with check (exists (
  select 1 from public.staff_profiles sp
  where sp.user_id = (select auth.uid())
    and sp.ativo = true
    and lower(sp.nivel) in ('master','professor','recepcao')
));

create policy "v7 photos staff update"
on public.v7_assessment_photos for update
to authenticated
using (exists (
  select 1 from public.staff_profiles sp
  where sp.user_id = (select auth.uid())
    and sp.ativo = true
    and lower(sp.nivel) in ('master','professor','recepcao')
))
with check (exists (
  select 1 from public.staff_profiles sp
  where sp.user_id = (select auth.uid())
    and sp.ativo = true
    and lower(sp.nivel) in ('master','professor','recepcao')
));

create policy "v7 photos student select released"
on public.v7_assessment_photos for select
to authenticated
using (
  released_to_student = true
  and exists (
    select 1 from public.v7_assessments va
    join public.alunos a on a.id = va.aluno_id
    where va.id = v7_assessment_photos.assessment_id
      and va.liberado_aluno = true
      and va.liberar_fotos = true
      and a.arquivado_em is null
      and (
        a.auth_user_id = (select auth.uid())
        or lower(a.email) = lower(coalesce((select auth.email()), ''))
      )
  )
);

drop policy if exists "v7 storage staff select" on storage.objects;
drop policy if exists "v7 storage staff insert" on storage.objects;
drop policy if exists "v7 storage staff update" on storage.objects;
drop policy if exists "v7 storage staff delete" on storage.objects;
drop policy if exists "v7 storage student select released" on storage.objects;

create policy "v7 storage staff select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avaliacao-fotos-v7'
  and exists (
    select 1 from public.staff_profiles sp
    where sp.user_id = (select auth.uid())
      and sp.ativo = true
      and lower(sp.nivel) in ('master','professor','recepcao')
  )
);

create policy "v7 storage staff insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avaliacao-fotos-v7'
  and exists (
    select 1 from public.staff_profiles sp
    where sp.user_id = (select auth.uid())
      and sp.ativo = true
      and lower(sp.nivel) in ('master','professor','recepcao')
  )
);

create policy "v7 storage staff update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avaliacao-fotos-v7'
  and exists (
    select 1 from public.staff_profiles sp
    where sp.user_id = (select auth.uid())
      and sp.ativo = true
      and lower(sp.nivel) in ('master','professor','recepcao')
  )
)
with check (
  bucket_id = 'avaliacao-fotos-v7'
  and exists (
    select 1 from public.staff_profiles sp
    where sp.user_id = (select auth.uid())
      and sp.ativo = true
      and lower(sp.nivel) in ('master','professor','recepcao')
  )
);

create policy "v7 storage staff delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avaliacao-fotos-v7'
  and exists (
    select 1 from public.staff_profiles sp
    where sp.user_id = (select auth.uid())
      and sp.ativo = true
      and lower(sp.nivel) in ('master','professor')
  )
);

create policy "v7 storage student select released"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avaliacao-fotos-v7'
  and exists (
    select 1
    from public.v7_assessment_photos p
    join public.v7_assessments va on va.id = p.assessment_id
    join public.alunos a on a.id = va.aluno_id
    where p.storage_path = storage.objects.name
      and p.released_to_student = true
      and va.liberado_aluno = true
      and va.liberar_fotos = true
      and a.arquivado_em is null
      and (
        a.auth_user_id = (select auth.uid())
        or lower(a.email) = lower(coalesce((select auth.email()), ''))
      )
  )
);

grant select, insert, update on public.v7_assessments to authenticated;
grant select, insert, update on public.v7_assessment_photos to authenticated;
