# ✨ Yomulog Features

This document outlines the functional features of the Yomulog app, categorized into development phases.

---

## ✅ Minimum Viable Product (MVP)

| Feature                    | Description                                                       | Status |
|---------------------------|-------------------------------------------------------------------|--------|
| Home Screen               | Welcome message, branding, navigation tabs                        | ✅     |
| Navigation Setup          | Bottom tab navigation using React Navigation                     | ✅     |
| Liked List Screen         | Displays liked manga with filters                                 | ✅     |
| `MangaCard` Component     | Reusable component to show cover, title, author                   | ✅     |
| Local Storage             | Save liked manga to AsyncStorage                                 | ✅     |
| TypeScript Integration    | Enforces typed structure across app                              | ✅     |
| Cross-Platform Layout     | Works on iOS, Android, Web                                       | ✅     |
| App Structure / Folders   | Modular file system (components, screens, services, etc.)         | ✅     |

---

## 🔜 Near-Term Features

| Feature                        | Description                                                        | Priority |
|-------------------------------|--------------------------------------------------------------------|----------|
| Recently Updated Manga Preview| Show collapsible preview of updated titles from liked list; links to full updated list view.| High     |
| FilterBar Component           | Filter liked manga by genre/status                                 | High     |
| Search Screen                 | Search through cached or live metadata                             | High     |
| AI Search Enhancer            | Use OpenAI or similar for natural-language manga search             | Medium   |
| MangaDex Integration          | Fetch real manga data and metadata                                 | High     |
| Reader Screen                 | Scrollable manga viewer from API-sourced content                   | High     |
| Recently Read Manga Tab        | Track and show up to 30 most recently read manga               | High     |
| Unavailable Manga Screen       | View manga titles temporarily or permanently unavailable        | High     |
| Downloaded Chapters Screen     | View/download individual chapters from within a downloaded manga| High     |
| RefreshCard Component          | Refresh recommendation carousel on Home Screen                 | Medium   |

---

## 🔮 Long-Term / Stretch Goals

| Feature                          | Description                                                   | Vision |
|----------------------------------|---------------------------------------------------------------|--------|
| Offline Chapter Download         | Save chapters to local device for offline reading             | 📦     |
| Reverse Image Manga Search       | Upload cover/panel image to detect title                      | 🧠     |
| User Profiles & Cloud Sync       | Cross-device data sync using Supabase                        | 🌐     |
| Reading Format Toggle            | User can switch between L→R, R→L, vertical scroll             | 📖     |
| Desktop Version via Electron     | Wrap web app as desktop client                               | 🖥️     |
| Dark Mode                        | User-selectable light/dark themes                            | 🌗     |
| Dynamic Source Switching       | Auto-switch manga source if primary is unavailable             | 🧠     |
| Intelligent Download Recovery  | Redownload failed chapters; display banner + error icons       | 📦     |
| Smart Metadata Classification  | Record like/unlike/null + completion stats for suggestion logic| 🧠     |
| Account-Based Sync Resolution  | Use timestamps to resolve multi-device sync conflicts          | 🌐     |
| Chapter Error UI Banner        | Show dismissable error if downloaded file is corrupted         | 📦     |
| Hold-to-Select UI Enhancements | Enable hold-to-delete, hold-to-unlike, hold-for-options        | 📱     |
| Dynamic Genre Filter Tags         | Suggest top 10 genres based on user behavior; press once to filter, press again to unselect, long-press to activate "remove mode" with an X icon; filters appear in filter menu; Done button exits remove mode | 🧠     |