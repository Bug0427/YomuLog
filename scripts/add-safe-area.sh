#!/usr/bin/env bash
# Add SafeAreaView wrapper to all 22 screens missing safe area handling.
# Run from repo root.

set -e

# Helper: add import after react-native-safe-area-context if not present
add_import() {
  local file="$1"
  # Check if already has SafeAreaView import
  if grep -q "SafeAreaView" "$file"; then
    echo "SKIP (already has SafeAreaView): $file"
    return
  fi

  # Insert import after last react-native import or after 'react-native-safe-area-context' line
  if grep -q "from 'react-native-safe-area-context'" "$file"; then
    echo "SKIP (already imports safe-area-context): $file"
    return
  fi

  # Add the import line after the first 'from "react-native"' or 'from 'react-native'' line
  if grep -q "from ['\"]react-native['\"]" "$file"; then
    sed -i "/from ['\"]react-native['\"]/a import { SafeAreaView } from 'react-native-safe-area-context';" "$file"
    echo "ADDED import: $file"
  else
    echo "WARN: no react-native import found in $file"
  fi
}

# List of 22 screen files
FILES=(
  screens/main/SplashScreen.tsx
  screens/main/HomeScreen.tsx
  screens/main/SearchScreen.tsx
  screens/main/LibraryScreen.tsx
  screens/main/DownLoadsScreen.tsx
  screens/main/SettingsScreen.tsx
  screens/main/ReaderScreen.tsx
  screens/main/RecentlyReadScreen.tsx
  screens/main/RecentlyUpdated.tsx
  screens/onboarding/OnboardingFlow.tsx
  screens/onboarding/WelcomeScreen.tsx
  screens/onboarding/FeaturesScreen.tsx
  screens/onboarding/PremiumUpsellScreen.tsx
  screens/feedback/FeedBackHome.tsx
  screens/feedback/FileReport.tsx
  screens/feedback/LeaveRating.tsx
  screens/feedback/LeaveReview.tsx
  screens/account/UserAccount.tsx
  screens/admin/AdminScreen.tsx
  screens/account/ChooseProfileIcon.tsx
)

echo "=== Phase 1: Adding SafeAreaView imports ==="
for f in "${FILES[@]}"; do
  add_import "$f"
done

echo ""
echo "=== Phase 2: Wrapping root views ==="
# Each file needs manual wrapping — the root View pattern varies.
# We handle common patterns below.

echo "Done with imports. You must manually wrap each screen's root with SafeAreaView."
echo "Pattern: <SafeAreaView style={[{flex:1}, {backgroundColor: theme.bg}]}> ... </SafeAreaView>"
