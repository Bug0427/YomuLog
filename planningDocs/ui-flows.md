# 🔄 Yomulog — UI Interaction Flows

This document outlines the major user interaction flows within the Yomulog app. These flows help clarify navigation structure, state management, and user experience expectations.

### Table of Contents
- Open App → Splash Screen → Home
- Navigate to Liked List
- Like a Manga
- Download Chapter
- Toggle Dark Mode
- Login / Account
- Edit Profile / Icon
- Manage Downloads
- Confirmation Screens
- Splash Screen
- Home Screen
- Search / Smart Results
- Library & Updates
- View Recent Updates
- Manga Info → Reader
- Reader Navigation
- Recently Read
- Liked Metadata & Suggestions
- Settings & Preferences
- Submit Feedback
- Report Issue
- Pull-to-Refresh
- Offline Mode Behavior
- Continue Button Behavior
- Sync Across Devices
- Download Preferences (Future Plan)
- Recommendations Screen (Future Plan)
- Auto-Cleanup & Storage Management
- View Unavailable Manga (Planned)
- Developer Alerts / Logging (Internal)
- Localization and Language Support
---

## 🏠 Flow: Open App → Splash Screen → Home Screen

1. User launches the app
2. `SplashScreen` displays animation:
   - Teddy bear reads book and sips coffee
   - Something shocking happens and bear spits coffee on screen
   - Transition to coffee brown screen
3. App navigates automatically to `HomeScreen`
4. Branding/logo and welcome message are displayed
5. Bottom navigation bar or tabs are available to switch screens
6. Optionally: Display a preview of recently updated manga

---

## 📚 Flow: Navigate to Liked List

1. User taps on the "Library" tab from the top navigation bar
2. `LikedListScreen` loads
3. AsyncStorage is checked for liked manga data
4. If data exists, display `MangaCard` list
5. If no data, display an "empty state" message (e.g. "No manga liked yet")
6. User can filter/sort using the designated icons
7. Tapping a manga card opens `MangaInfoScreen`

---

## ❤️ Flow: Like a Manga from Card or Info Screen (Planned)

1. User navigates to Search screen
2. Types a keyword into `SearchBar`
3. Search function queries API or cached metadata
4. List of results displayed using `MangaCard`
4.5. User may also access the Manga Info Screen by tapping a manga card from Home, Search, Library, Downloads, or Recently Updated screens, then tap the heart icon there to like the manga
5. User taps a heart icon or "Like" button
6. Manga ID and metadata are stored to AsyncStorage (or synced to Supabase later)
7. Visual feedback is shown (e.g. heart icon fills or bounces)

> Note: Confirmation screens are only used for irreversible or critical actions like deleting data or accounts. Liking or unliking a manga does not require confirmation.

---

## ⬇️ Flow: Download Chapter for Offline Reading (Future)

1. User can initiate download from two locations:
   - From `MangaInfoScreen`: presses the "Download" button to download all chapters
   - From chapter list: presses the "Download" button at the end of the chapter tab to download that specific chapter
2. App fetches image files from API
3. Images are stored to local file system or AsyncStorage
4. User is notified when download is complete
5. App marks downloaded chapters as available offline
- User can monitor download progress through either:
  - The manga card (displaying completion percentage)
  - The chapter list (individual chapter download icons)
  - If a chapter fails to download or is corrupted, the download icon will change to a red error icon.
  - If there is at least one error icon present, a dismissable error banner will appear at the top of the screen with the message: 'This file did not download properly. Please delete chapters containing this icon and redownload them for successful reading.'
  - If the issue is repeated (e.g. download fails again), the error banner will reappear.
- Once a manga is downloaded, tapping it from the Downloads screen opens directly to the list of downloaded chapters.
- From the ReaderScreen, tapping the manga title at the top navigates to the MangaInfoScreen.
- Returning from the chapter list requires pressing back; it does not auto-navigate to MangaInfoScreen.
- A second 'Downloads by Manga' screen is now implemented to streamline bulk deletion and visibility.
- A manga can be downloaded regardless of whether it is liked or not.
- If any chapter is downloaded, the manga is flagged in metadata as having been downloaded.
- If storage space is insufficient, a dismissable error banner will appear in the Downloads screen. The banner reappears upon repeat attempts.

---


## ⚙️ Flow: Toggle Dark Mode (Future)

1. User opens Settings screen
2. Toggles "Dark Mode" switch
3. Theme context is updated
4. All screens/components re-render with dark theme styles
5. Theme preference is saved locally

---

## 🔐 Flow: Login and Account Creation

1. User opens the app and selects login or create account
2. Navigates to `LoginScreen` or `CreateAccountScreen`
3. Enters credentials and submits
4. On success, navigates to `HomeScreen`
5. On failure, displays error message
6. Optionally navigates to `ProfileScreen` to manage account details

---

## 👤 Flow: Edit Profile and Icon

1. User navigates to `ProfileScreen` from Settings
2. Edits Username, Password, or Email
3. Taps on profile picture to open `IconsScreen`
4. Selects an icon and saves
5. Changes are saved and reflected on app
6. After selecting an icon and saving, user taps "Save" to return to `ProfileScreen`
7. User can also press "Back" to return without saving changes; both "Save" and "Back" return to `ProfileScreen`

---

## 🗑️ Flow: Manage Downloads

1. User opens Settings and selects “Manage Downloads”
2. Navigates to `ManageDownloadsScreen`
3. User can toggle between grid view and list view
4. In either view, enters Edit Mode to select titles to delete
5. Presses "Done", triggering a confirmation prompt
- User can long-press on a downloaded manga card (3–5 seconds) to initiate deletion mode
- User can select multiple manga cards for batch deletion in edit mode
- Tapping into a manga’s downloaded chapter list also allows individual chapter deletion
- User can also view downloads in a manga-based layout, allowing deletion of an entire manga and its chapters at once.
- In either view, tapping a manga card opens the list of downloaded chapters for that title, not the Manga Info Screen.
- Users can press and hold on a manga card (3–5 seconds) to enter deletion mode and select multiple manga for batch deletion.
- A second 'Downloads by Manga' screen is now implemented to streamline bulk deletion and visibility.

---

## ✅ Flow: Confirmation Screen

1. User action requires confirmation (e.g. delete account, clear cache)
2. App navigates to `ConfirmationScreen`
3. User confirms or cancels action
4. If confirmed, performs the associated action
5. If cancelled, returns to previous screen

---

## 🧸 Flow: Splash Screen

1. User launches app
2. `SplashScreen` displays animation:
   - Teddy bear reads book and sips coffee
   - Something shocking happens and bear spits coffee on screen
   - Transition to coffee brown screen
3. App navigates automatically to `HomeScreen`

---

## 🏠 Flow: Home Screen Navigation

1. User lands on `HomeScreen`
2. Sees horizontal scroll sections for New, Popular, Recommended, and Updated manga
3. Uses `GenreScrollAnchor` to jump to specific section (Action, Romance, etc.)
4. Uses `ScrollArrows` to jump to top or bottom of the screen
5. Optionally taps a manga card to open `MangaInfoScreen`
6. Taps floating login/profile icon to access `LoginScreen` or `ProfileScreen`

---

## 🔍 Flow: Search and AI Smart Results

1. User taps on Search tab
2. `SearchScreen` loads
3. Enters keyword in `SearchBar`
4. App queries API or cached metadata
5. Results shown in `MangaCardGrid`
6. User can:
   - Tap filter icon to open `FilterDropdownModal`
   - Tap sort icon to open `SortOrderSelector`
   - Toggle between grid and list view
7. AI-assisted search returns results even with vague input or typos. This setting only affects the Search screen and Recommendation system, not other parts of the UI.
8. Tapping a result opens `MangaInfoScreen`

---

## 📚 Flow: Library and Updates Access

1. User taps Library tab
2. `LibraryScreen` loads
3. Top section shows `UpdatedPreviewRow`
4. User taps "View More" to open `RecentUpdatesScreen`
5. Below: user sees full library in grid or list view
6. Can toggle view mode, filter, and sort
7. Tapping a manga opens `MangaInfoScreen`

---

## 🔔 Flow: View Recent Updates

1. User taps “View All Updates” from Library or directly opens Recent Updates tab
2. `RecentUpdatesScreen` loads
3. Shows max 50 entries, auto-clears after 1 week. Once the user finishes reading the updated chapters, the manga is automatically removed from the list.
4. User can:
   - Tap to open `MangaInfoScreen`
   - Long-press to remove individual entries
   - Tap "Clear All" to empty the list
   - Toggle view mode (grid/list)
   - Scroll using arrows
- Unliking a manga can be done from the MangaInfoScreen, by long-pressing it in the Library view, or via the ReaderScreen settings tab. Once unliked, the manga is removed from both the Library (Liked List) and the Recently Updated list.

---

## 📖 Flow: Navigate from Manga Info to Reader

1. User taps a manga card from Home, Search, Library, Downloads, or Recently Updated screens
2. App navigates to `MangaInfoScreen`
3. User can:
   - Read metadata, description, and tags
   - View similar/related titles
   - Like or download the manga
4. User taps one of the read options:
   - Read First → opens `ReaderScreen` at first chapter
   - Read Last → opens `ReaderScreen` at latest chapter
   - Continue → opens `ReaderScreen` at last opened chapter (not necessarily the highest number marked as read); progress is stored per manga per account
   - The "Continue" button reflects the last chapter opened (not necessarily the highest read), and syncs across devices connected to the same account.
5. Chapter images are fetched from API or local storage
6. Images are rendered in a scrollable view
7. Optional: Previous/Next chapter buttons appear
8. If a chapter has been opened, its corresponding tab will change color to indicate it was read.
9. A planned feature will allow users to long-press a chapter tab to mark it as "unread."

---

## 📖 Flow: Reader Navigation

1. `ReaderScreen` displays manga pages via scroll
2. User scrolls or swipes to read
2.5. When nearing the end of the chapter, optional navigation buttons (Next Chapter / Previous Chapter) appear automatically. These provide manual navigation if auto-scroll fails or for user preference.
3. Bottom nav or edge-tap brings up:
   - Prev/Next Chapter buttons (future)
   - Download Chapter button
   - Save to Library (Like) button
   - Settings for Dark Mode, Scroll Direction, and Language
- If the manga is already liked, the Save to Library (Like) button will appear filled. Tapping it again will unlike the manga and remove it from the library.
4. Optionally changes reading mode (L→R, scroll)
   - Reader settings will include an option to enable/disable auto-loading the next chapter upon scroll completion.
- Reader mode displays chapter title at the top; tapping it opens MangaInfoScreen
- Reader screen may also include a visual reading progress bar in a future version.
- Progress is reflected across views (e.g., continue state, read indicators)
- A future feature may include a reading progress bar or visual indicator for how much of the chapter has been read.

---

## 📴 Flow: Offline Mode Behavior

1. If the app launches with no internet:
   - Home, Search, and other API-dependent screens will show an offline message or cached content where available.
   - A visual indicator or alert will inform the user they are offline.
2. Downloaded manga remain accessible:
   - User can open the Downloads tab and read any manga with downloaded chapters.
   - ReaderScreen functions fully with locally stored images.
3. Attempting to access non-downloaded content will trigger a warning or fallback behavior:
   - Optionally prompts the user to reconnect.
   - Buttons for unavailable features (like Search or AI) may be disabled or greyed out.

---

## ⏯️ Flow: Continue Button Behavior

1. Each manga card (in Library, Recently Read, or Search results) displays a "Continue" button once a chapter has been opened.
2. The "Continue" button reflects the last chapter that was opened by the user, even if other chapters have been marked as read.
3. Button label example: "Continue Ch. 5"
4. Tapping the button opens the ReaderScreen at the last opened chapter.
5. This state is synced to the user's account and updates across devices in real time when connected to the internet.
6. If no chapter has been opened yet, the button is hidden or replaced by a default “Read” prompt.

---

## 🔁 Flow: Sync Across Devices

1. If user is logged in:
   - Liked manga, reading progress, and continue-chapter state are synced across devices.
2. Sync occurs:
   - When the user opens the app
   - When a chapter is opened, marked read/unread, or liked/unliked
   - When manually refreshed via pull-to-refresh
3. Data is pushed to the server as soon as a change is made (if connected).
4. If offline, changes are queued and sent once reconnected.

---

## 📥 Flow: Download Preferences (Future Plan)

1. In Settings, user can configure preferences for downloads:
   - Enable auto-download of next chapter after finishing the current one
   - Limit downloads to Wi-Fi only
   - Set storage limits or auto-delete rules
2. Planned feature will allow chapter prefetching while reading.
3. User may toggle whether downloads include metadata for offline search.

---

## 🧠 Flow: Recommendations Screen (Future Plan)

1. A dedicated "For You" tab may be introduced:
   - Displays recommendations based on reading behavior and metadata
   - Includes filters for genre, completion status, popularity
2. AI-driven suggestions are refreshed regularly or on demand
3. Users can remove titles from the list to refine future suggestions

---

## 🧼 Flow: Auto-Cleanup and Storage Management

1. User can set storage limits in Settings (planned feature).
2. When limit is reached:
   - App prompts user to delete old downloads
   - Option to auto-remove chapters older than X days or already read
3. Downloaded data is prioritized by recency and unread status
4. Manual deletion always overrides automatic cleanup rules

---

## 🕘 Flow: Recently Read

1. User taps the "Recently Read" tab or preview section (collapsed like Recent Updates).
2. `RecentlyReadScreen` loads with up to 30 manga entries.
3. User can toggle between list and grid view.
4. Each manga card shows the last read chapter, with a "Continue" button (e.g., "Continue Ch. 5").
5. Tapping a manga opens directly to the `ReaderScreen` at the last opened chapter.
6. Long-pressing allows removing a manga from the recently read list.
7. Once a manga is removed or a new chapter is read, the list auto-updates accordingly.
8. Entries are sorted by most recently accessed.
9. Unliking a manga does not remove it from this list unless it hasn't been read recently.
10. A setting may be added later to toggle recording of recent reads.

---

### 📊 Flow: Liked Metadata & Recommendation Logic

- Metadata updates occur on any change in read status or when a manga is unliked.

1. When a manga is unliked:
   - It is removed from the Library (Liked List) and Recently Updated sections.
   - It remains in Recently Read unless removed manually or via natural clearing rules.
   - Downloaded chapters remain unless manually deleted.
   - The metadata is updated based on the user's reading progress:
     - If the user read ≥ 90% of chapters → status remains as "liked" in metadata, indicating the user liked it but finished reading.
     - If the user read ≥ 50% but < 90% → status remains "liked" in metadata for future suggestion relevance.
     - If the user read < 50% → status is changed to "unliked" (treated as not well-received or dropped).
2. This metadata is used for refining personalized suggestions, giving more weight to truly liked titles while noting dropped ones for contrast.
   - If a manga is 'reliked' after being previously unliked, the system re-evaluates and updates the metadata classification based on the current read completion status.
   - All manga that have been read but never liked retain a 'null' like status in metadata unless reliked later.
   - The metadata records both chapter completion status and like status.
   - For conflicting actions across multiple devices (e.g. liked on one device, unliked on another), timestamps are used to resolve the conflict—whichever action is more recent will take precedence.
   - Multiple 'like' actions with different timestamps are not in conflict unless followed by an 'unlike'.

Users may be given the option to thumbs up or thumbs down a title to influence recommendation weight. This feedback will have some influence on metadata ranking logic, although read behavior remains the primary factor.

---

## ⚙️ Flow: Settings and Preferences

1. User taps Settings tab
2. `SettingsScreen` loads
3. User can:
   - Toggle Dark Mode by tapping the moon/sun icon
   - Select language via the globe icon
   - Set scroll direction via the arrows icon
   - These actions can also be performed from the in-reader settings tab
   - Refresh metadata
   - Manage downloads
   - Reset AI recommendations
   - Enable/disable AI search
   - Clear cache or change credentials
4. Critical actions open `ConfirmationScreen`

---

## 📝 Flow: Submit Feedback

1. User navigates to `FeedbackScreen` from Settings
2. Picks one of:
   - Report a Problem
   - Leave a Review
   - Leave a Rating
3. Fills out appropriate form:
   - Text box for review/problem
   - Heart rating for rating
4. Taps Submit

---

## 🚨 Flow: Report an Issue

1. User starts a report (via Feedback or Manga Info)
2. Chooses category (Reading, Info, General, etc.)
3. Selects subcategory (e.g. wrong title, missing page)
4. Final screen has text box for description
5. Taps Submit or Cancel

---

## 🔄 Flow: Refresh Content with Pull Gesture

1. User swipes/pulls down on a scrollable screen (Home, Search, Library, etc.)
2. `RefreshNoteComponent` appears
3. Optional loading animation plays
4. App reloads content for that screen

---

## 🚫 Flow: View Unavailable Manga (Planned)

1. User navigates to `UnavailableMangaScreen` from Library or Settings
2. Screen displays manga titles that are temporarily or permanently unavailable
3. Each card includes:
   - Title
   - Previous source
   - Reason for removal (e.g. “No sources available”)
   - Option to mark as ‘no longer interested’
   - Option to reattempt loading
4. User can tap to view MangaInfoScreen if metadata is still cached

## 🛠 Developer Alerts / Logging (Internal)

- Failed downloads, corrupted files, and source outages trigger logging with timestamps
- Developers are alerted via internal dashboard or notification system
- Manga source issues are recorded, and fallback protocols are automatically initiated

## 🌐 Flow: Localization and Language Support

1. User selects preferred language from Settings
2. App updates all UI text, labels, and alerts accordingly
3. Preferences are saved locally and optionally synced to the user account
4. Manga metadata is only displayed in the selected language if provided by the manga source