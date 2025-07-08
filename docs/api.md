

# 🔌 Yomulog — API Documentation

This document outlines the external APIs used or planned for integration in the Yomulog app.

---

## 📘 1. MangaDex API (Primary Source)

**Purpose:**  
Used to fetch manga metadata, cover images, chapters, and update information.

**Docs:**  
https://api.mangadex.org/docs

**Usage Plan:**
- Search for manga by title
- Fetch cover art and tags
- Retrieve chapter lists and image URLs
- Check for recent updates to liked manga

**Notes:**
- MangaDex API is free and open but has rate limits.
- Requires handling paginated data and language filtering (e.g. English only).

---

## 🔐 2. Supabase (Optional Sync Backend)

**Purpose:**  
Used for cloud sync of liked manga, downloaded chapters, and user preferences.

**Docs:**  
https://supabase.com/docs

**Usage Plan:**
- Store user liked manga and reading progress
- Sync downloaded chapter metadata
- Enable user login/account features

**Notes:**
- Supabase can replace local-only `AsyncStorage` for multi-device support.
- Requires setup of a Supabase project and API key.

---

## 🧠 3. OpenAI API (Future Feature)

**Purpose:**  
Used to power AI-enhanced search and recommendations.

**Docs:**  
https://platform.openai.com/docs

**Usage Plan:**
- Search by vague/natural language queries
- Generate related manga recommendations
- Power reverse image search queries (via vision model, future)

**Notes:**
- Requires API key and cost is based on usage.
- Should be opt-in if used in production app.

---

## 🔍 4. Image Search Service (Reverse Image Lookup – Future)

**Purpose:**  
Allows user to upload manga cover or panel to identify the series.

**Options Being Considered:**
- SauceNAO
- Trace.moe
- Google Vision (custom wrapper)

**Usage Plan:**
- Accept image input
- Query external reverse search API
- Return possible title matches

**Notes:**
- Needs preprocessing of image (base64 or multipart upload)
- Most free APIs have usage caps or limited reliability