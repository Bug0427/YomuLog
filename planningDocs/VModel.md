## V-Model Schedule

### 📅 Professional Development Schedule – YomuLog (V-Model Style)

| Week # | Target Date | Task | Goal | Actual Completion |
|--------|-------------|------|------|-------------------|
| Week 1 | Sep 9–15    | Refactor planning docs | Ensure clean, well-organized project vision before development |                   |
| Week 2 | Sep 16–22   | UI component scaffolding (no logic) | Create layout-only screens for all major views |                   |
| Week 3 | Sep 23–29   | Implement detail view screens | Integrate data props for Detail screens (Manga Info, Chapter List, Reader View) |                   |
| Week 4 | Sep 30–Oct 6 | Library screen + update preview UI | Build Library screen with placeholder data + collapsible Updated Manga section |                   |
| Week 5 | Oct 7–13    | Like/Unlike logic + metadata caching | Store user preferences and reading history in SQLite |                   |
| Week 6 | Oct 14–20   | Genre filter logic (Search & Home) | Add logic to highlight genres, toggle selection, and remove genres |                   |
| Week 7 | Oct 21–27   | Download behavior + offline mode | Build download metadata system and offline UI testing |                   |
| Week 8 | Oct 28–Nov 3 | Error handling + fallback logic | Display user-friendly errors and source switching if fetch fails |                   |
| Week 9 | Nov 4–10    | Final UI pass + animations + icon | Final polish, UI consistency, mascot animation, and splash/icon setup |                   |
| Week 10| Nov 11–15   | Final testing & wrap-up | Ensure everything works on mobile/tablet, update docs, and export final build |                   |

## 📆 V-Model-Based Development Schedule for YomuLog (Aug–Nov 2025)

This schedule follows a V-Model approach tailored to a single developer building a professional-grade app. Tasks are broken down into precise, manageable components with clear goals, and dependencies are respected to optimize sequencing and parallelization.

---
### PHASE 1: Documentation Finalization (📝 Planning Base)
| Target | Done | Task | Goal |
|--------|------|------|------|
| Aug 5  |      | Finalize `ScreenLayouts.pdf` & confirm flow | Ensure all screens are accounted for and clearly structured. |
| Aug 6  |      | Polish `design-notes.md` | Include layout info, color schemes, mascot UI behavior, and navigation logic. |
| Aug 7  |      | Finalize `Planning docs | Align roadmap with app screens, diagrams, and app outlines. |

---
### PHASE 2: Component Design (🎨 UI Building Blocks)
| Target | Done | Task | Goal |
|--------|------|------|------|
| Aug 8–9 |      | Create universal font/text components | Standardize type styles (heading, body, small) across all screens. |
| Aug 10–11 |      | Create color theme and base theme logic | Define light/dark support, accent colors (latte brown, lavender). |
| Aug 12–13 |      | Build reusable UI atoms (buttons, toggles, tags, etc.) | Build core building blocks that can be used across all components. |
| Aug 14–16 |      | Create base layout templates (Header, ScrollView, etc.) | Set up responsive containers used for screens. |
| Aug 17–18 |      | Test responsiveness across iPhone/Android screen sizes | Adjust padding, font scale, spacing as needed. |

---
### PHASE 3: Visual Screen Construction (🧩 Screen UIs Only)
| Target | Done | Task | Goal |
|--------|------|------|------|
| Aug 19–21 |      | Home Screen (Preview rows + Genre rows + Nav bar) | Match screen layout spec with real data placeholders. |
| Aug 22–24 |      | Manga Info Screen | Layout with metadata display, related titles, action buttons. |
| Aug 25–27 |      | Reader Screen (basic layout) | Test dynamic page loading, left-right scroll or vertical. |
| Aug 28–30 |      | Search Screen | Layout search bar, genre filters, results list. |
| Aug 31–Sep 1 |      | Downloads Screen | Static layout showing downloaded files, storage info, error test. |
| Sep 2–3 |      | Library Screen (Liked list + Updated list preview) | Implement preview toggle and expand interactions. |
| Sep 4 |      | Settings Screen | Include reading format toggle, sync toggle, feedback. |
| Sep 5 |      | Error + Empty States | Create fallback UIs for no data, broken links, bad search, etc. |

---
### PHASE 4: Core Feature Integration (⚙️ Functional Hookup)
| Target | Done | Task | Goal |
|--------|------|------|------|
| Sep 6–7 |      | Build dummy manga cache & API interface | Simulate content fetch from remote sources. |
| Sep 8–9 |      | Like/unlike + progress tracking logic | Tie to local DB, store metadata flags, timestamp logic. |
| Sep 10–11 |      | Download chapter system + error banner | Test download logic, offline storage, banner toggle. |
| Sep 12–13 |      | Update detection for liked list manga | Trigger preview row and full list with timestamp check. |
| Sep 14–15 |      | Reading format selector logic | Hook up Settings option to reader display format. |
| Sep 16–17 |      | Genre filter + dynamic search | Enable multi-tag logic and optional tag deletion/selection. |
| Sep 18 |      | Source fallback if manga becomes unavailable | Trigger retry/alternate source logic and notification banner. |
| Sep 19–20 |      | Feedback screen + Error reporting logic | Route to external link or feedback form with device data. |

---
### PHASE 5: Sync Logic + AI Feature Prototypes (🧠 Optional High-Level)
| Target | Done | Task | Goal |
|--------|------|------|------|
| Sep 21–22 |      | Sync data across devices (Firebase/Supabase) | Like/progress storage with timestamp conflict resolution. |
| Sep 23–25 |      | AI-powered Search fallback | Try fuzzy title search with similarity check + local result mapping. |
| Sep 26 |      | AI Recommendations prototype | Link based on genre, tags, and prior reading behavior. |
| Sep 27 |      | Reverse image search placeholder screen | Include upload and identify screen as stub (future logic). |

---
### PHASE 6: Testing + Platform Consistency (📱 UX Debugging)
| Target | Done | Task | Goal |
|--------|------|------|------|
| Sep 28–30 |      | Manual testing across iPhone/Android/iPad | Check UI scaling, font cutoff, scroll lag. |
| Oct 1–3 |      | Feature-by-feature bug test and log | Focus on download errors, syncing bugs, and format issues. |
| Oct 4–5 |      | Backup: Adjust padding & animation delays | Polish smoothness and touch response across key screens. |

---
### PHASE 7: Finalization & Portfolio Prep (📁 Polish + Docs)
| Target | Done | Task | Goal |
|--------|------|------|------|
| Oct 6–9 |      | Polish all UI components + loading animation | Final detail pass with mascot animation, transitions. |
| Oct 10–12 |      | Clean up all files + comments | Remove dead code, console.logs, rename debug variables. |
| Oct 13 |      | Generate final documentation (README, GIFs, features) | Professional landing for GitHub, resumes, or publication. |
| Oct 14 |      | Add application icon + preview graphics | Store sample screenshots, splash, icon. |
| Oct 15 |      | Export build (Expo or native) | Final app archive for upload, testing, distribution. |

---
### ⚠️ Buffer & Flex Weeks
| Dates | Goal |
|-------|------|
| Oct 16–Nov 5 | Overflow time, bug fixes, missed tasks, polish. |
| Nov 6–10 | Final resume/testing/finalization checkup window. |

✅ *Final deadline for all uploads and documentation: November 10–12, 2025*

---
