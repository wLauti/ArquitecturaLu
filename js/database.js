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
        archivos(id, nombre_original, ruta_storage, tipo_mime)
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
      created_at: obra.created_at,
      etiquetas: (obra.obra_etiquetas || [])
        .filter(r => r && r.etiquetas)
        .map(r => ({ id: r.etiquetas.id, nombre: r.etiquetas.nombre })),
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

  async function createObra(payload) {
    const { etiquetas, archivos, ...obraData } = payload;
    const { data, error } = await supabase()
      .from('obras')
      .insert({
        nombre: obraData.nombre,
        fecha_inicio: obraData.fecha_inicio,
        fecha_fin: obraData.fecha_fin || null,
        lugar: obraData.lugar,
        autor: obraData.autor,
        detalles: obraData.detalles || null
      })
      .select()
      .single();
    if (error) throw error;
    const obraId = data.id;

    if (etiquetas && etiquetas.length) {
      const links = etiquetas.map(tagId => ({ obra_id: obraId, etiqueta_id: tagId }));
      const { error: linkError } = await supabase().from('obra_etiquetas').insert(links);
      if (linkError) throw linkError;
    }

    if (archivos && archivos.length) {
      const fileRows = archivos.map(f => ({
        obra_id: obraId,
        nombre_original: f.nombre_original,
        ruta_storage: f.ruta_storage,
        tipo_mime: f.tipo_mime
      }));
      const { error: fileError } = await supabase().from('archivos').insert(fileRows);
      if (fileError) throw fileError;
    }
    return (await getAllObras()).find(o => o.id === obraId);
  }

  async function updateObra(obraId, payload, etiquetasToRemove = [], archivosToRemove = [], newArchivos = []) {
    const { etiquetas, archivos, ...obraData } = payload;
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
    if (newArchivos && newArchivos.length) {
      const fileRows = newArchivos.map(f => ({
        obra_id: obraId,
        nombre_original: f.nombre_original,
        ruta_storage: f.ruta_storage,
        tipo_mime: f.tipo_mime
      }));
      const { error: fie } = await supabase().from('archivos').insert(fileRows);
      if (fie) throw fie;
    }

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
