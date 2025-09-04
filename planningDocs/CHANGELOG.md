# 📦 CHANGELOG

All notable changes to **Yomulog** will be documented here. This file follows [Keep a Changelog](https://keepachangelog.com/) principles and uses [Semantic Versioning](https://semver.org/).

---

## [0.2.0] — 2025-09-04
### Added
- Outlined planning logic for future cross-device sync using timestamp-based conflict resolution (not yet implemented)
- Future planning doc for account-based manga import system
- Updated design-notes with experimental features section
- Reorganized files and planning docs for clarity
- Minor style improvements to UI components

## [0.1.1] — 2025-07-31
### Added
- Search screen styling and filter icon visuals
- Navigation bar updates and pathway additions
- General refactoring to reduce visual clutter
- Search bar functionality implemented

## [0.1.0] — 2025-07-30
### Added
- MangaSlider component and anchor buttons
- Top/bottom nav components and placeholder data
- NavBar border fixes and icon additions
- App title and visual structure for core screens

## [0.0.9] — 2025-07-21
### Added
- Profile icons and banner design
- Initial dependency installation and app init
- Created NavBar and layout structure

## [0.0.8] — 2025-07-20
### Added
- Loader frames and background assets
- Initial screen planning and ui-flow documentation
- Core planning updates to markdown files

## [0.0.7] — 2025-07-19
### Added
- Initial project documentation
- Base screen structure and planning folder creation

## [0.0.1] — 2025-07-09
### Added
- First commit
- Expo project initialized with folder structure

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