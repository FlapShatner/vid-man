let videos = [];
let dragSrcIndex = null;
let viewMode = localStorage.getItem('vidman-view') || 'list';

async function loadVideos() {
  const response = await chrome.runtime.sendMessage({ action: 'getVideos' });
  videos = response.videos || [];
  render();
}

function setView(mode) {
  viewMode = mode;
  localStorage.setItem('vidman-view', mode);

  const list = document.getElementById('video-list');
  list.classList.toggle('video-list--grid', mode === 'grid');

  document.getElementById('btn-list-view').classList.toggle('active', mode === 'list');
  document.getElementById('btn-grid-view').classList.toggle('active', mode === 'grid');
}

function render() {
  const list = document.getElementById('video-list');
  const emptyState = document.getElementById('empty-state');
  const countEl = document.getElementById('video-count');

  countEl.textContent = videos.length === 0 ? '' : `${videos.length} video${videos.length !== 1 ? 's' : ''}`;

  if (videos.length === 0) {
    emptyState.classList.remove('hidden');
    list.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');
  list.innerHTML = '';

  videos.forEach((video, index) => {
    const li = createCard(video, index);
    list.appendChild(li);
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
    <button class="delete-btn" aria-label="Remove video" title="Remove from list">&#10005;</button>
  `;

  // Drag-and-drop
  li.addEventListener('dragstart', e => {
    dragSrcIndex = index;
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires data to be set
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

  li.addEventListener('dragleave', () => {
    li.classList.remove('drag-over');
  });

  li.addEventListener('drop', async e => {
    e.preventDefault();
    li.classList.remove('drag-over');

    if (dragSrcIndex === null || dragSrcIndex === index) return;

    const moved = videos.splice(dragSrcIndex, 1)[0];
    videos.splice(index, 0, moved);
    dragSrcIndex = null;

    await chrome.runtime.sendMessage({ action: 'reorderVideos', videos });
    render();
  });

  // Delete
  li.querySelector('.delete-btn').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'removeVideo', videoId: video.videoId });
    videos = videos.filter(v => v.videoId !== video.videoId);
    render();
  });

  return li;
}

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

document.getElementById('btn-list-view').addEventListener('click', () => setView('list'));
document.getElementById('btn-grid-view').addEventListener('click', () => setView('grid'));

loadVideos();
setView(viewMode);
