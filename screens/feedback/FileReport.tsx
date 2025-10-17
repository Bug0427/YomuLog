import React, { useState } from 'react';
import { View, Pressable, Text, KeyboardAvoidingView, ScrollView, TouchableWithoutFeedback, Keyboard, Platform, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FBHeader from '../../components/layout/FBHeader';
import { categories, issuesByCategory, type CategoryId } from '../../data/feedbackCategories';
import { FeedbackStyles } from '../../styles/global';
import SubmitButton from '../../components/layout/SubmitButton';
import { insertReport, initDb } from '../../services/feedbackRepo';

export default function FileReport() {
  React.useEffect(() => {
    // Ensure DB schema (including reports.SID) is initialized once
    initDb().catch(err => console.warn('initDb failed (ignored on UI):', err));
  }, []);
  const navigation = useNavigation<any>();

  // Category dropdown
  const [catOpen, setCatOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<{ id: CategoryId; title: string } | null>(null);

  // Issue(sub-option) dropdown
  const [issueOpen, setIssueOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  const isFreeTextSub = React.useMemo(() => {
    if (!selectedCat) return false;
    const t = (selectedCat.title || '').toLowerCase();
    const i = String(selectedCat.id || '').toLowerCase();
    return t.includes('other') || t.includes('unlisted') || i.includes('other') || i.includes('unlisted');
  }, [selectedCat]);

  // User text input
  const [commentText, setCommentText] = useState('');
  const MAX_CHARS = 360;
  const remaining = Math.max(0, MAX_CHARS - commentText.length);

  // Sub-category free text input max length
  const SUB_CAT_MAX_CHARS = 50;

  // Temporary submit handler (screen-level). Replace with feedbackRepo insert later.
  const handleSubmit = async () => {
    if (!selectedCat) return;
    const subject = (selectedIssue ?? '').trim();
    const cleanComment = commentText.trim();
    // For free-text categories, user must type a subject; for normal ones, selectedIssue must exist
    if ((isFreeTextSub && !subject) || (!isFreeTextSub && !selectedIssue) || !cleanComment) return;

    // Get accountId directly from globalThis.currentAccountId (same as securityLevel)
    const accountId = (globalThis as any).currentAccountId;

    console.log('🔍 FileReport resolved accountId:', accountId);

    const payload = {
      accountId: accountId,
      mainCat: selectedCat.id,
      subCat: subject ? subject : (selectedIssue ?? ''),
      comments: cleanComment.slice(0, 360),
    };

    console.log('Submitting report payload:', payload);

    try {
      await insertReport(payload);
      (globalThis as any).__feedbackFlash = { message: 'Report submitted successfully!', at: Date.now(), ms: 3000 };
      navigation.goBack();
      return;
    } catch (e) {
      const msg = String((e as any)?.message || e);
      if (/no column named sid/i.test(msg)) {
        console.warn('🔧 Missing SID column detected. Running initDb() and retrying…');
        await initDb();
        await insertReport(payload);
        (globalThis as any).__feedbackFlash = { message: 'Report submitted successfully!', at: Date.now(), ms: 3000 };
        navigation.goBack();
        return;
      } else {
        console.error('❌ Failed to save report', e);
      }
    }
  };

  const onSelectCategory = (id: CategoryId, title: string) => {
    const next = { id, title } as const;
    setSelectedCat(next);
    setCatOpen(false);
    setSelectedIssue(null);
    // If Other/Unlisted, do not open dropdown; otherwise open it
    const t = (title || '').toLowerCase();
    const i = String(id || '').toLowerCase();
    const isFree = t.includes('other') || t.includes('unlisted') || i.includes('other') || i.includes('unlisted');
    setIssueOpen(!isFree);
  };

  const onSelectIssue = (issue: string) => {
    setSelectedIssue(issue);
    setIssueOpen(false);
  };

  const currentIssues = selectedCat ? issuesByCategory[selectedCat.id] : [];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: FeedbackStyles.screen.backgroundColor }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={FeedbackStyles.screen}>
          <FBHeader title="Report a problem" onBack={() => navigation.goBack()} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View style={FeedbackStyles.body}>
              {/* Category dropdown trigger */}
              <Pressable
                accessibilityRole="button"
                style={[FeedbackStyles.item]}
                onPress={() => setCatOpen((v) => !v)}
              >
                <Text style={FeedbackStyles.itemText}>
                  {selectedCat ? selectedCat.title : 'Select a category'}
                </Text>
                <Text style={FeedbackStyles.caret}>{catOpen ? '▲' : '▼'}</Text>
              </Pressable>

              {/* Category dropdown list */}
              {catOpen && (
                <View style={FeedbackStyles.dropdown}>
                  {categories.map((c, idx) => (
                    <View key={`${c.id}_${idx}`}>
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [FeedbackStyles.option, pressed && FeedbackStyles.optionPressed]}
                        onPress={() => onSelectCategory(c.id as CategoryId, c.title)}
                      >
                        <Text style={FeedbackStyles.itemText}>{c.title}</Text>
                      </Pressable>
                      {idx < categories.length - 1 && <View style={FeedbackStyles.divider} />}
                    </View>
                  ))}
                </View>
              )}

              {/* Issue(sub-option) dropdown trigger or text input for "Other"/"Unlisted" – shown AFTER a category is picked */}
              {selectedCat && (
                isFreeTextSub ? (
                  <TextInput
                    style={[FeedbackStyles.item, { color: '#2c1f42', minHeight: 40, paddingVertical: 10 }]}
                    placeholder="Please specify"
                    placeholderTextColor="#6b5a8e"
                    value={selectedIssue ?? ''}
                    onChangeText={setSelectedIssue}
                    maxLength={SUB_CAT_MAX_CHARS}
                  />
                ) : (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      style={[FeedbackStyles.item]}
                      onPress={() => setIssueOpen((v) => !v)}
                    >
                      <Text style={FeedbackStyles.itemText}>
                        {selectedIssue ? selectedIssue : 'Select a sub option'}
                      </Text>
                      <Text style={FeedbackStyles.caret}>{issueOpen ? '▲' : '▼'}</Text>
                    </Pressable>

                    {issueOpen && (
                      <View style={FeedbackStyles.dropdown}>
                        {currentIssues.map((issue, idx) => (
                          <View key={`${issue}_${idx}`}>
                            <Pressable
                              accessibilityRole="button"
                              style={({ pressed }) => [FeedbackStyles.option, pressed && FeedbackStyles.optionPressed]}
                              onPress={() => onSelectIssue(issue)}
                            >
                              <Text style={FeedbackStyles.itemText}>{issue}</Text>
                            </Pressable>
                            {idx < currentIssues.length - 1 && <View style={FeedbackStyles.divider} />}
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )
              )}

              {/* Helper text */}
              <Text style={FeedbackStyles.helper}>
                {selectedCat
                  ? selectedIssue
                    ? ''
                    : 'Now pick a sub option.'
                  : 'Pick a category to continue.'}
              </Text>

              {/* Text input + submit (only after both selections) */}
              {(selectedCat && (isFreeTextSub || selectedIssue)) && (
                <View style={{ marginTop: 12, gap: 12 }}>
                  <View
                    style={{
                      borderWidth: 2,
                      borderColor: '#543C27',
                      padding: 12,
                      backgroundColor:'#E3D3BD',
                    }}
                  >
                    <TextInput
                      style={{
                        minHeight: 165,
                        textAlignVertical: 'top',
                        color: '#2c1f42',
                      }}
                      multiline
                      placeholder="Describe the problem…"
                      placeholderTextColor="#6b5a8e"
                      value={commentText}
                      onChangeText={setCommentText}
                      maxLength={MAX_CHARS}
                      onSubmitEditing={handleSubmit}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                    <Text style={{ color: '#2c1f42', fontWeight: '600' }}>
                      {remaining} characters left
                    </Text>
                  </View>

                  <SubmitButton
                    title="Submit"
                    onPress={handleSubmit}
                    disabled={commentText.trim().length < 5}
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