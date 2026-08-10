import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GeneralStyles } from '../../styles/global';
import { colors } from '../../styles/tokens';
import useAdminTabs from '../../hooks/admin/useAdminTabs';
import AdminHeader from '../../components/adminView/AdminHeader';
import AdminReports from './AdminReports';
import AdminAccounts from './AdminAccounts';

export default function Admin({ navigation }: any) {
  const { activeTab, selectReports, selectAccounts, isReports, isAccounts } = useAdminTabs('reports');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.lavender }}>
    <View style={[GeneralStyles.section, { flex: 1 }]}>
        <AdminHeader
          navigation={navigation}
          activeTab={activeTab}
          selectReports={selectReports}
          selectAccounts={selectAccounts}
          isReports={isReports}
          isAccounts={isAccounts}
        />
        <View style={[{ flex: 1 }]}>
          {isReports && <AdminReports />}
          {isAccounts && <AdminAccounts />}
        </View>
      </View>
    </SafeAreaView>
  );
}
