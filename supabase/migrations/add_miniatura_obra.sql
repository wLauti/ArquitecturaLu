-- ============================================================
-- AÑADIR SELECCIÓN DE MINIATURA A OBRAS
-- ============================================================

-- 1. Añadimos la columna miniatura_archivo_id (referencia a la imagen elegida como portada)
alter table public.obras
add column if not exists miniatura_archivo_id uuid
references public.archivos(id) on delete set null;

-- 2. Índice para búsquedas
create index if not exists idx_obras_miniatura on public.obras (miniatura_archivo_id);
