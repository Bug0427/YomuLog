# 🔌 Yomulog — API Documentation

This document outlines the external APIs used or planned for integration in the Yomulog app.

## 📑 Table of Contents
1. [MangaDex API](#1-mangadex-api-primary-source)
2. [Supabase](#2-supabase-optional-sync-backend)
3. [OpenAI API](#3-openai-api-future-feature)
4. [Image Search Service](#4-image-search-service-reverse-image-lookup--future)

---

## 📘 1. MangaDex API (Primary Source)

**Status:** ✅ Implemented

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

**Fallback Plan:**  
If MangaDex fails to return results, YomuLog should attempt to fetch data from alternate sources (planned feature). Users will see an error banner if no metadata is available, and affected titles may be moved to an "Unavailable Manga" list.

---

## 🔐 2. Supabase (Optional Sync Backend)

**Status:** 🔄 In Progress

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

**Authentication:**  
Uses Supabase Auth or custom JWT for syncing. Anonymous guest mode supported if login is skipped.

---

## 🧠 3. OpenAI API (Future Feature)

**Status:** 💤 Planned

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

**Status:** 💤 Planned

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

**User Flow Status:** 🔮 Future Quest (AI Discovery Tier)  
Reverse image search will be optional, likely powered by either OpenAI Vision or external APIs like SauceNAO. Identified titles can optionally be saved to the user’s search history.