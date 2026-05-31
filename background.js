const MAIN_LIST_ID = 'main';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'addVideo':
      addVideo(message.video, message.listId || MAIN_LIST_ID).then(sendResponse);
      return true;
    case 'getLists':
      getLists().then(lists => sendResponse({ lists }));
      return true;
    case 'createList':
      createList(message.name).then(sendResponse);
      return true;
    case 'deleteList':
      deleteList(message.listId).then(sendResponse);
      return true;
    case 'renameList':
      renameList(message.listId, message.name).then(sendResponse);
      return true;
    case 'moveVideo':
      moveVideo(message.videoId, message.fromListId, message.toListId).then(sendResponse);
      return true;
    case 'removeVideo':
      removeVideo(message.videoId, message.listId).then(sendResponse);
      return true;
    case 'reorderVideos':
      reorderVideos(message.listId, message.videos).then(sendResponse);
      return true;
  }
});

async function getLists() {
  await migrate();
  const result = await chrome.storage.local.get('lists');
  return result.lists || [makeMainList()];
}

async function saveLists(lists) {
  await chrome.storage.local.set({ lists });
}

async function addVideo(video, listId) {
  const lists = await getLists();
  const list = lists.find(l => l.id === listId) || lists.find(l => l.id === MAIN_LIST_ID);
  if (!list) return { success: false, reason: 'list_not_found' };
  if (list.videos.find(v => v.videoId === video.videoId)) {
    return { success: false, reason: 'duplicate' };
  }
  list.videos.push(video);
  await saveLists(lists);
  return { success: true };
}

async function removeVideo(videoId, listId) {
  const lists = await getLists();
  const list = lists.find(l => l.id === listId);
  if (!list) return { success: false, reason: 'list_not_found' };
  list.videos = list.videos.filter(v => v.videoId !== videoId);
  await saveLists(lists);
  return { success: true };
}

async function reorderVideos(listId, videos) {
  const lists = await getLists();
  const list = lists.find(l => l.id === listId);
  if (!list) return { success: false };
  list.videos = videos;
  await saveLists(lists);
  return { success: true };
}

async function createList(name) {
  const lists = await getLists();
  const id = crypto.randomUUID();
  lists.push({ id, name: name.trim(), createdAt: new Date().toISOString(), videos: [] });
  await saveLists(lists);
  return { success: true, id };
}

async function deleteList(listId) {
  if (listId === MAIN_LIST_ID) return { success: false, reason: 'cannot_delete_main' };
  const lists = await getLists();
  await saveLists(lists.filter(l => l.id !== listId));
  return { success: true };
}

async function renameList(listId, name) {
  const lists = await getLists();
  const list = lists.find(l => l.id === listId);
  if (!list) return { success: false, reason: 'list_not_found' };
  list.name = name.trim();
  await saveLists(lists);
  return { success: true };
}

async function moveVideo(videoId, fromListId, toListId) {
  const lists = await getLists();
  const from = lists.find(l => l.id === fromListId);
  const to = lists.find(l => l.id === toListId);
  if (!from || !to) return { success: false, reason: 'list_not_found' };
  const idx = from.videos.findIndex(v => v.videoId === videoId);
  if (idx === -1) return { success: false, reason: 'video_not_found' };
  if (to.videos.find(v => v.videoId === videoId)) {
    return { success: false, reason: 'duplicate' };
  }
  const [video] = from.videos.splice(idx, 1);
  to.videos.push(video);
  await saveLists(lists);
  return { success: true };
}

function makeMainList() {
  return { id: MAIN_LIST_ID, name: 'Main', createdAt: new Date().toISOString(), videos: [] };
}

// One-time migration from the old flat videos[] storage shape
async function migrate() {
  const result = await chrome.storage.local.get(['videos', 'lists']);
  if (result.lists) return; // already migrated
  const main = makeMainList();
  if (result.videos?.length) {
    main.videos = result.videos;
  }
  await chrome.storage.local.set({ lists: [main] });
  await chrome.storage.local.remove('videos');
}
