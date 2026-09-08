// components/reader/types.ts
// Shared reader-mode type + labels (extracted from ReaderScreen — H-6 decomposition).
export type ReaderMode = 'vertical' | 'ltr' | 'rtl';

export const READER_MODE_LABELS: Record<ReaderMode, string> = {
  vertical: 'Scroll',
  ltr: 'L→R',
  rtl: 'R→L',
};