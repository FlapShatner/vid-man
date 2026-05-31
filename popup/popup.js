document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isVideoPage = /youtube\.com\/watch\?/.test(tab?.url || '');

  if (isVideoPage) {
    document.getElementById('add-section').classList.remove('hidden');
    document.getElementById('add-btn').addEventListener('click', handleAddVideo);
  }

  document.getElementById('open-list-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('list-page/list.html') });
    window.close();
  });

  async function handleAddVideo() {
    const btn = document.getElementById('add-btn');
    btn.disabled = true;

    let data;
    try {
      data = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { action: 'getWatchPageData' }, response => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(response);
        });
      });
    } catch {
      showStatus('Could not read page. Try refreshing.', 'error');
      btn.disabled = false;
      return;
    }

    if (!data?.videoId) {
      showStatus('No video found on this page.', 'error');
      btn.disabled = false;
      return;
    }

    chrome.runtime.sendMessage({ action: 'addVideo', video: data }, response => {
      if (response?.success) {
        showStatus('Video added to list!', 'success');
      } else if (response?.reason === 'duplicate') {
        showStatus('Already in your list.', 'info');
      } else {
        showStatus('Something went wrong.', 'error');
      }
      btn.disabled = false;
    });
  }
});

function showStatus(text, type) {
  const el = document.getElementById('status-msg');
  el.textContent = text;
  el.className = `status status--${type}`;
}
