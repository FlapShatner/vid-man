chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'addVideo':
      addVideo(message.video).then(sendResponse);
      return true;
    case 'getVideos':
      getVideos().then(videos => sendResponse({ videos }));
      return true;
    case 'removeVideo':
      removeVideo(message.videoId).then(sendResponse);
      return true;
    case 'reorderVideos':
      saveVideos(message.videos).then(() => sendResponse({ success: true }));
      return true;
  }
});

async function getVideos() {
  const result = await chrome.storage.local.get('videos');
  return result.videos || [];
}

async function saveVideos(videos) {
  await chrome.storage.local.set({ videos });
}

async function addVideo(video) {
  const videos = await getVideos();
  if (videos.find(v => v.videoId === video.videoId)) {
    return { success: false, reason: 'duplicate' };
  }
  videos.push(video);
  await saveVideos(videos);
  return { success: true };
}

async function removeVideo(videoId) {
  const videos = await getVideos();
  await saveVideos(videos.filter(v => v.videoId !== videoId));
  return { success: true };
}
