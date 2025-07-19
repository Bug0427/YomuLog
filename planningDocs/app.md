# 🧠 Yomulog — App Overview

Yomulog is a cross-platform manga tracker and reader designed for mobile, web, and tablet devices. It focuses on offline-first usability, real-time update tracking, and intelligent recommendations through AI-enhanced search.

---

## 🎯 Project Vision

To provide manga readers with a lightweight, customizable, and intelligent reading companion that works across all devices. Users can track manga they love, read updates, explore new titles, and access content offline—all while enjoying a sleek UI with AI support.

---

## 📐 Architecture Overview

### 📱 Frontend
- Built with **React Native** using **Expo**
- Platform targets: iOS, Android, Web, Tablet
- Written in **TypeScript**
- Uses:
  - `React Navigation` for screen management
  - `AsyncStorage` for local persistence
  - Component-based modular UI

### ☁️ Backend (Planned)
- **Supabase** for user accounts and cloud sync
- **MangaDex API** as data source
- **OpenAI API** for enhanced search and recommendations

### 🔐 Security
- Cloud sync uses Supabase with built-in auth and role-based access control
- Metadata and user actions are timestamped and resolved via latest-wins conflict strategy
- Downloads are stored locally; no manga is hosted on our own servers

---

## 📂 Folder Structure (Summary)

```
/components       → Reusable UI blocks (e.g. MangaCard, FilterBar)
/screens          → Major screens like Home, Liked List, Reader
/services         → Logic for API calls, local storage
/hooks            → Custom React hooks for shared logic
/utils            → Helpers for filtering, formatting, and more
/navigation       → Navigation configuration (tabs, stacks)
/assets           → Images, fonts, splash screens
```

---

## 🌍 Localization Support
- App supports multilingual UI (English, Japanese, Korean planned)
- Furigana overlay support under consideration for Japanese manga
- Language preference stored per device and synced across devices

---

## 🔄 App Flow Summary

- App opens to `SplashScreen` and transitions to `HomeScreen`
- From `HomeScreen`, user can:
  - Navigate to `LibraryScreen` (Liked Manga)
  - Navigate to `RecentlyUpdatedScreen` or `RecentlyReadScreen`
  - Search manga via `SearchScreen`
- Tapping a MangaCard (from Home, Search, Library, Downloads, Recently Updated) opens `MangaInfoScreen`
- From `MangaInfoScreen`, user can:
  - View chapters and tap to open in `ReaderView`
  - Like/unlike the manga
  - Download entire manga or navigate to DownloadedChaptersScreen
- ReaderView supports:
  - Scroll reading with auto-next chapter loading
  - Like/unlike and download current chapter
  - Custom settings (theme, direction, language)
  - Access to MangaInfo via title tap
  - Tab colors indicate chapter read status
  - Press-and-hold on chapter tab allows 'mark as unread'
  - Download errors display banner with recovery instructions
  - RecentlyReadScreen behaves like RecentlyUpdatedScreen and tracks up to 30 manga
  - Recommendation slider includes refreshable end-card
- Downloads can be accessed via `DownloadsScreen` which shows downloaded manga
  - Tapping a manga here opens `DownloadedChaptersScreen`
- App syncs across devices and stores progress locally
- Conflicts are resolved via timestamps

---

## 🧪 Testing & QA
- Manual testing across iOS, Android, and Web using Expo Go
- Planned unit tests for critical components (ReaderView, DownloadManager, Library sorting)
- Edge cases: chapter load fails, storage full, sync conflicts

## 📤 Deployment Plan
- Initial release: iOS (App Store) via Expo
- Later releases: Android (Google Play), PWA for web readers
- Modular backend means features like cloud sync and AI can be toggled at build time

---

## 🧩 Dependencies

- `react-native`, `expo`
- `@react-navigation/*`
- `@react-native-async-storage/async-storage`
- `nativewind` (optional for utility-first styling)
- `axios` or `fetch` for API calls

---

## 📌 Dev Notes
 
- Expo is used for cross-platform simplicity
- Layouts are designed with responsiveness in mind
- Initial focus is offline-capable with clean UX
- AI and backend sync features are modular and can be toggled
- App behavior includes smart metadata tracking and dynamic source switching for unavailable manga.
- Future features include:
  - RecentlyReadScreen with collapsible layout
  - AI-generated music background for reading
  - Related title expansion via metadata matching
  - Reverse image search for manga panel recognition

---

## 🗂️ Planned Screens (New)
- RecentlyReadScreen
- DownloadedChaptersScreen
- UnavailableMangaScreen
- RefreshCard (component, not screen)

These are being tracked in `screens.md` and updated in `ui-flows.md`.
