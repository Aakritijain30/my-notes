(() => {
    const $ = id => document.getElementById(id);
    const titleInput    = $('noteTitle');
    const bodyInput     = $('noteBody');
    const charCount     = $('charCount');
    const btnAdd        = $('btnAdd');
    const notesGrid     = $('notesGrid');
    const toast         = $('toast');
    const modalOverlay  = $('modalOverlay');
    const btnCancel     = $('btnCancel');
    const btnConfirm    = $('btnConfirm');
    const modalTitle    = $('modalTitle');
    const modalDesc     = $('modalDesc');
    const searchInput   = $('searchInput');
    const searchClear   = $('searchClear');
    const noteInputCard = $('noteInputCard');
    const sectionTitle  = $('sectionTitle');
    const btnEmptyTrash = $('btnEmptyTrash');
    const badgeNotes    = $('badgeNotes');
    const badgeTrash    = $('badgeTrash');

    const STORAGE   = 'notes_app_v2';
    let notes       = [];
    let trash       = [];
    let currentTab  = 'notes';
    let searchQuery = '';
    let modalAction = null; // { type, id } or { type: 'emptyTrash' }

    function save() {
        localStorage.setItem(STORAGE, JSON.stringify({ notes, trash }));
    }

    function load() {
        try {
            const d = JSON.parse(localStorage.getItem(STORAGE));
            if (d) { notes = d.notes || []; trash = d.trash || []; }
        } catch { notes = []; trash = []; }
    }

    let toastTimer;
    function showToast(msg) {
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.classList.add('show');
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
    }

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function formatDate(ts) {
        const d = new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            + '  •  '
            + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function highlight(text, query) {
        if (!query) return escapeHTML(text);
        const escaped = escapeHTML(text);
        const qEsc    = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return escaped.replace(new RegExp(`(${qEsc})`, 'gi'), '<mark>$1</mark>');
    }

    function updateBadges() {
        badgeNotes.textContent = notes.length;
        badgeTrash.textContent = trash.length;
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            noteInputCard.style.display  = currentTab === 'notes' ? '' : 'none';
            sectionTitle.textContent      = currentTab === 'notes' ? 'Saved Notes' : 'Trash';
            btnEmptyTrash.style.display   = currentTab === 'trash' && trash.length ? '' : 'none';
            render();
        });
    });

    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim().toLowerCase();
        searchClear.classList.toggle('visible', searchQuery.length > 0);
        render();
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClear.classList.remove('visible');
        render();
        searchInput.focus();
    });

    function render() {
        updateBadges();
        btnEmptyTrash.style.display = currentTab === 'trash' && trash.length ? '' : 'none';

        const source  = currentTab === 'notes' ? notes : trash;
        const isTrash = currentTab === 'trash';

        let filtered = source;
        if (searchQuery) {
            filtered = source.filter(n =>
                (n.title && n.title.toLowerCase().includes(searchQuery)) ||
                n.body.toLowerCase().includes(searchQuery)
            );
        }

        
        filtered = [...filtered].sort((a, b) =>
            (isTrash ? b.deletedAt : b.created) - (isTrash ? a.deletedAt : a.created)
        );

        
        if (filtered.length === 0) {
            let icon, h, p;
            if (searchQuery) {
                icon = '🔍'; h = 'No results found'; p = `No notes match "${escapeHTML(searchQuery)}"`;
            } else if (isTrash) {
                icon = '🗑️'; h = 'Trash is empty'; p = 'Deleted notes will appear here';
            } else {
                icon = '📝'; h = 'No notes yet'; p = 'Add your first note above to get started!';
            }
            notesGrid.innerHTML = `<div class="empty-state"><div class="icon">${icon}</div><h3>${h}</h3><p>${p}</p></div>`;
            return;
        }

        notesGrid.innerHTML = filtered.map(note => {
            const titleHTML = note.title
                ? `<div class="note-title">${highlight(note.title, searchQuery)}</div>`
                : '';
            const bodyHTML  = `<div class="note-body">${highlight(note.body, searchQuery)}</div>`;
            const dateLabel = isTrash
                ? `Deleted ${formatDate(note.deletedAt)}`
                : formatDate(note.created);

            let actions = '';
            if (isTrash) {
                actions = `
                    <button class="btn-icon restore" data-action="restore" data-id="${note.id}" aria-label="Restore" title="Restore">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                    </button>
                    <button class="btn-icon perma" data-action="permadelete" data-id="${note.id}" aria-label="Delete permanently" title="Delete permanently">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>`;
            } else {
                actions = `
                    <button class="btn-icon delete" data-action="trash" data-id="${note.id}" aria-label="Move to trash" title="Move to trash">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    </button>`;
            }

            return `
                <div class="note-card ${isTrash ? 'trashed' : ''}">
                    ${titleHTML}
                    ${bodyHTML}
                    <div class="note-footer">
                        <span class="note-date">${dateLabel}</span>
                        <div class="note-actions">${actions}</div>
                    </div>
                </div>`;
        }).join('');
    }

    notesGrid.addEventListener('click', e => {
        const btn    = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id     = btn.dataset.id;

        if (action === 'trash')            openModal('trash', id);
        else if (action === 'restore')     restoreNote(id);
        else if (action === 'permadelete') openModal('permadelete', id);
    });

    function addNote() {
        const title = titleInput.value.trim();
        const body  = bodyInput.value.trim();
        if (!body) return;
        notes.push({ id: uid(), title, body, created: Date.now() });
        save(); render();
        titleInput.value = '';
        bodyInput.value  = '';
        updateCharCount();
        updateAddBtn();
        showToast('✓  Note saved');
        titleInput.focus();
    }

    function moveToTrash(id) {
        const idx = notes.findIndex(n => n.id === id);
        if (idx === -1) return;
        const [note] = notes.splice(idx, 1);
        note.deletedAt = Date.now();
        trash.push(note);
        save(); render();
        showToast('✓  Moved to trash');
    }

    function restoreNote(id) {
        const idx = trash.findIndex(n => n.id === id);
        if (idx === -1) return;
        const [note] = trash.splice(idx, 1);
        delete note.deletedAt;
        notes.push(note);
        save(); render();
        showToast('✓  Note restored');
    }

    function permanentDelete(id) {
        trash = trash.filter(n => n.id !== id);
        save(); render();
        showToast('✓  Permanently deleted');
    }

    function emptyTrash() {
        trash = [];
        save(); render();
        showToast('✓  Trash emptied');
    }

    btnEmptyTrash.addEventListener('click', () => openModal('emptyTrash'));

    function openModal(type, id) {
        modalAction = { type, id };

        if (type === 'trash') {
            modalTitle.textContent = 'Move to Trash?';
            modalDesc.textContent  = 'You can restore this note later from the Trash tab.';
            btnConfirm.textContent = 'Move to Trash';
        } else if (type === 'permadelete') {
            modalTitle.textContent = 'Delete Permanently?';
            modalDesc.textContent  = 'This note will be gone forever. This cannot be undone.';
            btnConfirm.textContent = 'Delete Forever';
        } else if (type === 'emptyTrash') {
            modalTitle.textContent = 'Empty Trash?';
            modalDesc.textContent  = `All ${trash.length} note${trash.length !== 1 ? 's' : ''} in trash will be permanently deleted. This cannot be undone.`;
            btnConfirm.textContent = 'Empty Trash';
        }

        modalOverlay.classList.add('active');
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        modalAction = null;
    }

    btnCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay) closeModal();
    });

    btnConfirm.addEventListener('click', () => {
        if (!modalAction) return;
        const { type, id } = modalAction;
        if (type === 'trash')            moveToTrash(id);
        else if (type === 'permadelete') permanentDelete(id);
        else if (type === 'emptyTrash')  emptyTrash();
        closeModal();
    });

    function updateCharCount() {
        charCount.textContent = `${bodyInput.value.length} / 1000`;
    }

    function updateAddBtn() {
        btnAdd.disabled = bodyInput.value.trim().length === 0;
    }

    bodyInput.addEventListener('input', () => { updateCharCount(); updateAddBtn(); });
    btnAdd.addEventListener('click', addNote);

    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !btnAdd.disabled && currentTab === 'notes') {
            addNote();
        }
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });

    load();
    render();
    updateCharCount();
    updateAddBtn();
})();
