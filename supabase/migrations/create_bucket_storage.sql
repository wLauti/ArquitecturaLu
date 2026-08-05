-- ============================================================
-- CREAR BUCKET DE STORAGE + POLÍTICAS PÚBLICAS
-- ============================================================

-- Creamos el bucket (público) si no existe
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'archivos-obras',
  'archivos-obras',
  true,
  524288000,
  array[
    'image/*',
    'application/pdf',
    'application/octet-stream',
    'application/dwg',
    'application/dxf',
    'application/x-step',
    'application/vnd.geo+json',
    'model/vnd.dwf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/x-zip-compressed',
    'application/zip',
    'application/x-7z-compressed',
    'application/x-rar-compressed'
  ]
)
on conflict (id) do update
set public = true,
    file_size_limit = 524288000;

-- ============================================================
-- POLÍTICAS PARA storage.objects (bucket archivos-obras)
-- ============================================================

-- Política: CUALQUIERA PUEDE VER LOS ARCHIVOS (SELECT)
drop policy if exists "archivos-obras-select" on storage.objects;
create policy "archivos-obras-select" on storage.objects
  for select
  using (bucket_id = 'archivos-obras');

-- Política: CUALQUIERA PUEDE SUBIR ARCHIVOS (INSERT)
drop policy if exists "archivos-obras-insert" on storage.objects;
create policy "archivos-obras-insert" on storage.objects
  for insert
  with check (bucket_id = 'archivos-obras');

-- Política: CUALQUIERA PUEDE ACTUALIZAR (UPDATE)
drop policy if exists "archivos-obras-update" on storage.objects;
create policy "archivos-obras-update" on storage.objects
  for update
  using (bucket_id = 'archivos-obras')
  with check (bucket_id = 'archivos-obras');

-- Política: CUALQUIERA PUEDE BORRAR (DELETE)
drop policy if exists "archivos-obras-delete" on storage.objects;
create policy "archivos-obras-delete" on storage.objects
  for delete
  using (bucket_id = 'archivos-obras');
