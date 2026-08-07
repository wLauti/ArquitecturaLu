const Storage = (() => {
  function supabase() {
    const s = getSupabase();
    if (!s) throw new Error('Supabase no inicializado');
    return s;
  }
  function bucket() {
    return SUPABASE_CONFIG.STORAGE_BUCKET;
  }

  function sanitizeName(name) {
    const ext = name.split('.').pop();
    const base = name.slice(0, -(ext.length + 1))
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    return `${ts}_${rand}_${base}.${ext}`;
  }

  async function uploadFile(file, obraId) {
    const safeName = sanitizeName(file.name);
    const path = `obra_${obraId}/${safeName}`;
    const { data, error } = await supabase()
      .storage.from(bucket()).upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      });
    if (error) throw error;
    return {
      nombre_original: file.name,
      ruta_storage: data.path,
      tipo_mime: file.type || 'application/octet-stream'
    };
  }

  function getPublicUrl(path) {
    const { data } = supabase().storage.from(bucket()).getPublicUrl(path);
    return data?.publicUrl || '';
  }

  async function deleteFiles(paths) {
    if (!paths || !paths.length) return true;
    const { error } = await supabase().storage.from(bucket()).remove(paths);
    if (error) throw error;
    return true;
  }

  function classifyFile(mime, name = '') {
    if (!mime) mime = '';
    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'pdf';
    const cadExt = ['dwg','dxf','dgn','rvt','ifc','step','stp','iges','igs','stl','obj','fbx','3ds','skp'];
    const ext = name.split('.').pop().toLowerCase();
    if (cadExt.includes(ext)) return 'cad';
    if (['doc','docx','odt','txt','rtf'].includes(ext)) return 'doc';
    return 'default';
  }

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '';
    const units = ['B','KB','MB','GB','TB'];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
  }

  return {
    uploadFile,
    getPublicUrl,
    deleteFiles,
    classifyFile,
    formatBytes
  };
})();

window.Storage = Storage;

