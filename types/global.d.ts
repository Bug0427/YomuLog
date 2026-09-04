// types/global.d.ts
// Shared runtime globals used by the legacy local-auth store and dev toggles.
// Typing these once on `globalThis` removes the pervasive `(globalThis as any)`
// casts across AuthContext, SettingsScreen, UserAccount, feedback screens, etc.
// Values are written at runtime (login/logout/feedback flash) with no static
// initialization — hence the `| undefined` / `| null` unions.

/** Payload stored in `globalThis.__feedbackFlash` to show a success alert after
 *  navigating back from a feedback screen (LeaveRating / LeaveReview / FileReport). */
export interface FeedbackFlashPayload {
  message: string;
  at: number;
  ms: number;
}

declare global {
  var currentAccountId: string | undefined;
  var currentUsername: string | undefined;
  var currentPassword: string | undefined;
  var currentSecurityLevel: number | null;
  var currentProfileIconId: string | null;
  var forceLoggedOut: boolean;
  var authEpoch: number | undefined;
  var __feedbackFlash: FeedbackFlashPayload | null;
  var __activeUser: unknown;
  /** Dev-only runtime toggle (read by feedbackRepo reset logic). */
  var RESET_DB_ON_START: boolean | undefined;
}

export {};