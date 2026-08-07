const Database = (() => {
  function supabase() {
    const s = getSupabase();
    if (!s) throw new Error('Supabase no inicializado. Revisa config.js.');
    return s;
  }

async function getAllObras() {
  const { data, error } = await supabase()
    .from('obras')
    .select(`
      *,
      obra_etiquetas(
        etiquetas(id, nombre)
      ),
      archivos!archivos_obra_id_fkey(
        id,
        nombre_original,
        ruta_storage,
        tipo_mime
      ),
      miniatura:archivos!obras_miniatura_archivo_id_fkey(
        id,
        nombre_original,
        ruta_storage,
        tipo_mime
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(normalizeObra);
}

function normalizeObra(obra) {
  return {
    id: obra.id,
    nombre: obra.nombre,
    fecha_inicio: obra.fecha_inicio,
    fecha_fin: obra.fecha_fin,
    lugar: obra.lugar,
    autor: obra.autor,
    detalles: obra.detalles,
    miniatura_archivo_id: obra.miniatura_archivo_id || null,
    miniatura: obra.miniatura || null,
    created_at: obra.created_at,
    etiquetas: (obra.obra_etiquetas || [])
      .filter(r => r && r.etiquetas)
      .map(r => ({
        id: r.etiquetas.id,
        nombre: r.etiquetas.nombre
      })),
    archivos: (obra.archivos || []).map(a => ({
      id: a.id,
      nombre_original: a.nombre_original,
      ruta_storage: a.ruta_storage,
      tipo_mime: a.tipo_mime
    }))
  };
}

  async function getAllEtiquetas() {
    const { data, error } = await supabase()
      .from('etiquetas')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function createEtiqueta(nombre) {
    nombre = nombre.trim();
    if (!nombre) throw new Error('Nombre de etiqueta vacío');
    const { data, error } = await supabase()
      .from('etiquetas')
      .insert({ nombre })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        const { data: existing } = await supabase()
          .from('etiquetas').select('*').eq('nombre', nombre).maybeSingle();
        if (existing) return existing;
      }
      throw error;
    }
    return data;
  }

  async function insertArchivosBatch(obraId, archivos) {
    if (!archivos || !archivos.length) return [];
    const fileRows = archivos.map(f => ({
      obra_id: obraId,
      nombre_original: f.nombre_original,
      ruta_storage: f.ruta_storage,
      tipo_mime: f.tipo_mime
    }));
    const { data, error } = await supabase()
      .from('archivos')
      .insert(fileRows)
      .select('*');
    if (error) throw error;
    return data || [];
  }

  async function setObraMiniatura(obraId, miniaturaArchivoId) {
    const { error } = await supabase()
      .from('obras')
      .update({ miniatura_archivo_id: miniaturaArchivoId || null })
      .eq('id', obraId);
    if (error) throw error;
    return true;
  }

  function resolveMiniaturaId(ref, mapPendingToInserted, existingArchivos) {
    if (!ref) return null;
    if (ref.existing) {
      const match = existingArchivos?.find(a => String(a.id) === String(ref.id));
      return match ? match.id : null;
    } else {
      const idx = Number(ref.pendingIndex);
      if (Number.isFinite(idx) && mapPendingToInserted[idx]) {
        return mapPendingToInserted[idx].id;
      }
      return null;
    }
  }

  async function createObra(payload) {
    const { etiquetas, archivos, miniaturaRef, ...obraData } = payload;

    const obraInsert = {
      nombre: obraData.nombre,
      fecha_inicio: obraData.fecha_inicio,
      fecha_fin: obraData.fecha_fin || null,
      lugar: obraData.lugar,
      autor: obraData.autor,
      detalles: obraData.detalles || null,
      miniatura_archivo_id: null
    };
    const { data, error } = await supabase()
      .from('obras')
      .insert(obraInsert)
      .select()
      .single();
    if (error) throw error;
    const obraId = data.id;

    if (etiquetas && etiquetas.length) {
      const links = etiquetas.map(tagId => ({ obra_id: obraId, etiqueta_id: tagId }));
      const { error: linkError } = await supabase().from('obra_etiquetas').insert(links);
      if (linkError) throw linkError;
    }

    const insertedArchivos = await insertArchivosBatch(obraId, archivos || []);
    const mapPendingToInserted = (archivos || []).map((_, i) => insertedArchivos[i] || null);

    const miniaturaId = resolveMiniaturaId(miniaturaRef, mapPendingToInserted, []);
    if (miniaturaId) await setObraMiniatura(obraId, miniaturaId);

    return (await getAllObras()).find(o => o.id === obraId);
  }

  async function updateObra(obraId, payload, etiquetasToRemove = [], archivosToRemove = [], newArchivos = [], miniaturaRef = null) {
    const { etiquetas, archivos, miniatura, ...obraData } = payload;

    const { error } = await supabase()
      .from('obras')
      .update({
        nombre: obraData.nombre,
        fecha_inicio: obraData.fecha_inicio,
        fecha_fin: obraData.fecha_fin || null,
        lugar: obraData.lugar,
        autor: obraData.autor,
        detalles: obraData.detalles || null
      })
      .eq('id', obraId);
    if (error) throw error;

    const current = (await getAllObras()).find(o => o.id === obraId);
    const currentTagIds = new Set((current?.etiquetas || []).map(t => t.id));

    const toAdd = (etiquetas || []).filter(id => !currentTagIds.has(id));
    const toRemove = etiquetasToRemove || [];
    if (toAdd.length) {
      const links = toAdd.map(tagId => ({ obra_id: obraId, etiqueta_id: tagId }));
      const { error: le } = await supabase().from('obra_etiquetas').insert(links);
      if (le) throw le;
    }
    if (toRemove.length) {
      const { error: re } = await supabase()
        .from('obra_etiquetas')
        .delete()
        .eq('obra_id', obraId)
        .in('etiqueta_id', toRemove);
      if (re) throw re;
    }

    if (archivosToRemove && archivosToRemove.length) {
      const { error: fae } = await supabase()
        .from('archivos').delete().in('id', archivosToRemove);
      if (fae) throw fae;
    }
    const insertedNuevos = await insertArchivosBatch(obraId, newArchivos || []);
    const mapPendingToInserted = (newArchivos || []).map((_, i) => insertedNuevos[i] || null);

    const keptExisting = (current?.archivos || [])
      .filter(a => !(archivosToRemove || []).some(rid => String(rid) === String(a.id)));

    const miniaturaId = resolveMiniaturaId(miniaturaRef, mapPendingToInserted, keptExisting);
    await setObraMiniatura(obraId, miniaturaId || null);

    return (await getAllObras()).find(o => o.id === obraId);
  }

  async function deleteObra(obraId) {
    const obra = (await getAllObras()).find(o => o.id === obraId);
    if (obra && obra.archivos && obra.archivos.length) {
      try {
        const paths = obra.archivos.map(a => a.ruta_storage);
        await Storage.deleteFiles(paths);
      } catch (e) {
        console.warn('No se pudieron borrar archivos del storage:', e);
      }
    }
    const { error } = await supabase().from('obras').delete().eq('id', obraId);
    if (error) throw error;
    return true;
  }

  async function deleteArchivoById(archivoId) {
    const { data: archivo, error: getErr } = await supabase()
      .from('archivos').select('*').eq('id', archivoId).single();
    if (getErr) throw getErr;
    try { await Storage.deleteFiles([archivo.ruta_storage]); } catch(e) { console.warn(e); }
    const { error } = await supabase().from('archivos').delete().eq('id', archivoId);
    if (error) throw error;
    return true;
  }

  return {
    getAllObras,
    getAllEtiquetas,
    createEtiqueta,
    createObra,
    updateObra,
    deleteObra,
    deleteArchivoById
  };
})();

window.Database = Database;
