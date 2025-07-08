

# 🖼 Yomulog — Screens & UI Planning

This document outlines the key screens in the Yomulog app, including layout structure, core features, and planned component usage. The order reflects typical app build priorities and user flow.

---

## 1. Home Screen

**Purpose:**  
The landing screen of the app. Provides branding, a welcome message, and navigation access to other sections of the app.

**Components Used:**  
- `Header` (future)
- Navigation buttons or tab bar (via React Navigation)
- Branding (logo, title text)

**Planned Additions:**  
- Recently updated manga preview
- Quick access to liked list

---

## 2. Liked List Screen

**Purpose:**  
Shows manga titles the user has liked. Acts as the user's personalized manga library.

**Components Used:**  
- `MangaCard` (each manga preview)
- `FilterBar` (to sort or filter by tag/genre/status)

**Features:**  
- Display list of liked manga
- Filters for unread, status, genre
- Tap on a card to go to Reader screen

---

## 3. Reader Screen

**Purpose:**  
Display a scrollable chapter or manga panel images, allowing full reading within the app.

**Components Used:**  
- `ImageScroller` (planned)
- `ChapterNavigation` (optional future feature)

**Features:**  
- Load chapter images from external API
- Swipe/scroll to read full chapter
- Basic chapter navigation (prev/next)

**Stretch Goals:**  
- Download button to save for offline reading
- Reading format toggle (vertical scroll, L→R)

---

## 4. Search / Add Manga (Planned)

**Purpose:**  
Allow user to search for manga titles or browse recommendations.

**Components Used:**  
- `SearchBar`
- `MangaCard`
- (Later) AI Search Enhancer

**Features:**  
- Search bar with fuzzy/autocomplete matching
- Option to "like" manga from results

---

## 5. Settings / About (Optional / Future)

**Purpose:**  
Allow user to manage preferences (dark mode, cached data, etc.)

**Features:**  
- Dark mode toggle
- Clear cache
- App info