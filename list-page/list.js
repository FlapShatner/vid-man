let lists = [];
let currentListId = localStorage.getItem('vidman-current-list') || 'main';
let dragSrcIndex = null;
let viewMode = localStorage.getItem('vidman-view') || 'list';

// Active move dropdown state
let moveDropdownVideoId = null;

// ── Bootstrap ────────────────────────────────────────────

async function loadLists() {
    const response = await chrome.runtime.sendMessage({ action: 'getLists' });
    lists = response.lists || [];
    // If saved currentListId no longer exists, fall back to main
    if (!lists.find(l => l.id === currentListId)) {
        currentListId = 'main';
    }
    renderSidebar();
    renderVideos();
}

// ── Sidebar ──────────────────────────────────────────────

function renderSidebar() {
    const nav = document.getElementById('list-nav');
    nav.innerHTML = '';
    lists.forEach(list => {
        const item = document.createElement('div');
        item.className = 'sidebar__item' + (list.id === currentListId ? ' sidebar__item--active' : '');
        item.dataset.listId = list.id;

        const label = document.createElement('button');
        label.className = 'sidebar__item-btn';
        label.textContent = list.name;
        label.addEventListener('click', () => switchList(list.id));

        const count = document.createElement('span');
        count.className = 'sidebar__count';
        count.textContent = list.videos.length;

        item.appendChild(label);
        item.appendChild(count);

        if (list.id !== 'main') {
            const del = document.createElement('button');
            del.className = 'sidebar__delete';
            del.title = 'Delete list';
            del.innerHTML = '&#10005;';
            del.addEventListener('click', e => {
                e.stopPropagation();
                confirmDeleteList(list);
            });
            item.appendChild(del);
        }

        nav.appendChild(item);
    });
}

function switchList(id) {
    currentListId = id;
    localStorage.setItem('vidman-current-list', id);
    renderSidebar();
    renderVideos();
    closeMoveDropdown();
}

// ── Main video area ───────────────────────────────────────

function currentList() {
    return lists.find(l => l.id === currentListId);
}

function renderVideos() {
    const list = currentList();
    const videos = list?.videos || [];
    const videoListEl = document.getElementById('video-list');
    const emptyState = document.getElementById('empty-state');
    const countEl = document.getElementById('video-count');

    countEl.textContent = videos.length === 0 ? '' : `${videos.length} video${videos.length !== 1 ? 's' : ''}`;

    if (videos.length === 0) {
        emptyState.classList.remove('hidden');
        videoListEl.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    videoListEl.innerHTML = '';
    videos.forEach((video, index) => {
        videoListEl.appendChild(createCard(video, index));
    });
}

function createCard(video, index) {
    const li = document.createElement('li');
    li.className = 'video-card';
    li.draggable = true;
    li.dataset.index = index;

    li.innerHTML = `
        <div class="drag-handle" title="Drag to reorder">&#8942;</div>
        <span class="card-position">${index + 1}</span>
        <a href="${video.url}" target="_blank" rel="noopener" class="thumbnail-link">
            <img src="${video.thumbnail}" alt="" class="thumbnail" loading="lazy">
        </a>
        <div class="video-info">
            <a href="${video.url}" target="_blank" rel="noopener" class="video-title">${esc(video.title)}</a>
            <div class="meta">
                <span class="author">${esc(video.author)}</span>
                <span class="meta-sep">·</span>
                <span class="duration">${esc(video.duration)}</span>
                <span class="meta-sep">·</span>
                <span class="publish-date">${esc(video.publishDate)}</span>
            </div>
            <div class="added-date">Saved ${formatDate(video.addedAt)}</div>
        </div>
        <div class="card-actions">
            <button class="move-btn" title="Move to another list">Move to...</button>
            <button class="delete-btn" aria-label="Remove video" title="Remove from list">&#10005;</button>
        </div>
    `;

    // Drag-and-drop
    li.addEventListener('dragstart', e => {
        dragSrcIndex = index;
        li.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
    });
    li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        document.querySelectorAll('.video-card').forEach(el => el.classList.remove('drag-over'));
    });
    li.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragSrcIndex !== null && dragSrcIndex !== index) {
            document.querySelectorAll('.video-card').forEach(el => el.classList.remove('drag-over'));
            li.classList.add('drag-over');
        }
    });
    li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
    li.addEventListener('drop', async e => {
        e.preventDefault();
        li.classList.remove('drag-over');
        if (dragSrcIndex === null || dragSrcIndex === index) return;
        const list = currentList();
        const moved = list.videos.splice(dragSrcIndex, 1)[0];
        list.videos.splice(index, 0, moved);
        dragSrcIndex = null;
        await chrome.runtime.sendMessage({ action: 'reorderVideos', listId: currentListId, videos: list.videos });
        renderVideos();
        renderSidebar();
    });

    // Move to...
    li.querySelector('.move-btn').addEventListener('click', e => {
        e.stopPropagation();
        toggleMoveDropdown(video.videoId, e.currentTarget);
    });

    // Delete
    li.querySelector('.delete-btn').addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ action: 'removeVideo', videoId: video.videoId, listId: currentListId });
        const list = currentList();
        list.videos = list.videos.filter(v => v.videoId !== video.videoId);
        renderVideos();
        renderSidebar();
    });

    return li;
}

// ── Move dropdown ─────────────────────────────────────────

function toggleMoveDropdown(videoId, anchor) {
    const dropdown = document.getElementById('move-dropdown');
    if (!dropdown.classList.contains('hidden') && moveDropdownVideoId === videoId) {
        closeMoveDropdown();
        return;
    }
    moveDropdownVideoId = videoId;

    const otherLists = lists.filter(l => l.id !== currentListId);
    const ul = document.getElementById('move-dropdown-list');
    ul.innerHTML = '';

    if (otherLists.length === 0) {
        const li = document.createElement('li');
        li.className = 'move-dropdown__empty';
        li.textContent = 'No other lists yet.';
        ul.appendChild(li);
    } else {
        otherLists.forEach(list => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.className = 'move-dropdown__option';
            btn.textContent = list.name;
            btn.addEventListener('click', async () => {
                await chrome.runtime.sendMessage({
                    action: 'moveVideo',
                    videoId,
                    fromListId: currentListId,
                    toListId: list.id,
                });
                const fromList = currentList();
                fromList.videos = fromList.videos.filter(v => v.videoId !== videoId);
                const toList = lists.find(l => l.id === list.id);
                // Reload from storage to get accurate state
                await loadLists();
                closeMoveDropdown();
            });
            li.appendChild(btn);
            ul.appendChild(li);
        });
    }

    // Position below the anchor button
    const rect = anchor.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.classList.remove('hidden');
}

function closeMoveDropdown() {
    document.getElementById('move-dropdown').classList.add('hidden');
    moveDropdownVideoId = null;
}

document.addEventListener('click', e => {
    const dropdown = document.getElementById('move-dropdown');
    if (!dropdown.classList.contains('hidden') && !dropdown.contains(e.target)) {
        closeMoveDropdown();
    }
});

// ── New list form ─────────────────────────────────────────

document.getElementById('btn-new-list').addEventListener('click', () => {
    document.getElementById('new-list-form').classList.remove('hidden');
    document.getElementById('btn-new-list').classList.add('hidden');
    document.getElementById('new-list-input').focus();
});

document.getElementById('new-list-cancel').addEventListener('click', cancelNewList);

document.getElementById('new-list-confirm').addEventListener('click', submitNewList);

document.getElementById('new-list-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitNewList();
    if (e.key === 'Escape') cancelNewList();
});

async function submitNewList() {
    const input = document.getElementById('new-list-input');
    const name = input.value.trim();
    if (!name) return;
    const response = await chrome.runtime.sendMessage({ action: 'createList', name });
    if (response.success) {
        input.value = '';
        cancelNewList();
        await loadLists();
        switchList(response.id);
    }
}

function cancelNewList() {
    document.getElementById('new-list-form').classList.add('hidden');
    document.getElementById('btn-new-list').classList.remove('hidden');
    document.getElementById('new-list-input').value = '';
}

// ── Delete list confirmation ───────────────────────────────

function confirmDeleteList(list) {
    const overlay = document.getElementById('confirm-overlay');
    document.getElementById('confirm-msg').textContent =
        `Delete "${list.name}"? This will remove all ${list.videos.length} video${list.videos.length !== 1 ? 's' : ''} in it.`;
    overlay.classList.remove('hidden');

    const ok = document.getElementById('confirm-ok');
    const cancel = document.getElementById('confirm-cancel');

    const cleanup = () => {
        overlay.classList.add('hidden');
        ok.replaceWith(ok.cloneNode(true));
        cancel.replaceWith(cancel.cloneNode(true));
    };

    document.getElementById('confirm-ok').addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ action: 'deleteList', listId: list.id });
        if (currentListId === list.id) currentListId = 'main';
        cleanup();
        await loadLists();
    });

    document.getElementById('confirm-cancel').addEventListener('click', cleanup);
}

// ── View toggle ───────────────────────────────────────────

function setView(mode) {
    viewMode = mode;
    localStorage.setItem('vidman-view', mode);
    const videoListEl = document.getElementById('video-list');
    videoListEl.classList.toggle('video-list--grid', mode === 'grid');
    document.getElementById('btn-list-view').classList.toggle('active', mode === 'list');
    document.getElementById('btn-grid-view').classList.toggle('active', mode === 'grid');
}

document.getElementById('btn-list-view').addEventListener('click', () => setView('list'));
document.getElementById('btn-grid-view').addEventListener('click', () => setView('grid'));

// ── Helpers ───────────────────────────────────────────────

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
}

function formatDate(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

// ── Init ──────────────────────────────────────────────────

loadLists();
setView(viewMode);
