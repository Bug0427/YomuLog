#!/usr/bin/env node
// Wrap root JSX elements with SafeAreaView for all screens missing safe area handling.
// Usage: node scripts/wrap-safearea.js

const fs = require('fs');
const path = require('path');

const FILES = [
  'screens/main/SplashScreen.tsx',
  'screens/main/HomeScreen.tsx',
  'screens/main/SearchScreen.tsx',
  'screens/main/LibraryScreen.tsx',
  'screens/main/DownLoadsScreen.tsx',
  'screens/main/SettingsScreen.tsx',
  'screens/main/ReaderScreen.tsx',
  'screens/main/RecentlyReadScreen.tsx',
  'screens/main/RecentlyUpdated.tsx',
  'screens/onboarding/OnboardingFlow.tsx',
  'screens/onboarding/WelcomeScreen.tsx',
  'screens/onboarding/FeaturesScreen.tsx',
  'screens/onboarding/PremiumUpsellScreen.tsx',
  'screens/feedback/FeedBackHome.tsx',
  'screens/feedback/FileReport.tsx',
  'screens/feedback/LeaveRating.tsx',
  'screens/feedback/LeaveReview.tsx',
  'screens/account/UserAccount.tsx',
  'screens/admin/AdminScreen.tsx',
  'screens/account/ChooseProfileIcon.tsx',
];

// Find the root JSX element in the return statement
// Looks for the first JSX element after "return (" or "return <"
function findRootElement(lines, startIdx) {
  let depth = 0;
  let started = false;
  let elementStart = -1;
  let elementEnd = -1;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!started) {
      // Look for first JSX element: <View, <ScrollView, <KeyboardAvoidingView, <TouchableWithoutFeedback, etc.
      if (/^\s*<(View|ScrollView|KeyboardAvoidingView|TouchableWithoutFeedback|FlatList|Pressable|ImageBackground)\b/.test(line)) {
        started = true;
        elementStart = i;
        // Count opening/closing tags on this line
        const opens = (line.match(/<[A-Z]\w*/g) || []).length;
        const closes = (line.match(/<\/[A-Z]\w*>/g) || []).length;
        const selfCloses = (line.match(/\/>/g) || []).length;
        depth = opens - closes - selfCloses;
        if (depth <= 0) {
          elementEnd = i;
          return { start: elementStart, end: elementEnd };
        }
      }
      continue;
    }

    // Count tags in this line
    const opens = (line.match(/<[A-Z]\w*/g) || []).length;
    const closes = (line.match(/<\/[A-Z]\w*>/g) || []).length;
    const selfCloses = (line.match(/\/>/g) || []).length;
    depth += opens - closes - selfCloses;

    if (depth <= 0) {
      elementEnd = i;
      return { start: elementStart, end: elementEnd };
    }
  }
  return null;
}

function wrapFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Find the first return statement with JSX: "return (" or "return <"
  let returnLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*return\s*[\(<]/.test(lines[i])) {
      returnLineIdx = i;
      break;
    }
  }

  if (returnLineIdx === -1) {
    console.log(`WARN: no return statement found in ${filePath}`);
    return false;
  }

  const root = findRootElement(lines, returnLineIdx);
  if (!root) {
    console.log(`WARN: no root element found in ${filePath}`);
    return false;
  }

  const rootLine = lines[root.start];
  const indent = rootLine.match(/^(\s*)/)[1];

  // Determine if the file uses "theme" or "colors" for bg
  const usesTheme = content.includes('theme.bg') || content.includes('{ theme }');
  const bgRef = usesTheme ? 'theme.bg' : 'colors.lavender';

  // For screens that already import useTheme, use that
  // For onboarding screens, they don't use useTheme — use colors.lavender
  // Check if the file imports useTheme
  const importsUseTheme = content.includes('useTheme');

  // For screens without useTheme, we use a simpler SafeAreaView wrapper
  let safeViewOpen, safeViewClose;

  if (importsUseTheme) {
    safeViewOpen = `${indent}<SafeAreaView style={[{ flex: 1 }, { backgroundColor: theme.bg }]}>`;
  } else {
    safeViewOpen = `${indent}<SafeAreaView style={{ flex: 1, backgroundColor: colors.lavender }}>`;
  }
  safeViewClose = `${indent}</SafeAreaView>`;

  // Insert opening tag before root element
  lines.splice(root.start, 0, safeViewOpen);

  // Insert closing tag after root element (lines shifted by 1 due to insert)
  lines.splice(root.end + 2, 0, safeViewClose);

  // Fix indentation on child lines
  // All lines between root.start+1 and root.end+1 (after insertions) need +2 indent
  const newRootStart = root.start + 1;
  const newRootEnd = root.end + 1; // closing </SafeAreaView> is at root.end + 2

  for (let i = root.start + 2; i <= root.end + 1; i++) {
    if (lines[i].trim() !== '') {
      lines[i] = '  ' + lines[i];
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  console.log(`WRAPPED: ${filePath}`);
  return true;
}

let count = 0;
for (const f of FILES) {
  if (wrapFile(f)) count++;
}
console.log(`\nWrapped ${count}/${FILES.length} files.`);
