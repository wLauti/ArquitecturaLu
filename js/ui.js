const UI = (() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  function icon(name) {
    const icons = {
      pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
      close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
      download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
      check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
      alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"/></svg>',
      star: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    };
    return icons[name] || '';
  }

  function showToast(message, type = 'info', duration = 3500) {
    const container = $('#toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icon(type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info')}</span>
      <span class="message">${message}</span>
    `;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 0.25s, transform 0.25s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(30px)';
      setTimeout(() => el.remove(), 260);
    }, duration);
  }

  function openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) { m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  }
  function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  }
  function closeAllModals() {
    $$('.modal.open').forEach(m => {
      m.classList.remove('open');
      m.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = '';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function fechaLabel(obra) {
    const a = obra.fecha_inicio;
    const b = obra.fecha_fin;
    if (!a && !b) return 'Sin fecha';
    if (a && b && a !== b) return `${a} – ${b}`;
    return String(a || b);
  }

  function isImageFile(f) {
    if (!f) return false;
    const mime = f.tipo_mime || f.type || '';
    const name = f.nombre_original || f.name || '';
    return Storage.classifyFile(mime, name) === 'image';
  }

  function firstImage(obra) {
    const archivos = obra.archivos || [];
    if (obra.miniatura_archivo_id) {
      const elegido = archivos.find(f => String(f.id) === String(obra.miniatura_archivo_id));
      if (elegido && isImageFile(elegido)) return elegido;
    }
    return archivos.find(f => isImageFile(f));
  }

  function miniaturaIsSelected(miniaturaRef, kind, idOrIndex) {
    if (!miniaturaRef) return false;
    if (kind === 'existing' && miniaturaRef.existing) {
      return String(miniaturaRef.id) === String(idOrIndex);
    }
    if (kind === 'pending' && !miniaturaRef.existing) {
      return Number(miniaturaRef.pendingIndex) === Number(idOrIndex);
    }
    return false;
  }

  function renderObrasGrid(obras, editMode = false) {
    const grid = $('#obrasGrid');
    const info = $('#resultsInfo');
    if (!grid) return;
    info.innerHTML = `<span>${obras.length} obra${obras.length === 1 ? '' : 's'} encontrada${obras.length === 1 ? '' : 's'}</span>`;
    if (!obras.length) {
      grid.innerHTML = `
        <div class="empty-state">
          ${icon('empty')}
          <h3>No hay obras para mostrar</h3>
          <p>${editMode ? 'Activa el modo edición y pulsa "Nueva Obra" para empezar a añadir obras al catálogo.' : 'Prueba a ajustar los filtros de búsqueda o desactiva los filtros para ver todas las obras.'}</p>
        </div>`;
      return;
    }

    grid.innerHTML = obras.map(obra => {
      const cover = firstImage(obra);
      const coverUrl = cover ? Storage.getPublicUrl(cover.ruta_storage) : '';
      const coverClass = cover ? '' : 'placeholder';
      const tagsHtml = (obra.etiquetas || []).slice(0, 4).map(t =>
        `<span class="tag-chip"><span class="tag-dot"></span>${escapeHtml(t.nombre)}</span>`
      ).join('');
      return `
        <article class="obra-card" data-obra-id="${obra.id}">
          <div class="obra-card-cover ${coverClass}">
            ${cover ? `<img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(obra.nombre)}" loading="lazy">` : ''}
          </div>
          ${editMode ? `
            <div class="obra-card-edit-actions">
              <button class="obra-card-icon-btn" data-action="edit" data-id="${obra.id}" title="Editar">${icon('edit')}</button>
              <button class="obra-card-icon-btn delete" data-action="delete" data-id="${obra.id}" title="Eliminar">${icon('trash')}</button>
            </div>
          ` : ''}
          <div class="obra-card-body">
            <h3 class="obra-card-title">${escapeHtml(obra.nombre)}</h3>
            <div class="obra-card-meta">
              <span>${icon('calendar')} ${escapeHtml(fechaLabel(obra))}</span>
              <span>${icon('pin')} ${escapeHtml(obra.lugar || '')}</span>
              <span>${icon('user')} ${escapeHtml(obra.autor || '')}</span>
            </div>
            ${tagsHtml ? `<div class="obra-card-tags">${tagsHtml}</div>` : ''}
          </div>
        </article>
      `;
    }).join('');
  }

  function renderTagFilterList(todasEtiquetas, seleccionadas = new Set()) {
    const wrap = $('#tagFilterList');
    if (!wrap) return;
    if (!todasEtiquetas.length) {
      wrap.innerHTML = `<span class="empty-tags">Aún no hay etiquetas creadas.</span>`;
      return;
    }
    wrap.innerHTML = todasEtiquetas.map(t => {
      const active = seleccionadas.has(t.id) ? 'active' : '';
      return `<span class="tag-chip ${active}" data-tag-id="${t.id}">
        <span class="tag-dot"></span>${escapeHtml(t.nombre)}
      </span>`;
    }).join('');
  }

  function renderTagSelectList(todasEtiquetas, seleccionadas = new Set()) {
    const wrap = $('#tagSelectList');
    if (!wrap) return;
    if (!todasEtiquetas.length) {
      wrap.innerHTML = `<span class="empty-tags">No hay etiquetas. Crea una arriba.</span>`;
      return;
    }
    wrap.innerHTML = todasEtiquetas.map(t => {
      const active = seleccionadas.has(t.id) ? 'active' : '';
      return `<span class="tag-chip ${active}" data-tag-select-id="${t.id}">
        <span class="tag-dot"></span>${escapeHtml(t.nombre)}
      </span>`;
    }).join('');
  }

  function fileIconHtml(kind, ext) {
    const label = kind === 'image' ? 'IMG'
      : kind === 'pdf' ? 'PDF'
      : kind === 'cad' ? 'CAD'
      : kind === 'doc' ? 'DOC'
      : (ext || '').toUpperCase().slice(0, 3) || 'FILE';
    return `<div class="file-icon ${kind}">${label}</div>`;
  }

  function miniaturaToggleBtn(kind, idOrIndex, selected, fileIsImage) {
    if (!fileIsImage) return '';
    const klass = selected
      ? 'file-thumb-toggle selected'
      : 'file-thumb-toggle';
    const title = selected ? 'Miniatura seleccionada · clic para quitar' : 'Usar como miniatura (portada)';
    return `
      <button type="button" class="${klass}"
              title="${title}"
              data-set-thumb="${kind}:${idOrIndex}">
        ${icon('star')}
      </button>
    `;
  }

  function renderPendingFiles(files, miniaturaRef = null) {
    const wrap = $('#fileListPending');
    if (!wrap) return;
    if (!files.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = files.map((f, i) => {
      const kind = Storage.classifyFile(f.type, f.name);
      const selected = miniaturaIsSelected(miniaturaRef, 'pending', i);
      const selKlass = selected ? 'selected' : '';
      return `
        <div class="file-item ${selKlass}" data-pending-index="${i}">
          ${fileIconHtml(kind, f.name.split('.').pop())}
          <div class="file-info">
            <div class="file-name">${escapeHtml(f.name)}</div>
            <div class="file-size">${Storage.formatBytes(f.size)} · nuevo${selected ? ' · <b>Miniatura</b>' : ''}</div>
          </div>
          ${miniaturaToggleBtn('pending', i, selected, kind === 'image')}
          <button type="button" class="file-remove" data-remove-pending="${i}" title="Quitar">${icon('close')}</button>
        </div>
      `;
    }).join('');
  }

  function renderExistingFiles(files, miniaturaRef = null) {
    const wrap = $('#fileListExisting');
    if (!wrap) return;
    if (!files.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = files.map(f => {
      const kind = Storage.classifyFile(f.tipo_mime, f.nombre_original);
      const selected = miniaturaIsSelected(miniaturaRef, 'existing', f.id);
      const selKlass = selected ? 'selected' : '';
      return `
        <div class="file-item ${selKlass}" data-existing-id="${f.id}">
          ${fileIconHtml(kind, f.nombre_original.split('.').pop())}
          <div class="file-info">
            <div class="file-name">${escapeHtml(f.nombre_original)}</div>
            <div class="file-size">existente${selected ? ' · <b>Miniatura</b>' : ''}</div>
          </div>
          ${miniaturaToggleBtn('existing', f.id, selected, kind === 'image')}
          <button type="button" class="file-remove" data-remove-existing="${f.id}" title="Quitar al guardar">${icon('close')}</button>
        </div>
      `;
    }).join('');
  }

  function renderDetail(obra, editMode = false) {
    const title = $('#detailTitle');
    const body = $('#detailBody');
    const footer = $('#detailFooter');
    if (!title || !body) return;

    title.textContent = obra.nombre;

    const images = (obra.archivos || []).filter(f => isImageFile(f));
    const pdfs = (obra.archivos || []).filter(f => Storage.classifyFile(f.tipo_mime, f.nombre_original) === 'pdf');
    const otros = (obra.archivos || []).filter(f => {
      const k = Storage.classifyFile(f.tipo_mime, f.nombre_original);
      return k !== 'image' && k !== 'pdf';
    });

    const galleryHtml = images.length ? `
      <section>
        <h2 class="detail-section-title">Galería</h2>
        <div class="detail-gallery">
          ${images.map(img => {
            const url = Storage.getPublicUrl(img.ruta_storage);
            const isCover = String(obra.miniatura_archivo_id) === String(img.id);
            return `<a class="detail-gallery-item ${isCover ? 'is-cover' : ''}" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="${isCover ? 'Portada' : ''}">
              <img src="${escapeHtml(url)}" alt="${escapeHtml(img.nombre_original)}" loading="lazy">
              ${isCover ? '<span class="cover-badge">Portada</span>' : ''}
            </a>`;
          }).join('')}
        </div>
      </section>
    ` : '';

    const pdfsHtml = pdfs.length ? `
      <section>
        <h2 class="detail-section-title">Documentos PDF</h2>
        <div style="display:flex;flex-direction:column;gap:16px;">
          ${pdfs.map(p => {
            const url = Storage.getPublicUrl(p.ruta_storage);
            return `
              <div>
                <div style="margin-bottom:8px;font-size:14px;font-weight:500;color:var(--color-text-muted)">${escapeHtml(p.nombre_original)}</div>
                <iframe class="pdf-embed" src="${escapeHtml(url)}#toolbar=1" title="${escapeHtml(p.nombre_original)}"></iframe>
                <div style="margin-top:8px;"><a class="btn btn-outline" href="${escapeHtml(url)}" target="_blank" rel="noopener" style="font-size:13px;padding:8px 14px;">${icon('download')} Abrir PDF en nueva pestaña</a></div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    ` : '';

    const otrosHtml = otros.length ? `
      <section>
        <h2 class="detail-section-title">Archivos (CAD / Otros)</h2>
        <div class="detail-files-list">
          ${otros.map(f => {
            const url = Storage.getPublicUrl(f.ruta_storage);
            const kind = Storage.classifyFile(f.tipo_mime, f.nombre_original);
            return `
              <a class="detail-file-link" href="${escapeHtml(url)}" target="_blank" rel="noopener" download="${escapeHtml(f.nombre_original)}">
                ${fileIconHtml(kind, f.nombre_original.split('.').pop())}
                <div class="file-info">
                  <div class="file-name">${escapeHtml(f.nombre_original)}</div>
                  <div class="file-size">${escapeHtml(f.tipo_mime || 'archivo')}</div>
                </div>
                ${icon('download')}
              </a>
            `;
          }).join('')}
        </div>
      </section>
    ` : '';

    const tagsHtml = (obra.etiquetas || []).length ? `
      <section>
        <h2 class="detail-section-title">Etiquetas</h2>
        <div class="detail-tags-list">
          ${(obra.etiquetas || []).map(t => `<span class="tag-chip active"><span class="tag-dot"></span>${escapeHtml(t.nombre)}</span>`).join('')}
        </div>
      </section>
    ` : '';

    body.innerHTML = `
      <div class="detail-content">
        <div class="detail-hero">
          <section class="detail-info">
            <h1>${escapeHtml(obra.nombre)}</h1>
            <div class="detail-meta-grid">
              <div class="detail-meta-item">
                <span class="detail-meta-label">Fecha</span>
                <span class="detail-meta-value">${escapeHtml(fechaLabel(obra))}</span>
              </div>
              <div class="detail-meta-item">
                <span class="detail-meta-label">Lugar</span>
                <span class="detail-meta-value">${escapeHtml(obra.lugar || '—')}</span>
              </div>
              <div class="detail-meta-item col-span-2">
                <span class="detail-meta-label">Autor / Arquitecto</span>
                <span class="detail-meta-value">${escapeHtml(obra.autor || '—')}</span>
              </div>
            </div>
            ${obra.detalles ? `
              <div>
                <h2 class="detail-section-title">Detalles</h2>
                <p class="detail-text">${escapeHtml(obra.detalles)}</p>
              </div>
            ` : ''}
          </section>
        </div>
        ${galleryHtml}
        ${tagsHtml}
        ${pdfsHtml}
        ${otrosHtml}
      </div>
    `;

    if (footer) {
      footer.innerHTML = editMode ? `
        <button type="button" class="btn btn-secondary" data-close-modal>Cerrar</button>
        <button type="button" class="btn btn-danger-solid" id="detailDeleteBtn">${icon('trash')} Eliminar</button>
        <button type="button" class="btn btn-primary" id="detailEditBtn">${icon('edit')} Editar obra</button>
      ` : `
        <button type="button" class="btn btn-secondary" data-close-modal>Cerrar</button>
      `;
      footer.dataset.obraId = obra.id;
    }
  }

  return {
    $, $$, icon, showToast, openModal, closeModal, closeAllModals,
    escapeHtml, fechaLabel, isImageFile, miniaturaIsSelected,
    renderObrasGrid, renderTagFilterList, renderTagSelectList,
    renderPendingFiles, renderExistingFiles, renderDetail
  };
})();

window.UI = UI;
