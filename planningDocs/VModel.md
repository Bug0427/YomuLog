## V‑Model Schedule

### 📅 Professional Development Schedule – YomuLog (V‑Model Style)

| Week # | Target Date | Task | Goal | Actual Completion |
|--------|-------------|------|------|-------------------|
| Week 1 | 06/11/25–07/09/25 | Refactor planning docs | Ensure clean, well‑organized project vision before development |                   |
| Week 2 | 07/09/25–09/30/25 | UI component scaffolding (no logic) | Create layout‑only screens for all major views |                   |
| Week 3 | 09/30/25–10/21/25 | Implement detail view screens | Integrate data props for Detail screens (Manga Info, Chapter List, Reader View) |                   |
| Week 4 | 10/21/25–10/31/25 | Library screen + update preview UI | Build Library screen with placeholder data + collapsible Updated Manga section |                   |
| Week 5 | 10/31/25–11/10/25 | Like/Unlike logic + metadata caching | Store user preferences and reading history in SQLite |                   |
| Week 6 | 11/10/25–11/17/25 | Genre filter logic (Search & Home) | Add logic to highlight genres, toggle selection, and remove genres |                   |
| Week 7 | 11/17/25–12/01/25 | Download behavior + offline mode | Build download metadata system and offline UI testing |                   |
| Week 8 | 12/01/25–12/03/25 | Error handling + fallback logic | Display user‑friendly errors and source switching if fetch fails |                   |
| Week 9 | 12/03/25–12/10/25 | Final UI pass + animations + icon | Final polish, UI consistency, mascot animation, and splash/icon setup |                   |
| Week 10| 12/10/25–12/15/25 | Final testing & wrap‑up | Ensure everything works on mobile/tablet, update docs, and export final build |                   |

## 📆 V‑Model‑Based Development Schedule for YomuLog (Aug–Nov 2025)

This schedule follows a V‑Model approach tailored to a single developer building a professional‑grade app. Tasks are broken down into precise, manageable components with clear goals, and dependencies are respected to optimize sequencing and parallelization.

---
### PHASE 1: Documentation Finalization (📝 Planning Base)
| Target  | Done  | Task | Goal |
|-------------------|-----------------|------|------|
| 07/09/25 | 06/18/25 | Finalize `ScreenLayouts.pdf` & confirm flow | Ensure all screens are accounted for and clearly structured. |
| 07/16/25 | 06/25/25 | Polish `design‑notes.md` | Include layout info, color schemes, mascot UI behavior, and navigation logic. |
| 08/07/25 | 07/09/25 | Finalize planning docs | Align roadmap with app screens, diagrams, and app outlines. |

---
### PHASE 2: Component Design (🎨 UI Building Blocks)
| Target  | Done  | Task | Goal |
|-------------------|-----------------|------|------|
| 09/15/25 | 07/31/25 | Create universal font/text components | Standardize type styles (heading, body, small) across all screens. |
| 09/20/25 |  | Create color theme and base theme logic | Define light/dark support, accent colors (latte brown, lavender). |
| 09/25/25 |  | Build reusable UI atoms (buttons, toggles, tags, etc.) | Build core building blocks that can be used across all components. |
| 09/28/25 |  | Create base layout templates (Header, ScrollView, etc.) | Set up responsive containers used for screens. |
| 09/30/25 |  | Test responsiveness across iPhone/Android screen sizes | Adjust padding, font scale, spacing as needed. |

---
### PHASE 3: Visual Screen Construction (🧩 Screen UIs Only)
| Target  | Done  | Task | Goal |
|-------------------|-----------------|------|------|
| 10/10/25 | 07/31/25 | Home Screen (Preview rows + Genre rows + Nav bar) | Match screen layout spec with real data placeholders. |
| 10/15/25 |  | Manga Info Screen | Layout with metadata display, related titles, action buttons. |
| 10/18/25 |  | Reader Screen (basic layout) | Test dynamic page loading, left‑right scroll or vertical. |
| 10/21/25 | 07/31/25 | Search Screen | Layout search bar, genre filters, results list. |
| 10/24/25 |  | Downloads Screen | Static layout showing downloaded files, storage info, error test. |
| 10/27/25 |  | Library Screen (Liked list + Updated list preview) | Implement preview toggle and expand interactions. |
| 10/29/25 |  | Settings Screen | Include reading format toggle, sync toggle, feedback. |
| 10/31/25 |  | Error + Empty States | Create fallback UIs for no data, broken links, bad search, etc. |

---
### PHASE 4: Core Feature Integration (⚙️ Functional Hookup)
| Target  | Done  | Task | Goal |
|-------------------|-----------------|------|------|
| 11/03/25 |  | Build dummy manga cache & API interface | Simulate content fetch from remote sources. |
| 11/05/25 |  | Like/unlike + progress tracking logic | Tie to local DB, store metadata flags, timestamp logic. |
| 11/07/25 |  | Download chapter system + error banner | Test download logic, offline storage, banner toggle. |
| 11/09/25 |  | Update detection for liked list manga | Trigger preview row and full list with timestamp check. |
| 11/11/25 |  | Reading format selector logic | Hook up Settings option to reader display format. |
| 11/13/25 |  | Genre filter + dynamic search | Enable multi‑tag logic and optional tag deletion/selection. |
| 11/15/25 |  | Source fallback if manga becomes unavailable | Trigger retry/alternate source logic and notification banner. |
| 11/17/25 |  | Feedback screen + Error reporting logic | Route to external link or feedback form with device data. |

---
### PHASE 5: Sync Logic + AI Feature Prototypes (🧠 Optional High‑Level)
| Target  | Done  | Task | Goal |
|-------------------|-----------------|------|------|
| 11/20/25 |  | Sync data across devices (Firebase/Supabase) | Like/progress storage with timestamp conflict resolution. |
| 11/22/25 |  | AI‑powered Search fallback | Try fuzzy title search with similarity check + local result mapping. |
| 11/24/25 |  | AI Recommendations prototype | Link based on genre, tags, and prior reading behavior. |
| 11/26/25 |  | Reverse image search placeholder screen | Include upload and identify screen as stub (future logic). |

---
### PHASE 6: Testing + Platform Consistency (📱 UX Debugging)
| Target  | Done  | Task | Goal |
|-------------------|-----------------|------|------|
| 12/03/25 |  | Manual testing across iPhone/Android/iPad | Check UI scaling, font cutoff, scroll lag. |
| 12/06/25 |  | Feature‑by‑feature bug test and log | Focus on download errors, syncing bugs, and format issues. |
| 12/08/25 |  | Backup: Adjust padding & animation delays | Polish smoothness and touch response across key screens. |

---
### PHASE 7: Finalization & Portfolio Prep (📁 Polish + Docs)
| Target  | Done  | Task | Goal |
|-------------------|-----------------|------|------|
| 12/10/25 |  | Polish all UI components + loading animation | Final detail pass with mascot animation, transitions. |
| 12/12/25 |  | Clean up all files + comments | Remove dead code, console.logs, rename debug variables. |
| 12/13/25 |  | Generate final documentation (README, GIFs, features) | Professional landing for GitHub, resumes, or publication. |
| 12/14/25 |  | Add application icon + preview graphics | Store sample screenshots, splash, icon. |
| 12/15/25 |  | Export build (Expo or native) | Final app archive for upload, testing, distribution. |

---
### ⚠️ Buffer & Flex Weeks
| Dates | Goal |
|-------|------|
| 11/16/25–12/05/25 | Overflow time, bug fixes, missed tasks, polish. |
| 12/06/25–12/10/25 | Final resume/testing/finalization checkup window. |

✅ *Final deadline for all uploads and documentation: 11/10/25–11/12/25*

---