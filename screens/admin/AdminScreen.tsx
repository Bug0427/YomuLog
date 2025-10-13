import React from 'react';
import { View } from 'react-native';
import { GeneralStyles } from '../../styles/global';
import useAdminTabs from '../../hooks/admin/useAdminTabs';
import AdminHeader from '../../components/adminView/AdminHeader';
import AdminReports from './AdminReports';
import AdminAccounts from './AdminAccounts';

export default function Admin({ navigation }: any) {
  const { activeTab, selectReports, selectAccounts, isReports, isAccounts } = useAdminTabs('reports');

  return (
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
  );
}
