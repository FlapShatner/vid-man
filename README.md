# Video Man

A Chrome extension for saving and organizing YouTube videos into a personal list.

## Features

- Adds an "Add to List" button to every YouTube video card
- Popup button to add the currently playing video directly from its watch page
- Dedicated list page displaying saved videos with title, channel, duration, and publish date
- Toggle between vertical list view and responsive grid view
- Drag-and-drop reordering in list view
- Per-video delete button
- View preference (list/grid) persisted across sessions

## Installation

This extension is not published to the Chrome Web Store and must be loaded manually as an unpacked extension.

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `vid-man` project folder
5. The extension will appear in your toolbar

After making any code changes, return to `chrome://extensions` and click the reload button on the extension card, then refresh any open YouTube tabs.

## Usage

### Adding videos from the YouTube feed

Browse YouTube. An **+ Add to List** button will appear on each video card in the feed, search results, and sidebar. Click it to save the video. The button briefly confirms the action and prevents duplicates.

### Adding the currently playing video

Navigate to a YouTube watch page and click the extension icon in the toolbar. The popup will show an **Add This Video** button. Click it to save the video currently loaded in that tab.

### Viewing your list

Click **Open Video List** in the popup. This opens a full browser tab showing all saved videos.

- **List view**: Videos are shown in a vertical list with the thumbnail on the left. Drag the handle on the left of any card to reorder.
- **Grid view**: Videos are arranged in a responsive grid with the thumbnail above the metadata. Switch between views using the List / Grid buttons in the top-right of the page.

Hover over any card to reveal the delete button.

## Project Structure

```
vid-man/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker: handles all storage reads and writes
├── content.js             # Injected into YouTube pages; adds buttons to video cards
├── content.css            # Styles for the injected button
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
└── list-page/
    ├── list.html
    ├── list.js
    └── list.css
```

## Data Storage

Videos are stored in `chrome.storage.local` as an array of objects with the following shape:

```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Video Title",
  "author": "Channel Name",
  "duration": "3:32",
  "publishDate": "Apr 12, 2021",
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "addedAt": "2026-05-31T12:00:00.000Z"
}
```

Order is preserved as saved and updated whenever the list is reordered.

## Notes

YouTube is a single-page application and periodically updates its DOM structure. The content script uses a `MutationObserver` to handle dynamically loaded content as the user navigates between pages without a full reload. If video metadata such as duration or publish date appears as "Unknown", it is likely that YouTube has changed the class name or element used for that field in the current layout variant being served.
