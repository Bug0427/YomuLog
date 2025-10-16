import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { GeneralStyles, adminTabStyles } from '../../styles/global';

interface AdminHeaderProps {
  navigation: any;
  activeTab: string;
  selectReports: () => void;
  selectAccounts: () => void;
  isReports: boolean;
  isAccounts: boolean;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  navigation,
  activeTab,
  selectReports,
  selectAccounts,
  isReports,
  isAccounts,
}) => {
  return (
    <>
      <View style={adminTabStyles.header}>
        {navigation?.goBack && (
          <TouchableOpacity
            style={adminTabStyles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={[{color:'#b2abd5ff', fontWeight: '600',}]}>Back</Text>
          </TouchableOpacity>
        )}
        <Text style={[GeneralStyles.title, {flex: 1, textAlign: 'center', color: '#412d5cff'}]}>Admin</Text>
        <View style={{ width: 70, marginRight: 15 }} />
      </View>
      <View style={adminTabStyles.tabsWrap}>
        {isReports ? (
          <View style={[adminTabStyles.activeHalf, { left: 0 }]} />
        ) : (
          <View style={[adminTabStyles.activeHalf, { right: 0 }]} />
        )}
        {/* Stationary diagonal at center; color flips to blend with the active side */}
        <View style={[
          adminTabStyles.diagonalRight,
          { left: '50%', borderTopColor: isReports ? '#412d5cff' : '#AFA6DD' }
        ]} />
        <TouchableOpacity onPress={selectReports} style={[adminTabStyles.tabHit, adminTabStyles.tabLeft]} hitSlop={10}>
          <Text style={[
            adminTabStyles.text, isReports && {color: '#AFA6DD'}
          ]}>Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={selectAccounts} style={[adminTabStyles.tabHit, adminTabStyles.tabRight]} hitSlop={10}>
          <Text style={[adminTabStyles.text, isAccounts && {color: '#AFA6DD'}]}>Accounts</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};



export default AdminHeader;
