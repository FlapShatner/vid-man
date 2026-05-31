function getVideoData(root) {
  const link = root.querySelector('a[href*="/watch?v="]');
  if (!link) return null;

  const match = link.href.match(/[?&]v=([^&]+)/);
  if (!match) return null;
  const videoId = match[1];

  // Title: try common selectors then fall back to the link's own title/text
  const titleEl = root.querySelector(
    '#video-title, #title-text, h3 a, [class*="title"] a, a[title]'
  );
  const title = (titleEl?.title || titleEl?.textContent || link.title || link.textContent || '').trim() || 'Unknown Title';

  // Author
  const authorEl = root.querySelector(
    'ytd-channel-name yt-formatted-string, #channel-name yt-formatted-string, [class*="byline"], [class*="channel-name"] a, [class*="channel-name"] span'
  );
  const author = authorEl?.textContent?.trim() || 'Unknown Channel';

  // Duration badge
  const badge = root.querySelector('ytd-thumbnail-overlay-time-status-renderer, [class*="time-status"]');
  let duration = 'Unknown';
  if (badge) {
    const labeled = badge.querySelector('[aria-label]');
    duration = labeled
      ? labeled.getAttribute('aria-label').trim()
      : badge.querySelector('span')?.textContent?.trim() || 'Unknown';
  }

  // Published date
  const metaItems = root.querySelectorAll('#metadata-line .inline-metadata-item, [class*="metadata-row"] span, [class*="metadata-snippet"] span');
  let publishDate = 'Unknown';
  for (const item of metaItems) {
    const text = item.textContent.trim();
    // Skip pure view-count strings like "1.2M views"
    if (text && !/^\d[\d.,]*\s*(K|M|B)?\s*views?$/i.test(text)) {
      publishDate = text;
      break;
    }
  }

  return {
    videoId,
    title,
    author,
    duration,
    publishDate,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    addedAt: new Date().toISOString(),
  };
}

function extractWatchPageData() {
  const match = location.href.match(/[?&]v=([^&]+)/);
  if (!match) return null;
  const videoId = match[1];

  const titleEl = document.querySelector(
    'h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, #above-the-fold #title h1'
  );
  const title = titleEl?.textContent?.trim() || document.title.replace(' - YouTube', '').trim();

  const authorEl = document.querySelector(
    'ytd-channel-name#channel-name yt-formatted-string, #channel-name yt-formatted-string'
  );
  const author = authorEl?.textContent?.trim() || 'Unknown Channel';

  const video = document.querySelector('video.html5-main-video, video');
  let duration = 'Unknown';
  if (video?.duration && isFinite(video.duration)) {
    const secs = Math.floor(video.duration);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    duration = h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  }

  const dateEl = document.querySelector(
    '#info-strings yt-formatted-string, ytd-watch-info-text yt-formatted-string, #date yt-formatted-string'
  );
  const publishDate = dateEl?.textContent?.trim() || 'Unknown';

  return {
    videoId,
    title,
    author,
    duration,
    publishDate,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    addedAt: new Date().toISOString(),
  };
}

function attachButton(metaEl) {
  if (metaEl.dataset.vidmanDone) return;
  metaEl.dataset.vidmanDone = '1';

  // Walk up to find a root that contains the video link
  let root = metaEl.parentElement;
  while (root && root !== document.body) {
    if (root.querySelector('a[href*="/watch?v="]')) break;
    root = root.parentElement;
  }
  if (!root || root === document.body) return;

  const btn = document.createElement('button');
  btn.className = 'vidman-btn';
  btn.textContent = '+ Add to List';
  btn.setAttribute('aria-label', 'Add video to list');

  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();

    const data = getVideoData(root);
    if (!data) return;

    chrome.runtime.sendMessage({ action: 'addVideo', video: data }, response => {
      if (response?.success) {
        btn.textContent = '✓ Added';
        btn.classList.add('vidman-btn--added');
      } else if (response?.reason === 'duplicate') {
        btn.textContent = 'Already saved';
        btn.classList.add('vidman-btn--added');
      }
      setTimeout(() => {
        btn.textContent = '+ Add to List';
        btn.classList.remove('vidman-btn--added');
      }, 2000);
    });
  });

  const wrap = document.createElement('div');
  wrap.className = 'vidman-btn-wrap';
  wrap.appendChild(btn);
  metaEl.appendChild(wrap);
}

function processAll() {
  document.querySelectorAll('.ytLockupViewModelMetadata').forEach(attachButton);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getWatchPageData') {
    sendResponse(extractWatchPageData());
  }
  return true;
});

const observer = new MutationObserver(() => processAll());
observer.observe(document.documentElement, { childList: true, subtree: true });

processAll();
