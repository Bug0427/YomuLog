// screens/legal/PrivacyPolicyScreen.tsx
// Static Privacy Policy — plain, honest copy that only claims what the app
// actually does (local-first storage, optional Supabase cloud sync, Stripe
// hosted checkout, MangaDex content source, in-app account deletion).

import React from 'react';
import LegalDoc from '../../components/legal/LegalDoc';

export default function PrivacyPolicyScreen() {
  return (
    <LegalDoc
      title="Privacy Policy"
      updatedLabel="Last updated: August 11, 2026"
      intro={[
        'This policy explains what YomuLog collects, where that data lives, and how it is used. It applies to the YomuLog app on iOS, Android, and web.',
        'YomuLog does not show ads and does not sell personal data. Your information is used only to make the app work: tracking your reading, syncing your data when you choose, and powering recommendations.',
      ]}
      sections={[
        {
          heading: 'What we collect and store',
          paragraphs: [
            'Account information: if you create an account, we store your username, email address, and password (the password is handled by our authentication provider, Supabase Auth — the app never stores it in plain text).',
            'Reading activity: the chapters you open, your reading progress, recently-read history, your library/favorites, and reading statistics such as streaks and completion rates.',
            'Preferences: your theme, reader direction, language, chapter alerts, and AI search settings.',
            'Downloads: chapters you download for offline reading are stored as files on your device.',
          ],
        },
        {
          heading: 'Where your data lives',
          paragraphs: [
            'By default, everything is stored locally on your device. Your reading progress, library, and preferences live in local storage on the device you use, and nothing is sent to our servers unless you turn it on.',
            'If you create an account and enable Cloud Sync (a Premium feature), your library, reading progress, download queue, and preferences are synced to our cloud database (Supabase) so you can restore them on another device. Cloud Sync only ever runs when you enable it.',
          ],
        },
        {
          heading: 'Payments',
          paragraphs: [
            'Premium subscriptions are paid through Stripe using Stripe’s hosted checkout (buy.stripe.com). When you subscribe, you are redirected to Stripe’s payment page.',
            'YomuLog never sees or stores your card details. Payment information is collected and processed by Stripe under Stripe’s own privacy policy.',
          ],
        },
        {
          heading: 'Subscription management',
          paragraphs: [
            'You can review, change, or cancel your subscription at any time from the Manage Subscription screen in the app, which uses Stripe’s customer portal.',
            'If you cancel, your Premium access continues until the end of the current billing period and then expires.',
          ],
        },
        {
          heading: 'Third-party content (MangaDex)',
          paragraphs: [
            'Manga titles, covers, and chapters are provided by MangaDex through its public API. YomuLog does not host manga content; pages and covers are loaded from MangaDex’s servers when you browse or read online.',
            'Content usage is subject to MangaDex’s own terms and policies, which we do not control.',
          ],
        },
        {
          heading: 'Your rights',
          paragraphs: [
            'You can delete your account at any time from Account → Delete account. This removes your local account data from the device.',
            'You can also request that we remove the data we hold about you by contacting us through the in-app Feedback option in Settings, and we will act on your request.',
            'You can clear locally stored app data (cache) from Settings at any time. Downloaded chapters are only removed when you delete them from the Downloads screen.',
          ],
        },
      ]}
    />
  );
}
