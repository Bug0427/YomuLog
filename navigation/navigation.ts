export type RootStackParamList = {
    HomeScreen: undefined;
    MangaInfoScreen: { mangaId: string } | undefined;
    SearchScreen: undefined;
    LibraryScreen: undefined;
    DownLoadsScreen: undefined;
    ReaderScreen: { chapterId: string; mangaId: string; chapterNum: string } | undefined;
    SettingsScreen: undefined;
    ReadingStatsScreen: undefined;
    FeedBackHome: { username?: string; securityLevel?: number } | undefined;
    FileReport: undefined;
    LoginScreen: undefined;
    RecentlyReadScreen: undefined;
};