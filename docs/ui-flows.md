

# 🔄 Yomulog — UI Interaction Flows

This document outlines the major user interaction flows within the Yomulog app. These flows help clarify navigation structure, state management, and user experience expectations.

---

## 🏠 Flow: Open App → Home Screen

1. User launches the app
2. App loads initial screen (`HomeScreen`)
3. Branding/logo and welcome message are displayed
4. Bottom navigation bar or tabs are available to switch screens
5. Optionally: Display a preview of recently updated manga

---

## 📚 Flow: Navigate to Liked List

1. User taps on the "Liked" tab or button
2. `LikedListScreen` loads
3. AsyncStorage is checked for liked manga data
4. If data exists, display `MangaCard` list
5. If no data, display an "empty state" message (e.g. "No manga liked yet")
6. User can filter/sort using `FilterBar`

---

## ❤️ Flow: Like a Manga from Search (Planned)

1. User navigates to Search screen
2. Types a keyword into `SearchBar`
3. Search function queries API or cached metadata
4. List of results displayed using `MangaCard`
5. User taps a heart icon or "Like" button
6. Manga ID and metadata are stored to AsyncStorage (or synced to Supabase later)
7. Confirmation appears (toast or animation)

---

## 📖 Flow: Open Reader from Liked List

1. User taps a manga card from the Liked List
2. App navigates to `ReaderScreen`
3. Chapter images are fetched from an API (or local storage)
4. Images are rendered in a scrollable view
5. Optionally: Previous/Next chapter buttons appear

---

## ⬇️ Flow: Download Chapter for Offline Reading (Future)

1. User taps "Download" icon on Reader screen
2. App fetches image files from API
3. Images are stored to local file system or AsyncStorage
4. User notified download is complete
5. App marks chapter as available offline

---

## ⚙️ Flow: Toggle Dark Mode (Future)

1. User opens Settings screen
2. Toggles "Dark Mode" switch
3. Theme context is updated
4. All screens/components re-render with dark theme styles
5. Theme preference is saved locally