# 🖼 Yomulog — Screens & UI Planning

This document outlines the key screens in the Yomulog app, including layout structure, core features, and planned component usage. Screens are grouped by function for easier readability and navigation during development.

---

## 🧭 Screen Categories Overview

### 🏠 Core Navigation Screens

#### Home Screen
**Purpose:**  
The landing screen of the app. Provides branding, a welcome message, and navigation access to other sections of the app.

**Components Used:**
```
- `HeaderNav` with tabs for Home, Search, Library, Downloads, Settings
- `FloatingLoginButton` or `ProfileQuickLink` (safe corner, opens login screen or user profile)
- `GenreScrollAnchor` (left-side scrollable header links: Action, Romance, Comedy, Slice of Life, Sci-Fi, Reincarnation, Fantasy)
- `HorizontalScrollList` for each manga section (New Manga, Popular Picks, Recommended, Updated)
- `ScrollArrows` for vertical navigation (top/bottom jump)
```

**Planned Additions:**
```
- Horizontal scrollable rows for manga: New Manga, Popular Picks, Recommended, Updated
- Genre quick-scroll anchor bar
- Scroll-to-top and scroll-to-bottom buttons
- Floating login/profile quick-access button in upper corner
```

#### Search Screen
**Purpose:**  
Allow user to search for manga titles or browse recommendations.

**Components Used:**
```
- `SearchBar` with live typing suggestions
- `GenreScrollFilterBar` (pressable genre chips with scroll)
- `MangaCardGrid` (displaying results or default/popular manga)
- `SortFilterModal` (e.g., sort by rating, top, etc.)
- `ViewToggleButton` (toggles between grid and row-style view)
- `ScrollArrows` for vertical jump (top/bottom)
- `BlocksToggle` (grid layout style)
- `FilterDropdownModal` (triggered by filter icon)
- `SortOrderSelector` (list of sort options: chapter count, popularity, etc.)
```

**Features:**
```
- Live search with dynamic suggestion generation
- Genre-based filtering via scrollable filter bar
- Popular manga shown by default
- Filter modal for sort order (Top ↑, Top ↓, Tap ↑↓)
- Results grid wraps content and is scrollable
- Toggle to switch between grid and row-style display
- Tap on manga opens Manga Info Screen
- AI-assisted smart search functionality (e.g., natural language queries, typo tolerance, fuzzy match)
- Open filter dropdown with tags, type, and status categories
- Sort order dropdown includes: ascending/descending chapter count, popularity, recent updates/additions
```


#### Library Screen
**Purpose:**  
Displays the user’s saved and liked manga. Also includes a quick view of recent updates from their followed titles.

**Components Used:**
```
- `FloatingNavBar` with tabs: Home, Search, Library, Downloads, Settings
- `SearchBar` with optional filter button
- `UpdatedPreviewRow` (horizontal scrollable preview of recently updated manga)
- `ViewAllUpdatesButton` (takes user to full recent updates screen)
- `LibraryGrid` or `LibraryBarMode` (toggle between block/card view and list mode)
- `ScrollArrows` for quick top/bottom navigation
- `ViewToggleButton` for switching display mode
- `BlocksToggle` for layout variation
- `FilterDropdownModal`
- `SortOrderSelector`
```

**Features:**
```
- View updated manga at top with pressable “More” button
- "View More" button opens full Recently Updated Manga screen
- Full library displayed underneath, scrollable vertically
- View mode toggles between block/card grid or list style
- Block-to-bar mode switch for visual preference
- Top/bottom jump arrows for quicker navigation
- Independent filter/sort control per screen
```

#### Downloads Screen
**Purpose:**  
Displays manga that the user has downloaded for offline reading.

**Components Used:**
```
- `FloatingNavBar` with tabs: Home, Search, Library, Downloads, Settings
- `SearchBar` with optional filter button
- `DownloadsGrid` or `DownloadsBarMode` (toggle between block/card view and list mode)
- `ViewToggleButton` for switching display mode
- `BlocksToggle` for layout variation
- `ScrollArrows` for quick top/bottom navigation
- `FilterDropdownModal`
- `SortOrderSelector`
```

**Features:**
```
- View list of downloaded manga stored locally
- View mode toggles between grid or list layout
- Block-to-bar mode switch for visual preference
- Filter by text via search bar
- Scroll-to-top and scroll-to-bottom buttons
- Independent filter/sort control per screen
```

---

### 📖 Reading Flow Screens

#### Liked List Screen
**Purpose:**  
Shows manga titles the user has liked. Acts as the user's personalized manga library.

**Components Used:**  
- `MangaCard` (each manga preview)  
- `FilterBar` (to sort or filter by tag/genre/status)

**Features:**  
- Display list of liked manga  
- Filters for unread, status, genre  
- Tap on a card to go to Reader screen

#### Manga Info Screen
**Purpose:**  
Display detailed metadata, description, chapters, and similar manga recommendations for a selected title.

**Components Used:**
```
- `FloatingNavBar` with tabs: Home, Search, Library, Downloads, Settings
- `BackButton` (top left corner)
- `LikeToggleButton` (top right corner)
- `MangaDetailCard` (image, title, author/artist, status, rating, average views, Report button)
- `TagScrollRow` (dynamic tag chips with horizontal scroll)
- `AltTitleBar` (alternative titles including print name, or “None” if unavailable)
- `ExpandableDescriptionBox` (scrollable horizontal/vertical)
- `ChapterActionButtons` (Read First, Read Last, Continue)
- `ChapterList` (scrollable, with expandable chapter rows and sort toggle)
- `SimilarTitlesScrollRow` (carousel of 5–10 similar titles, scrollable horizontally)
```

**Features:**
```
- Tap manga card anywhere in app to access this page
- Dynamically populated tags with side-scroll behavior
- Alternative titles section adjusts if none exist
- Scrollable description field (vertically expandable)
- Quick-access reading buttons: Read First, Read Last, Continue from latest
- Chapters listed in expandable format with scroll and sort order button
- Bottom section shows scrollable row of similar manga (max 5–10 entries)
```

#### Reader Screen
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

#### Recent Updates Screen
**Purpose:**  
Shows a full list of recently updated manga from the user’s liked list.

**Components Used:**
```
- `BackButton` (returns to previous screen)
- `ClearAllButton` (clears the full list)
- `MangaCardGrid`
- `BlocksToggle` and `ViewToggleButton` (grid or list mode)
- `ScrollArrows` for quick navigation
```

**Features:**
```
- Max 50 manga entries stored
- Auto-remove entries after 1 week
- Long press or tap-hold manga to remove individual items
- View toggle between list and grid mode
- Scroll-to-top and scroll-to-bottom buttons
```

---

### 🛠 Utility & Support Screens

#### Settings / About
**Purpose:**  
Allow user to manage preferences and application behavior.

**Components Used:**
```
- `FloatingNavBar` with tabs: Home, Search, Library, Downloads, Settings
- `ProfileTopBox` (user info, login shortcut)
- `ThemeToggle`
- `ScrollDirectionToggle` (horizontal ↔ vertical)
- `LanguageSelector` (EN, JP, KR)
- `ChapterDividerToggle`
- `MetadataRefreshButton`
- `ClearCacheButton`
- `ManageDownloadsButton`
- `AIRecommendationReset`
- `AISearchToggle`
- `ChangeCredentialsButton`
- `LogoutButton`
- `ScrollArrows`
- `LegalInfoSection`
```

**Features:**
```
- Toggle light/dark theme
- Choose scroll direction (L→R or vertical)
- Language selection (EN/JP/KR)
- Toggle chapter dividers ON/OFF
- Refresh manga metadata manually
- Clear cached app data
- Manage downloaded manga (opens Manage Downloads screen)
- Reset AI-powered recommendation system
- Enable or disable AI-powered search
- Change password or username
- Log out of account
- View legal disclaimers and app version
- Scroll-to-top and scroll-to-bottom buttons
```

#### Profile Screen
**Purpose:**  
Allows users to update account details and choose a profile picture.

**Components Used:**
```
- `BackButton`
- `ProfilePictureSelector` (selectable avatar/icon grid trigger)
- `InputFields`: Username, Password, Email
- `UpdateButtons` for each field
- `DeleteAccountButton`
```

**Features:**
- Update username, password, email individually
- Tap profile picture to open icon selector
- Delete account button

#### Profile Icon Selector
**Purpose:**  
Allows user to pick an avatar icon from a preset grid.

**Components Used:**
```
- `IconGrid` (preset avatar images)
- `BackButton`
- `SaveButton`
```

**Features:**
- Select profile image from grid
- Save to profile or cancel

#### Feedback Screen
**Purpose:**  
Allows users to submit feedback, reviews, and report app issues.

**Components Used:**
```
- `BackButton`
- `FeedbackOptionButtons` (Report a Problem, Leave a Review, Leave a Rating)
- `TextInputBox` (for reviews and custom issues)
- `RatingHeartsBar` (5-heart rating system)
- `ScrollArrows`
```

**Features:**
```
- Three core paths: report a problem, leave a review, rate the app
- Review form includes character limit and submit
- Rating form includes 5-heart selection
- Scrollable interface with jump buttons
```

#### Manage Downloads Screen
**Purpose:**  
Allows users to view and delete downloaded manga in either block or bar mode.

**Components Used:**
- `BackButton`
- `EditButton` (toggles between Edit and Done)
- `ViewToggleButton` (block/grid vs list/strip layout)
- `DownloadMangaGrid` (4x4 boxes)
- `DownloadListView` (manga name + chapter row)
- `SelectCheckbox` (appears during edit mode)
- `ClearButton`
- `ScrollArrows`
- `GoToBottomButton`

**Features:**
- Toggle between grid and list mode for viewing
- Edit mode allows selecting and clearing downloads
- Bottom-scroll navigation
- Linked from Settings
  

#### Report Screen
**Purpose:**  
Interface for structured issue reporting.

**Features:**
```
- Report category options:
  • Viewing or reading
  • Manga info
  • General
  • Account
  • Other/unlisted
- Subcategories per section (e.g., wrong title, missing page, duplicate entry, reading progress lost, etc.)
- Final “Describe the issue” screen with text field and character limit
- Back navigation preserved through all screens
```

---

### 🔐 Auth & Access Screens

#### Splash Screen
**Purpose:**  
Initial loading screen featuring an animated teddy bear and app branding.

**Description:**  
A teddy bear is sitting in a comfy setting reading a book while sipping coffee. Suddenly, something shocking happens, and the bear spits coffee onto the screen. This moment transitions the scene into a coffee brown drip effect, which fades into the Home Screen.

**Features (Planned):**
- Animated splash sequence with visual storytelling
- Transition effect mimics coffee dripping
- Automatically redirects to Home Screen after splash animation
- Session check (if user is logged in or not)

#### Login Screen
**Components Used:**
- `LogoTitle`
- `LoginCard` (includes input for username/email and password)
- `SubmitButton`
- `CreateAccountLink`
- `ExitButton`

**Features:**
- Input fields for login credentials
- Submit login
- Link to Create Account screen
- Exit app button

#### Create Account Screen
**Components Used:**
- `LogoTitle`
- `CreateAccountCard` (inputs: username, password, email)
- `SubmitButton`
- `LoginLink`
- `ExitButton`

**Features:**
- Input fields for new user info
- Submit account creation
- Link back to login
- Exit app button

---

### 🧩 Shared Filter & Sort Components

**FilterDropdownModal:**  
A scrollable, floating dropdown with selectable chips for Tags, Type (manga/manhwa/etc.), and Status (ongoing, completed, etc.). Includes Clear and Apply buttons.

**SortOrderSelector:**  
A simple dropdown modal with radio options for sort order:
- Ascending chapter count
- Descending chapter count
- Most popular
- Recently updated
- Recently added
- Oldest added

### RefreshNoteComponent:
A visual refresh animation using a sliding arrow image. Activated by pulling/sliding upward on scrollable screens. Intended to subtly signal refresh behavior without interrupting user flow.

- Appears on vertical scroll-enabled screens like:
  • Home
  • Search
  • Library
  • Downloads
  • Recent Updates

- Optional animated loading effect can be included while refreshing content.

# 
# Modals, tools, and edge-case screens (like share screen or AI reset) are not included here and may be added to a separate section or to `components.md`.

#### Confirmation Screen
**Purpose:**  
Appears when users attempt a critical action like delete account, clear cache, or reset recommendations.

**Components Used:**
- `ConfirmationTextBox`
- `ConfirmButton`
- `ExitButton`

**Features:**
- Asks for confirmation before executing major actions
- Linked from: Delete Account, Clear Cache, Reset Recommendations
- Accessible via Settings or Profile screen actions
