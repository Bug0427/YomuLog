// /data/feedback/categories.ts
export type CategoryId = "reading" | "mangaInfo" | "general" | "account" | "other";

export const categories = [
{ id: "reading",   title: "Viewing or reading" },
{ id: "mangaInfo", title: "Manga info" },
{ id: "general",   title: "General" },
{ id: "account",   title: "Account" },
{ id: "other",     title: "Other or unlisted" },
] as const;

export const issuesByCategory: Record<CategoryId, string[]> = {
reading: [
    "Broken or missing pages",
    "Pages out of order",
    "Incorrect number of chapters",
    "Chapter won't load",
    "Wrong translation or language",
    "Mismatched content",
],
mangaInfo: [
    "Wrong title or author",
    "Incorrect cover image",
    "Incorrect genre or tags",
    "Wrong status",
    "Description is wrong",
    "Duplicate manga entry",
    "Alternate titles missing/incorrect",
    "Translation info missing/incorrect",
],
general: [
    "Crashing or freezing",
    "App is slow / lagging",
    "Search not working",
    "Broken link or image",
    "UI/Display error (e.g., button overlap)",
    "Downloads not working",
    "Notifications not showing",
    "Navigation issues",
],
account: [
    "Library disappeared",
    "Reading progress not saved",
    "Downloaded manga missing",
    "Synced data not loading",
],
other: ["Other / unlisted"],
};