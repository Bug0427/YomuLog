# 📦 CHANGELOG

All notable changes to **Yomulog** will be documented here. This file follows [Keep a Changelog](https://keepachangelog.com/) principles and uses [Semantic Versioning](https://semver.org/).

---

## [0.1.0] — 2025-07-09
### Added
- Initial project structure
- Full documentation suite (`README.md`, `ui-flows.md`, etc.)
- Expo project initialized with TypeScript
- `data-model.md` with sample types

---

## [Unreleased]
### Planned
- Implement `mangaAPI.ts` to fetch & map MangaDex data
- Build HomeScreen UI and Liked List flow
- Add error boundaries and loading states
- Add RefreshCard component for HomeScreen recommendation refresh
- Create RecentlyReadScreen to display reading history (up to 30 titles)
- Add UnavailableMangaScreen to manage unhosted or removed manga
- Implement DownloadedChaptersScreen for accessing chapters after manga card is tapped in Downloads
- Update UI-flows, screens.md, and features.md with finalized navigation logic and fallback rules
- Sync user actions across devices using timestamp conflict resolution
- Add dismissable error banners for failed downloads and storage issues
- Define metadata logic for read/unread status, like/unlike classification, and progress tracking