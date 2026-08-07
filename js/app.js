(() => {
  const { $, $$, icon, showToast, openModal, closeModal, closeAllModals,
    renderObrasGrid, renderTagFilterList, renderTagSelectList,
    renderPendingFiles, renderExistingFiles, renderDetail } = UI;

  const state = {
    obras: [],
    etiquetas: [],
    editMode: false,
    filtros: {
      q: '',
      nombre: '',
      lugar: '',
      autor: '',
      yearSingle: '',
      yearFrom: '',
      yearTo: '',
      yearIsRange: false,
      tags: new Set()
    },
    formPendingFiles: [],
    formExistingFiles: [],
    formRemovedExistingFileIds: new Set(),
    formSelectedTagIds: new Set(),
    formOriginalTagIds: new Set(),
    editingObraId: null
  };

  function filtrarObras() {
    const f = state.filtros;
    const q = f.q.trim().toLowerCase();
    return state.obras.filter(obra => {
      if (f.nombre && !obra.nombre.toLowerCase().includes(f.nombre.trim().toLowerCase())) return false;
      if (f.lugar && !(obra.lugar || '').toLowerCase().includes(f.lugar.trim().toLowerCase())) return false;
      if (f.autor && !(obra.autor || '').toLowerCase().includes(f.autor.trim().toLowerCase())) return false;

      if (f.yearIsRange) {
        if (f.yearFrom && obra.fecha_inicio && Number(obra.fecha_inicio) < Number(f.yearFrom)) return false;
        if (f.yearTo && obra.fecha_inicio && Number(obra.fecha_inicio) > Number(f.yearTo)) return false;
        if (!f.yearFrom && !f.yearTo) {}
      } else if (f.yearSingle) {
        const y = Number(f.yearSingle);
        const start = Number(obra.fecha_inicio);
        const end = obra.fecha_fin ? Number(obra.fecha_fin) : start;
        if (!(y >= start && y <= end) && !(y === start)) {
          const any = [obra.fecha_inicio, obra.fecha_fin].some(v => v && Number(v) === y);
          if (!any) return false;
        }
      }

      if (f.tags.size) {
        const obraTagIds = new Set((obra.etiquetas || []).map(t => t.id));
        for (const tid of f.tags) if (!obraTagIds.has(tid)) return false;
      }

      if (q) {
        const haystack = [
          obra.nombre, obra.lugar, obra.autor, obra.detalles,
          ...(obra.etiquetas || []).map(t => t.nombre)
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  function actualizarVista() {
    const filtradas = filtrarObras();
    renderObrasGrid(filtradas, state.editMode);
    actualizarRangoAniosLabel();
  }

  function actualizarRangoAniosLabel() {
    const label = $('#yearRangeLabel');
    if (!label) return;
    const f = state.filtros;
    if (f.yearIsRange) {
      if (f.yearFrom && f.yearTo) label.textContent = `${f.yearFrom} – ${f.yearTo}`;
      else if (f.yearFrom) label.textContent = `desde ${f.yearFrom}`;
      else if (f.yearTo) label.textContent = `hasta ${f.yearTo}`;
      else label.textContent = 'todos';
    } else {
      label.textContent = f.yearSingle ? String(f.yearSingle) : 'todos';
    }
  }

  async function cargarTodo() {
    try {
      const [obras, etiquetas] = await Promise.all([
        Database.getAllObras(),
        Database.getAllEtiquetas()
      ]);
      state.obras = obras;
      state.etiquetas = etiquetas;
      renderTagFilterList(etiquetas, state.filtros.tags);
      actualizarVista();
    } catch (e) {
      console.error(e);
      $('#obrasGrid').innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:56px;height:56px;color:#dc2626;margin-bottom:18px;">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h3>No se pudo conectar con Supabase</h3>
          <p>Verifica que has configurado tu URL y anon key en <b>js/config.js</b>, y que la base de datos y el bucket existen (ver instrucciones).<br><br><code style="background:#f5f5f4;padding:4px 8px;border-radius:6px;font-size:12px;">${UI.escapeHtml(e.message || String(e))}</code></p>
        </div>`;
      $('#resultsInfo').innerHTML = '<span style="color:#dc2626">Error de conexión</span>';
    }
  }

  function setEditMode(active) {
    state.editMode = !!active;
    const toggle = $('#toggleEditMode');
    const addBtn = $('#addObraBtn');
    if (toggle) {
      toggle.classList.toggle('btn-primary', active);
      toggle.classList.toggle('btn-secondary', !active);
      toggle.querySelector('.btn-label').textContent = active ? 'Salir de Edición' : 'Modo Edición';
    }
    if (addBtn) addBtn.classList.toggle('hidden', !active);
    localStorage.setItem('lu_editMode', active ? '1' : '0');
    actualizarVista();
  }

  function resetObraForm() {
    $('#obraForm').reset();
    $('#obraId').value = '';
    $('#modalTitle').textContent = 'Nueva Obra';
    state.formPendingFiles = [];
    state.formExistingFiles = [];
    state.formRemovedExistingFileIds = new Set();
    state.formSelectedTagIds = new Set();
    state.formOriginalTagIds = new Set();
    state.editingObraId = null;
    renderPendingFiles([]);
    renderExistingFiles([]);
    renderTagSelectList(state.etiquetas, new Set());
  }

  function abrirNuevaObra() {
    if (!state.editMode) return;
    resetObraForm();
    openModal('obraModal');
  }

  function abrirEditarObra(id) {
    const obra = state.obras.find(o => o.id === id);
    if (!obra) return;
    resetObraForm();
    state.editingObraId = id;
    $('#modalTitle').textContent = 'Editar Obra';
    $('#obraId').value = id;
    $('#inputNombre').value = obra.nombre || '';
    $('#inputFechaInicio').value = obra.fecha_inicio || '';
    $('#inputFechaFin').value = obra.fecha_fin || '';
    $('#inputLugar').value = obra.lugar || '';
    $('#inputAutor').value = obra.autor || '';
    $('#inputDetalles').value = obra.detalles || '';

    state.formExistingFiles = [...(obra.archivos || [])];
    renderExistingFiles(state.formExistingFiles);

    const tagIds = new Set((obra.etiquetas || []).map(t => t.id));
    state.formSelectedTagIds = new Set(tagIds);
    state.formOriginalTagIds = new Set(tagIds);
    renderTagSelectList(state.etiquetas, state.formSelectedTagIds);

    openModal('obraModal');
  }

  async function confirmarEliminar(id) {
    const obra = state.obras.find(o => o.id === id);
    if (!obra) return;
    const msg = `¿Seguro que deseas eliminar "${obra.nombre}"? Esta acción no se puede deshacer y también borrará sus archivos adjuntos.`;
    if (!confirm(msg)) return;
    try {
      await Database.deleteObra(id);
      showToast(`"${obra.nombre}" eliminada correctamente`, 'success');
      await cargarTodo();
    } catch (e) {
      console.error(e);
      showToast('Error al eliminar la obra: ' + (e.message || e), 'error');
    }
  }

  async function guardarObra() {
    const nombre = $('#inputNombre').value.trim();
    const fecha_inicio = $('#inputFechaInicio').value;
    const fecha_fin = $('#inputFechaFin').value;
    const lugar = $('#inputLugar').value.trim();
    const autor = $('#inputAutor').value.trim();
    const detalles = $('#inputDetalles').value.trim();

    if (!nombre || !fecha_inicio || !lugar || !autor) {
      showToast('Completa los campos obligatorios (Nombre, Fecha inicio, Lugar, Autor)', 'error');
      return;
    }
    const fi = Number(fecha_inicio);
    const ff = fecha_fin ? Number(fecha_fin) : null;
    if (ff && fi > ff) {
      showToast('El año de inicio no puede ser posterior al de fin', 'error');
      return;
    }

    const saveBtn = $('#saveObraBtn');
    const originalHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;margin:0"></span> Guardando...';

    try {
      const payload = {
        nombre, fecha_inicio: fi, fecha_fin: ff, lugar, autor, detalles: detalles || null
      };

      let saved;
      if (state.editingObraId) {
        const etiquetasToAdd = Array.from(state.formSelectedTagIds);
        const etiquetasToRemove = Array.from(state.formOriginalTagIds).filter(id => !state.formSelectedTagIds.has(id));

        let newUploaded = [];
        if (state.formPendingFiles.length) {
          newUploaded = await Promise.all(state.formPendingFiles.map(f => Storage.uploadFile(f, state.editingObraId)));
        }

        saved = await Database.updateObra(
          state.editingObraId,
          { ...payload, etiquetas: etiquetasToAdd },
          etiquetasToRemove,
          Array.from(state.formRemovedExistingFileIds),
          newUploaded
        );
        showToast('Obra actualizada correctamente', 'success');
      } else {
        let obraCreada = await Database.createObra({
          ...payload,
          etiquetas: Array.from(state.formSelectedTagIds),
          archivos: []
        });
        if (state.formPendingFiles.length && obraCreada) {
          const uploaded = await Promise.all(state.formPendingFiles.map(f => Storage.uploadFile(f, obraCreada.id)));
          saved = await Database.updateObra(
            obraCreada.id,
            payload,
            [],
            [],
            uploaded
          );
        } else {
          saved = obraCreada;
        }
        showToast('Obra creada correctamente', 'success');
      }

      closeModal('obraModal');
      await cargarTodo();
    } catch (e) {
      console.error(e);
      showToast('Error al guardar: ' + (e.message || e), 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHtml;
    }
  }

  async function crearEtiquetaDesdeForm() {
    const input = $('#newTagInput');
    const nombre = (input.value || '').trim();
    if (!nombre) return;
    try {
      const nueva = await Database.createEtiqueta(nombre);
      state.etiquetas = await Database.getAllEtiquetas();
      state.formSelectedTagIds.add(nueva.id);
      state.filtros.tags.delete(nueva.id);
      renderTagSelectList(state.etiquetas, state.formSelectedTagIds);
      renderTagFilterList(state.etiquetas, state.filtros.tags);
      input.value = '';
      showToast(`Etiqueta "${nueva.nombre}" creada`, 'success');
    } catch (e) {
      showToast('Error al crear etiqueta: ' + (e.message || e), 'error');
    }
  }

  function adjuntarArchivos(fileList) {
    const files = Array.from(fileList || []);
    files.forEach(f => {
      if (!state.formPendingFiles.some(existing => existing.name === f.name && existing.size === f.size && existing.lastModified === f.lastModified)) {
        state.formPendingFiles.push(f);
      }
    });
    renderPendingFiles(state.formPendingFiles);
  }

  function bindUI() {
    $('#toggleEditMode').addEventListener('click', () => setEditMode(!state.editMode));
    $('#addObraBtn').addEventListener('click', abrirNuevaObra);
    $('#clearFilters').addEventListener('click', () => {
      state.filtros = { q: '', nombre: '', lugar: '', autor: '', yearSingle: '', yearFrom: '', yearTo: '', yearIsRange: false, tags: new Set() };
      $('#searchInput').value = '';
      $('#filterNombre').value = '';
      $('#filterLugar').value = '';
      $('#filterAutor').value = '';
      $('#filterYearSingle').value = '';
      $('#filterYearFrom').value = '';
      $('#filterYearTo').value = '';
      $('#yearToggle').checked = false;
      $('#yearInputsSingle').classList.remove('hidden');
      $('#yearInputsRange').classList.add('hidden');
      renderTagFilterList(state.etiquetas, new Set());
      actualizarVista();
    });

    const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

    $('#searchInput').addEventListener('input', debounce(e => { state.filtros.q = e.target.value; actualizarVista(); }));
    $('#filterNombre').addEventListener('input', debounce(e => { state.filtros.nombre = e.target.value; actualizarVista(); }));
    $('#filterLugar').addEventListener('input', debounce(e => { state.filtros.lugar = e.target.value; actualizarVista(); }));
    $('#filterAutor').addEventListener('input', debounce(e => { state.filtros.autor = e.target.value; actualizarVista(); }));

    $('#yearToggle').addEventListener('change', e => {
      const isRange = e.target.checked;
      state.filtros.yearIsRange = isRange;
      $('#yearInputsSingle').classList.toggle('hidden', isRange);
      $('#yearInputsRange').classList.toggle('hidden', !isRange);
      state.filtros.yearSingle = $('#filterYearSingle').value;
      state.filtros.yearFrom = $('#filterYearFrom').value;
      state.filtros.yearTo = $('#filterYearTo').value;
      actualizarVista();
    });
    $('#filterYearSingle').addEventListener('input', e => { state.filtros.yearSingle = e.target.value; actualizarVista(); });
    $('#filterYearFrom').addEventListener('input', e => { state.filtros.yearFrom = e.target.value; actualizarVista(); });
    $('#filterYearTo').addEventListener('input', e => { state.filtros.yearTo = e.target.value; actualizarVista(); });

    $('#tagFilterList').addEventListener('click', e => {
      const chip = e.target.closest('[data-tag-id]');
      if (!chip) return;
      const id = chip.dataset.tagId;
      if (state.filtros.tags.has(id)) state.filtros.tags.delete(id);
      else state.filtros.tags.add(id);
      renderTagFilterList(state.etiquetas, state.filtros.tags);
      actualizarVista();
    });

    $('#obrasGrid').addEventListener('click', async e => {
      const editBtn = e.target.closest('[data-action="edit"]');
      const delBtn = e.target.closest('[data-action="delete"]');
      if (editBtn && state.editMode) { e.stopPropagation(); abrirEditarObra(editBtn.dataset.id); return; }
      if (delBtn && state.editMode) { e.stopPropagation(); await confirmarEliminar(delBtn.dataset.id); return; }
      const card = e.target.closest('.obra-card');
      if (!card) return;
      const id = card.dataset.obraId;
      const obra = state.obras.find(o => o.id === id);
      if (!obra) return;
      renderDetail(obra, state.editMode);
      openModal('detailModal');
    });

    $('#detailFooter').addEventListener('click', e => {
      const id = $('#detailFooter').dataset.obraId;
      if (e.target.closest('#detailEditBtn') && id) { closeModal('detailModal'); abrirEditarObra(id); }
      if (e.target.closest('#detailDeleteBtn') && id) { closeModal('detailModal'); confirmarEliminar(id); }
    });

    document.addEventListener('click', e => {
      if (e.target.closest('[data-close-modal]')) closeAllModals();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAllModals();
    });

    $('#saveObraBtn').addEventListener('click', guardarObra);

    $('#createTagBtn').addEventListener('click', crearEtiquetaDesdeForm);
    $('#newTagInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); crearEtiquetaDesdeForm(); }});

    $('#tagSelectList').addEventListener('click', e => {
      const chip = e.target.closest('[data-tag-select-id]');
      if (!chip) return;
      const id = chip.dataset.tagSelectId;
      if (state.formSelectedTagIds.has(id)) state.formSelectedTagIds.delete(id);
      else state.formSelectedTagIds.add(id);
      renderTagSelectList(state.etiquetas, state.formSelectedTagIds);
    });

    $('#browseFilesBtn').addEventListener('click', () => $('#fileInput').click());
    $('#fileInput').addEventListener('change', e => { adjuntarArchivos(e.target.files); e.target.value = ''; });
    $('#fileUploader').addEventListener('dragover', e => { e.preventDefault(); });
    $('#fileUploader').addEventListener('drop', e => { e.preventDefault(); adjuntarArchivos(e.dataTransfer.files); });

    $('#fileListPending').addEventListener('click', e => {
      const btn = e.target.closest('[data-remove-pending]');
      if (!btn) return;
      const i = Number(btn.dataset.removePending);
      state.formPendingFiles.splice(i, 1);
      renderPendingFiles(state.formPendingFiles);
    });
    $('#fileListExisting').addEventListener('click', e => {
      const btn = e.target.closest('[data-remove-existing]');
      if (!btn) return;
      const id = btn.dataset.removeExisting;
      state.formRemovedExistingFileIds.add(id);
      state.formExistingFiles = state.formExistingFiles.filter(f => String(f.id) !== String(id));
      renderExistingFiles(state.formExistingFiles);
    });

    $('#obraForm').addEventListener('submit', e => { e.preventDefault(); guardarObra(); });
  }

  function gateUnlocked() {
    try { return !!localStorage.getItem('codigoLu'); } catch(e) { return false; }
  }

  function bindGate() {
    const overlay = document.getElementById('gateOverlay');
    if (!overlay) return;
    if (gateUnlocked()) {
      overlay.classList.add('hidden');
      return;
    }
    document.body.style.overflow = 'hidden';
    console.log('%c🔒 Acceso restringido', 'font-size:14px;font-weight:700;color:#dc2626;');
    console.log('%cPara desbloquear la página, ejecuta en la consola:', 'color:#44403c;font-weight:600;');
    console.log("%clocalStorage.setItem('codigoLu', 'TU_CODIGO_AQUI')", 'background:#f5f5f4;padding:6px 10px;border-radius:6px;font-family:monospace;color:#1c1917;');
    console.log('%cLuego recarga la página. Para volver a bloquear: localStorage.removeItem("codigoLu")', 'color:#78716c;font-size:12px;');
  }

  function boot() {
    bindGate();
    if (!gateUnlocked()) return;
    initSupabase();
    if (localStorage.getItem('lu_editMode') === '1') setEditMode(true);
    bindUI();
    cargarTodo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
