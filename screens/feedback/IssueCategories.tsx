// “Report a problem” → category list
import React from 'react';
import { View, ScrollView, Pressable, Text} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FBHeader from '../../components/layout/FBHeader';
import { categories } from '../../data/feedbackCategories';
import { FeedBackStyles } from '../../styles/global';


export default function IssueCategories() {
  const navigation = useNavigation<any>();

  const goIssueList = (categoryId: string, title: string) => {
    console.log('➡️ IssueCategories → IssueList', categoryId);
    navigation.navigate('IssueList', { categoryId, title });
  };

  return (
    <View style={FeedBackStyles.screen}>
      <FBHeader title="Report a problem" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={FeedBackStyles.body} showsVerticalScrollIndicator={false}>
        {categories.map((c) => (
          <Pressable key={c.id} style={FeedBackStyles.item} onPress={() => goIssueList(c.id, c.title)}>
            <Text style={FeedBackStyles.itemText}>{c.title}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
