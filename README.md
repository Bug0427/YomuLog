# Yomulog 📚

Yomulog is a cross-platform manga tracking and reading app built with React Native + Expo. It helps users organize their favorite manga, track updates, and read chapters across devices (iOS, Android, Web, Desktop).

## 🚀 Features

- Manga "Liked List" with filters
- Recently Updated Manga preview
- Offline reading & local caching
- AI-powered search and recommendations (planned)
- Reverse image search (planned)
- Fully responsive UI (mobile/tablet/web)

## 📂 Folder Structure
```bash
/yomulog
├── /assets                # Static files like icons, images, fonts
│   └── logo.png
│   └── fonts/
├── /components            # Reusable UI components (cards, buttons, etc.)
│   └── MangaCard.tsx
│   └── Filter.tsx
├── /screens               # Full screen views
│   └── HomeScreen.tsx
│   └── LikedListScreen.tsx
│   └── ReaderScreen.tsx
├── /services              # External API interaction, local storage, auth
│   └── mangaAPI.ts
│   └── localStorage.ts
├── /utils                 # Helpers, constants, formatting, search logic
│   └── helpers.ts
│   └── filters.ts
├── /navigation            # App stack/tab navigation setup
│   └── AppNavigator.tsx
├── /hooks                 # Custom React hooks
│   └── useMangaData.ts
├── App.tsx                # Main entry
├── app.json               # Expo config
├── tsconfig.json          # TypeScript config
├── package.json
```

## 🛠 Tech Stack

- React Native with Expo
- TypeScript
- React Navigation
- AsyncStorage (local data)
- Expo Web (cross-platform)
- (Planned: Supabase, OpenAI, MangaDex API)

## 📦 Setup Instructions

```bash
git clone https://github.com/Bug0427/YomuLog.git
cd yomulog-app
npm install
npx expo start
```

**Project Status**: 🧪 In Development / MVP Phase

## 🎯 Vision

Yomulog aims to be a sleek, offline-friendly manga tracker with intelligent recommendations and a customizable reading experience — all in one lightweight cross-platform app.