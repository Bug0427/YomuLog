# 🧩 Yomulog — Data Model

This file documents the core TypeScript models used across the app, including object structure, field descriptions, and example shapes. These are the source of truth for state management, API responses, and internal logic.

---

## 📘 Manga Object

```ts
export type Manga = {
  id: string;
  title: string;
  altTitles?: string[];
  author?: string;
  artist?: string;
  genres?: string[];
  status?: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  coverImageUrl: string;
  description?: string;
  isLiked: boolean;
  lastReadChapter?: string;
  lastOpenedChapter?: string;   // NEW - the actual last opened chapter (used for 'continue')
  readPercent?: number;         // NEW - percent of chapters read
  isDownloaded?: boolean;       // NEW - if *any* chapter is downloaded
  downloadStatus?: 'complete' | 'partial' | 'error';  // NEW - error tracking
  classification?: 'liked' | 'unliked' | null;        // NEW - post-read classification
  sourceAvailability?: 'available' | 'unavailable' | 'cancelled'; // NEW
  alternateSources?: string[];  // NEW - alternate host URLs
  updatedAt?: string;
};
```

### Sample

```ts
const exampleManga: Manga = {
  id: '123abc',
  title: 'My Manga Title',
  altTitles: ['私のマンガ', 'Mi Manga'],
  author: 'Jane Doe',
  artist: 'John Smith',
  genres: ['Action', 'Fantasy'],
  status: 'ongoing',
  coverImageUrl: 'https://example.com/cover.jpg',
  description: 'A story about...',
  isLiked: true,
  lastReadChapter: '12',
  updatedAt: '2025-07-01T00:00:00Z',
};
```

---

## 💾 Liked List (Local Storage)

```ts
export type LikedMangaList = Manga[];
```

* Stored via AsyncStorage
* Only relevant fields are saved (id, title, coverImageUrl, isLiked, lastReadChapter)

---

## 📖 Chapter Object (From API)

```ts
export type Chapter = {
  id: string;
  mangaId: string;
  chapter: string;
  title?: string;
  pages: string[];
  updatedAt?: string;
  isDownloaded?: boolean;               // NEW
  downloadError?: boolean;              // NEW
  readStatus?: 'read' | 'unread';       // NEW
};
```

// NEW - Used to track download errors and display banner warnings
export type DownloadError = {
  mangaId: string;
  chapterId: string;
  timestamp: number;
  errorMessage?: string;
};

// NEW - Cross-device sync and conflict resolution
export type UserSyncAction = {
  mangaId: string;
  action: 'like' | 'unlike' | 'read' | 'download';
  timestamp: number;
};

---

## 👤 UserData (Local Settings)

```ts
export type UserData = {
  readingMode: 'vertical' | 'horizontal' | 'paged';
  theme: 'light' | 'dark';
  preferredLanguages: string[]; // e.g. ['en', 'ja']
};
```

Stored locally and used to configure reading experience.

---

## 🔍 Search Cache Entry

```ts
export type CachedSearchResult = {
  query: string;
  results: Manga[];
  timestamp: number;
};
```

---

## 🌐 External API Response Shapes (Simplified)

These are transformed into internal Manga/Chapter shapes:

```ts
// From MangaDex
interface MangaDexResponse {
  data: Array<{
    id: string;
    attributes: {
      title: { en?: string; [key: string]: string };
      description?: { en?: string; [key: string]: string };
      status?: string;
    };
    relationships: Array<{
      type: 'author' | 'artist' | 'cover_art';
      attributes?: { name: string; fileName?: string };
    }>;
  }>;
}
```

All API responses are converted to your internal types via a mapper function in `services/mangaAPI.ts`.

---

// Future Types (Planned):
// - RecentlyReadEntry
// - UnavailableMangaEntry
// - RefreshCardMeta
