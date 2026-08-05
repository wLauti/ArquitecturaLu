-- =====================================================================
--  SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS - CATÁLOGO DE ARQUITECTURA
--  Ejecuta este SQL en el Editor SQL de Supabase (Dashboard > SQL Editor)
-- =====================================================================

-- 1. Extensiones (por defecto ya suelen estar)
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLAS
-- ============================================================

create table if not exists public.etiquetas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  created_at  timestamptz not null default now(),
  unique(nombre)
);

create table if not exists public.obras (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  fecha_inicio  integer not null,
  fecha_fin     integer,
  lugar         text not null,
  autor         text not null,
  detalles      text,
  created_at    timestamptz not null default now()
);

create table if not exists public.obra_etiquetas (
  id          bigserial primary key,
  obra_id     uuid not null references public.obras(id) on delete cascade,
  etiqueta_id uuid not null references public.etiquetas(id) on delete cascade,
  unique(obra_id, etiqueta_id)
);

create table if not exists public.archivos (
  id              uuid primary key default gen_random_uuid(),
  obra_id         uuid not null references public.obras(id) on delete cascade,
  nombre_original text not null,
  ruta_storage    text not null,
  tipo_mime       text,
  created_at      timestamptz not null default now()
);

-- Índices para búsquedas rápidas
create index if not exists idx_obras_nombre     on public.obras using gin (to_tsvector('simple', nombre));
create index if not exists idx_obras_fecha      on public.obras (fecha_inicio, fecha_fin);
create index if not exists idx_obras_lugar      on public.obras (lugar);
create index if not exists idx_obras_autor      on public.obras (autor);
create index if not exists idx_archivos_obra    on public.archivos (obra_id);
create index if not exists idx_obra_etiquetas_o on public.obra_etiquetas (obra_id);
create index if not exists idx_obra_etiquetas_e on public.obra_etiquetas (etiqueta_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Permitir todo (uso personal)
-- ============================================================

alter table public.etiquetas      enable row level security;
alter table public.obras          enable row level security;
alter table public.obra_etiquetas enable row level security;
alter table public.archivos       enable row level security;

drop policy if exists "etiquetas-all" on public.etiquetas;
create policy "etiquetas-all" on public.etiquetas
  for all using (true) with check (true);

drop policy if exists "obras-all" on public.obras;
create policy "obras-all" on public.obras
  for all using (true) with check (true);

drop policy if exists "obra_etiquetas-all" on public.obra_etiquetas;
create policy "obra_etiquetas-all" on public.obra_etiquetas
  for all using (true) with check (true);

drop policy if exists "archivos-all" on public.archivos;
create policy "archivos-all" on public.archivos
  for all using (true) with check (true);

-- ============================================================
-- STORAGE (Bucket + políticas)
-- ============================================================
-- NOTA: El bucket debes crearlo manualmente con nombre: archivos-obras
-- Dashboard > Storage > Create bucket > Nombre: archivos-obras
-- Marca "Make bucket public" (público)
--
-- Luego ejecuta estas políticas (o crea políticas equivalentes en la UI):

/*
insert into storage.buckets (id, name, public)
values ('archivos-obras', 'archivos-obras', true)
on conflict (id) do nothing;
*/

-- Política: cualquiera puede ver los archivos
drop policy if exists "archivos-public" on storage.objects;
create policy "archivos-public" on storage.objects
  for select using (bucket_id = 'archivos-obras');

-- Política: cualquiera puede subir archivos
drop policy if exists "archivos-upload" on storage.objects;
create policy "archivos-upload" on storage.objects
  for insert with check (bucket_id = 'archivos-obras');

-- Política: cualquiera puede actualizar
drop policy if exists "archivos-update" on storage.objects;
create policy "archivos-update" on storage.objects
  for update using (bucket_id = 'archivos-obras');

-- Política: cualquiera puede borrar
drop policy if exists "archivos-delete" on storage.objects;
create policy "archivos-delete" on storage.objects
  for delete using (bucket_id = 'archivos-obras');
