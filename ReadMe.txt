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