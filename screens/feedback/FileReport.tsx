import React, { useState } from 'react';
import { View, Pressable, Text, KeyboardAvoidingView, ScrollView, TouchableWithoutFeedback, Keyboard, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FBHeader from '../../components/layout/FBHeader';
import { categories, issuesByCategory, type CategoryId } from '../../data/feedbackCategories';
import { FeedBackStyles } from '../../styles/global';
import TextBox from '../../components/layout/TextBox';
import SubmitButton from '../../components/layout/SubmitButton';
import { insertReport } from '../../services/feedbackRepo';

type SessionUser = { ACCOUNTID: string; USERNM: string };

// Temporary stub – replace with your real session management
async function getSessionUser(): Promise<SessionUser> {
  return {
    ACCOUNTID: (globalThis as any).currentAccountId ?? 'DEV_ACCOUNT',
    USERNM: (globalThis as any).currentUsername ?? 'DEV_USERNAME',
  };
}

export default function FileReport() {
  const navigation = useNavigation<any>();

  // Category dropdown
  const [catOpen, setCatOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<{ id: CategoryId; title: string } | null>(null);

  // Issue(sub-option) dropdown
  const [issueOpen, setIssueOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  // User text input
  const [commentText, setCommentText] = useState('');

  // Temporary submit handler (screen-level). Replace with feedbackRepo insert later.
  const handleSubmit = async () => {
    if (!selectedCat || !selectedIssue) return;

    // Assume user is logged in and get canonical IDs from profile
    const { ACCOUNTID, USERNM } = await getSessionUser();

    const payload = {
      accountId: ACCOUNTID,
      userNm: USERNM,
      mainCat: selectedCat.id,
      subCat: selectedIssue,
      comments: commentText.trim().slice(0, 160),
    };

    try {
      const submissionId = await insertReport(payload);
      console.log('✅ Report saved with ID', submissionId);

      // Reset UI to fresh state
      setCommentText('');
      setSelectedIssue(null);
      setIssueOpen(false);
      setSelectedCat(null);
      setCatOpen(false);
    } catch (e) {
      console.error('❌ Failed to save report', e);
    }
  };

  const onSelectCategory = (id: CategoryId, title: string) => {
    setSelectedCat({ id, title });
    setCatOpen(false);
    setSelectedIssue(null);
    setIssueOpen(true); 
  };

  const onSelectIssue = (issue: string) => {
    setSelectedIssue(issue);
    setIssueOpen(false);
  };

  const currentIssues = selectedCat ? issuesByCategory[selectedCat.id] : [];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: FeedBackStyles.screen.backgroundColor }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={FeedBackStyles.screen}>
          <FBHeader title="Report a problem" onBack={() => navigation.goBack()} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View style={FeedBackStyles.body}>
              {/* Category dropdown trigger */}
              <Pressable
                accessibilityRole="button"
                style={[FeedBackStyles.item]}
                onPress={() => setCatOpen((v) => !v)}
              >
                <Text style={FeedBackStyles.itemText}>
                  {selectedCat ? selectedCat.title : 'Select a category'}
                </Text>
                <Text style={FeedBackStyles.caret}>{catOpen ? '▲' : '▼'}</Text>
              </Pressable>

              {/* Category dropdown list */}
              {catOpen && (
                <View style={FeedBackStyles.dropdown}>
                  {categories.map((c, idx) => (
                    <View key={c.id}>
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [FeedBackStyles.option, pressed && FeedBackStyles.optionPressed]}
                        onPress={() => onSelectCategory(c.id as CategoryId, c.title)}
                      >
                        <Text style={FeedBackStyles.itemText}>{c.title}</Text>
                      </Pressable>
                      {idx < categories.length - 1 && <View style={FeedBackStyles.divider} />}
                    </View>
                  ))}
                </View>
              )}

              {/* Issue(sub-option) dropdown trigger – shown AFTER a category is picked */}
              {selectedCat && (
                <>
                  <Pressable
                    accessibilityRole="button"
                    style={[FeedBackStyles.item]}
                    onPress={() => setIssueOpen((v) => !v)}
                  >
                    <Text style={FeedBackStyles.itemText}>
                      {selectedIssue ? selectedIssue : 'Select a sub option'}
                    </Text>
                    <Text style={FeedBackStyles.caret}>{issueOpen ? '▲' : '▼'}</Text>
                  </Pressable>

                  {/* Issue dropdown list */}
                  {issueOpen && (
                    <View style={FeedBackStyles.dropdown}>
                      {currentIssues.map((issue, idx) => (
                        <View key={issue}>
                          <Pressable
                            accessibilityRole="button"
                            style={({ pressed }) => [FeedBackStyles.option, pressed && FeedBackStyles.optionPressed]}
                            onPress={() => onSelectIssue(issue)}
                          >
                            <Text style={FeedBackStyles.itemText}>{issue}</Text>
                          </Pressable>
                          {idx < currentIssues.length - 1 && <View style={FeedBackStyles.divider} />}
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* Helper text */}
              <Text style={FeedBackStyles.helper}>
                {selectedCat
                  ? selectedIssue
                    ? 'You can add details below or submit.'
                    : 'Now pick a sub option.'
                  : 'Pick a category to continue.'}
              </Text>

              {/* Text input + submit (only after both selections) */}
              {selectedCat && selectedIssue && (
                <View style={{ marginTop: 12, gap: 12 }}>
                  <TextBox
                    label="Add details (max 160)"
                    maxLength={160}
                    placeholder="Describe the problem…"
                    onChangeText={setCommentText}
                    onSubmit={handleSubmit}
                  />

                  <SubmitButton
                    title="Submit"
                    onPress={handleSubmit}
                    disabled={!commentText.trim().length}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}