# 🎨 Yomulog — Design Notes

This document outlines the visual and interaction design strategies used in Yomulog to ensure consistent, responsive, and intuitive user experience across platforms.

---

## 🧱 Layout Philosophy

- **Component-driven** design: Small, reusable components (e.g. MangaCard, FilterBar)
- **Vertical scroll** as primary interaction flow
- **Mobile-first** layout that scales gracefully to tablets and desktop (via Expo Web)
- Use of Flexbox and `Dimensions` API for screen size responsiveness

---

## 📐 Responsiveness Strategy

- Uses `flex`-based layouts for dynamic scaling
- Target breakpoints: phone (<600px), tablet (600–1024px), desktop (>1024px)
- Avoids fixed widths or heights unless necessary
- Conditional rendering/styling for large screens (e.g. multi-column layout on tablet)

---

## 🌈 Color & Theme

- **Base Theme:**
  - Background: `#ffffff`
  - Text: `#111111`
  - Accent: `#C63D2F` (red highlight for buttons or likes)
  - Secondary: `#F2F2F2` (for cards, containers)
- **Dark Theme (Planned):**
  - Background: `#1C1C1E`
  - Text: `#F5F5F5`
  - Accent remains unchanged
- Uses `nativewind` for consistent utility-first styling (optional but recommended)
- Theme switch (Light/Dark) is available in both the main Settings screen and the Reader View settings tab.

---

## 🔠 Typography

- Primary font: System default (San Francisco, Roboto, Segoe UI)
- Font sizes:
  - Headings: `24–32sp`
  - Body: `14–16sp`
  - Captions/Labels: `12–13sp`
- Text is wrapped with `Text` component and supports scaling on accessibility devices

---

## ♿ Accessibility Considerations

- Minimum contrast ratio ensured for text against background
- Button and tap targets ≥ 44x44px
- All interactive elements use `accessibilityLabel` and `accessible` props
- Planned future: VoiceOver and TalkBack screen reader testing
- Users can enable simplified navigation and disable scroll-triggered actions via a custom Reader Mode toggle in Settings (planned).

---

## 🧩 Component Behavior

- `MangaCard` navigates to `MangaInfoScreen` when tapped.
- `DownloadIcon` indicates download status:
  - Normal: ready for download
  - Progress: partial ring fill
  - Completed: full icon
  - Error: red error icon with optional dismissable banner (appears if one or more files are corrupted).
- `RefreshCard` is displayed at the end of the recommendations slider in Home; allows manual refresh of suggestions.
- `ContinueButton` on manga cards displays the most recently accessed chapter (e.g. "Continue ch. 5").

---

## 🔁 Navigation Patterns

- Top navbar includes: Home, Library, Search.
- `Back` buttons return to the previous screen when history exists; otherwise, default to Home.
- MangaInfoScreen is accessible from Home, Search, Library, Downloads, and Recently Updated.
- Tapping the manga title from Reader View navigates to MangaInfoScreen.
- DownloadedChaptersScreen opens when a manga card is tapped from Downloads.
- Reader View can be exited with the back icon; does not route through Manga Info unless explicitly triggered.

---

## 📂 Metadata & Syncing Details

- Likes are tracked with three possible values:
  - `null`: read but never liked
  - `liked`: actively in library or was completed with high engagement
  - `unliked`: user removed or rejected title after partial reading
- Downloads are tracked separately from likes. Downloaded status remains unless deleted.
- Manga with 50–89% chapter completion before being unliked is flagged as `unliked`. Manga with 90%+ is considered `liked` even after removal.
- Timestamp precedence resolves sync conflicts across devices.
- Continue buttons reflect last opened chapter per manga, not highest chapter read.
- Chapter read state is visually reflected via tab color.
- Press-and-hold (3–5 sec) on a chapter may be used to mark it as "unread".
- When one source becomes unavailable, an alternate is used. If all sources fail, the manga is flagged "temporarily unavailable" and a new screen is planned for canceled entries. Progress is preserved.

---

## 🧪 Experimental or Planned Features

- RecentlyReadScreen (collapsible UI for reading history, up to 30 titles).
- UnavailableMangaScreen for previously accessible manga that are now unhosted.
- Dynamic source-switching and developer alerts for manga availability issues.
- Option to toggle scroll-to-next-chapter in Reader View.
- Reader View settings tab includes: Theme toggle, Download Chapter, Like/Unlike toggle.
- Filter/sort icons in Library allow sorting by update date, genre, and unread chapters.
- Recommendation refresh via RefreshCard at end of Home tab slider.
- Multi-select edit modes for mass deletion in DownloadedChaptersScreen and Library.
- Storage limitation banner appears if device has insufficient space for downloads.
---

## 📦 Image Usage

- Images optimized and resized before being displayed
- Use of `Image` component with `resizeMode="contain"` or `cover`
- All images use `alt` text (`accessibilityLabel`) where possible
- Manga chapter pages are lazy-loaded for smoother reading, and download errors are visually flagged with error icons and dismissable banners.

---

## 🎯 UX Goals

- Seamless experience across devices
- Smooth loading of image-heavy content (manga panels)
- Minimal taps to reach key actions (e.g. Like, Read, Search)
- Clarity over clutter — strong visual hierarchy, readable UI
- Cross-device reading progress and metadata syncing based on timestamp precedence.
- All actions are recorded even for unliked manga (marked as `null`, `liked`, or `unliked` based on completion threshold and user feedback).
- Reader mode includes dynamic scroll-to-next-chapter with backup buttons, and user control to enable/disable this feature.