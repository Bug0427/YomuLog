


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

## 🔄 App Flow Summary

- App opens to `HomeScreen` with branding + nav
- User can navigate to Liked List → See saved manga
- Tapping a manga opens the Reader screen
- Manga updates are tracked and displayed in preview (planned)
- Manga can be searched or added to favorites
- (Planned) Offline download and cross-device sync available

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

---

## 🧑‍💻 Maintainer

Created and maintained by [@Bug0427](https://github.com/Bug0427)