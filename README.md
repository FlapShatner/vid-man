# Video Manager

A Chrome extension for saving and organizing YouTube videos into named lists.

## Features

- Adds an "Add to List" button to every YouTube video card
- Popup button to add the currently playing video directly from its watch page
- Videos are saved to a default Main list with one click — no list selection required at save time
- Create multiple named lists and move videos between them after saving
- Dedicated list page with a sidebar for navigating between lists
- Toggle between vertical list view and responsive grid view
- Drag-and-drop reordering within a list
- Per-video delete and move controls
- View preference and last-viewed list persisted across sessions

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

Browse YouTube. An **+ Add to List** button will appear on each video card in the feed, search results, and sidebar. Click it to save the video to your Main list. The button briefly confirms the action and prevents duplicates.

### Adding the currently playing video

Navigate to a YouTube watch page and click the extension icon in the toolbar. The popup will show an **Add This Video** button. Click it to save the video to your Main list.

### Viewing and managing your lists

Click **Open Video List** in the popup. This opens a full browser tab with a sidebar on the left and your videos on the right.

**Navigating lists**

The sidebar displays all your lists with a video count next to each name. Click any list to view its contents. The last-viewed list is remembered across sessions.

**Creating a list**

Click **+ New List** at the bottom of the sidebar, enter a name, and press Enter or click Create.

**Deleting a list**

Hover over a list name in the sidebar to reveal the delete button. Clicking it will prompt for confirmation before the list and all its videos are permanently removed. The Main list cannot be deleted.

**Moving a video**

Hover over any video card to reveal a **Move to...** button. Clicking it opens a dropdown listing all other lists. Select a destination to move the video immediately.

**Reordering videos**

In list view, drag the handle on the left of any card to change its position within the current list.

**Deleting a video**

Hover over any video card to reveal the delete button and remove it from the current list.

**Switching views**

Use the List / Grid buttons in the top-right of the page to toggle between a vertical list and a responsive grid. In grid view, the thumbnail appears above the video metadata.

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

All data is stored in `chrome.storage.local` as a `lists` array. Each list contains an embedded array of video objects.

```json
{
  "lists": [
    {
      "id": "main",
      "name": "Main",
      "createdAt": "2026-05-31T12:00:00.000Z",
      "videos": [
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
      ]
    }
  ]
}
```

Video order within each list is preserved and updated whenever the list is reordered. If data from an older version of the extension is detected (a flat `videos` array), it is automatically migrated into the Main list on first run.

## Notes

YouTube is a single-page application and periodically updates its DOM structure. The content script uses a `MutationObserver` to handle dynamically loaded content as the user navigates between pages without a full reload. If video metadata such as duration or publish date appears as "Unknown", it is likely that YouTube has changed the class name or element used for that field in the current layout variant being served.
