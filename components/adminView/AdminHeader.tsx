import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { GeneralStyles, AdminTabStyles } from '../../styles/global';

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
  selectReports,
  selectAccounts,
  isReports,
  isAccounts,
}) => {
  return (
    <>
      <View style={AdminTabStyles.header}>
        {navigation?.goBack && (
          <TouchableOpacity
            style={AdminTabStyles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={[{color:'#b2abd5ff', fontWeight: '600',}]}>Back</Text>
          </TouchableOpacity>
        )}
        <Text style={[GeneralStyles.title, {flex: 1, textAlign: 'center', color: '#412d5cff'}]}>Admin</Text>
        <View style={{ width: 70, marginRight: 15 }} />
      </View>
      <View style={AdminTabStyles.tabsWrap}>
        {isReports ? (
          <View style={[AdminTabStyles.activeHalf, { left: 0 }]} />
        ) : (
          <View style={[AdminTabStyles.activeHalf, { right: 0 }]} />
        )}
        {/* Stationary diagonal at center; color flips to blend with the active side */}
        <View style={[
          AdminTabStyles.diagonalRight,
          { left: '50%', borderTopColor: isReports ? '#412d5cff' : '#AFA6DD' }
        ]} />
        <TouchableOpacity onPress={selectReports} style={[AdminTabStyles.tabHit, AdminTabStyles.tabLeft]} hitSlop={10}>
          <Text style={[
            AdminTabStyles.text, isReports && {color: '#AFA6DD'}
          ]}>Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={selectAccounts} style={[AdminTabStyles.tabHit, AdminTabStyles.tabRight]} hitSlop={10}>
          <Text style={[AdminTabStyles.text, isAccounts && {color: '#AFA6DD'}]}>Accounts</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};



export default AdminHeader;
