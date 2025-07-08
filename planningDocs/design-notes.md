

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

---

## 📦 Image Usage

- Images optimized and resized before being displayed
- Use of `Image` component with `resizeMode="contain"` or `cover`
- All images use `alt` text (`accessibilityLabel`) where possible

---

## 🎯 UX Goals

- Seamless experience across devices
- Smooth loading of image-heavy content (manga panels)
- Minimal taps to reach key actions (e.g. Like, Read, Search)
- Clarity over clutter — strong visual hierarchy, readable UI