// screens/legal/TermsOfServiceScreen.tsx
// Static Terms of Service — plain, honest copy covering what the app does,
// Premium billing via Stripe, MangaDex content sourcing, and acceptable use.

import React from 'react';
import LegalDoc from '../../components/legal/LegalDoc';

export default function TermsOfServiceScreen() {
  return (
    <LegalDoc
      title="Terms of Service"
      updatedLabel="Last updated: August 11, 2026"
      intro={[
        'These Terms govern your use of the YomuLog app on iOS, Android, and web. By downloading or using YomuLog, you agree to these Terms. If you do not agree, please do not use the app.',
      ]}
      sections={[
        {
          heading: 'What YomuLog is',
          paragraphs: [
            'YomuLog is a manga tracking and reading app. Manga titles, covers, and chapters are sourced from MangaDex through its public API. YomuLog does not host or publish manga itself.',
          ],
        },
        {
          heading: 'Accounts',
          paragraphs: [
            'You can use YomuLog without an account; all data stays on your device. Creating an account is optional and enables Cloud Sync (a Premium feature).',
            'If you create an account, you are responsible for keeping your login credentials secure and for everything that happens with your account.',
          ],
        },
        {
          heading: 'Content and copyright',
          paragraphs: [
            'Manga content shown in the app remains the property of its authors and publishers. YomuLog does not grant you any rights to that content.',
            'Chapters you download are for personal, offline reading on your own device. Please respect copyright and support creators — do not redistribute downloaded content.',
          ],
        },
        {
          heading: 'Premium subscription',
          paragraphs: [
            'Premium is a recurring subscription billed at $2.99/month or $24.99/year, processed securely by Stripe. The subscription renews automatically until cancelled.',
            'You can cancel at any time from the Manage Subscription screen in the app. After cancelling, Premium features continue to work until the end of the paid period, then revert to the free tier.',
            'Refunds for partial billing periods are not offered, except where required by law.',
          ],
        },
        {
          heading: 'Acceptable use',
          paragraphs: [
            'You agree not to misuse the app: do not attempt to break, overload, or reverse-engineer it; do not scrape content at scale; and do not use YomuLog to distribute manga in violation of copyright.',
          ],
        },
        {
          heading: 'Availability and changes',
          paragraphs: [
            'The app is provided “as is” and “as available.” We may add, change, or remove features — including the split between free and Premium features — and may discontinue the service. We make reasonable efforts to keep the app running but do not guarantee uninterrupted availability.',
          ],
        },
        {
          heading: 'Liability',
          paragraphs: [
            'To the maximum extent permitted by law, YomuLog and its team are not liable for indirect, incidental, or consequential damages arising from your use of the app.',
            'Manga content and metadata come from third parties (MangaDex), so we cannot guarantee its accuracy or availability.',
          ],
        },
        {
          heading: 'Changes to these Terms',
          paragraphs: [
            'We may update these Terms from time to time. Continued use of the app after changes are posted means you accept the updated Terms. Significant changes will be noted in the app.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            'Questions about these Terms or your data? Reach us through the in-app Feedback option in Settings.',
          ],
        },
      ]}
    />
  );
}
