// components/downloads/formatBytes.ts
// Compact byte formatting (extracted from ManageDownloadsScreen — H-6 decomposition).

export function formatBytesCompact(bytes: number): string {
  if (bytes === 0) return '0 MB';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}