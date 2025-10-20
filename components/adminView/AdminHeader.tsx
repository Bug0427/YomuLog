import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { GeneralStyles, AdminTabStyles } from '../../styles/global';
import { AdminHeaderStyles } from '../../styles/IndependentStyles/AdminHeaderStyles';

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
            <Text style={AdminHeaderStyles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <Text style={[GeneralStyles.title, AdminHeaderStyles.titleCenter]}>Admin</Text>
        <View style={AdminHeaderStyles.spacer} />
      </View>
      <View style={AdminTabStyles.tabsWrap}>
        {isReports ? (
          <View style={[AdminTabStyles.activeHalf, { left: 0 }]} />
        ) : (
          <View style={[AdminTabStyles.activeHalf, { right: 0 }]} />
        )}
        {/* Stationary diagonal at center; color flips to blend with the active side */}
        <View
          style={[
            AdminTabStyles.diagonalRight,
            AdminHeaderStyles.diagonalCenter,
            isReports ? AdminHeaderStyles.diagonalTopDeep : AdminHeaderStyles.diagonalTopLav,
          ]}
        />
        <TouchableOpacity onPress={selectReports} style={[AdminTabStyles.tabHit, AdminTabStyles.tabLeft]} hitSlop={10}>
          <Text style={[
            AdminTabStyles.text, isReports && AdminHeaderStyles.activeText
          ]}>Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={selectAccounts} style={[AdminTabStyles.tabHit, AdminTabStyles.tabRight]} hitSlop={10}>
          <Text style={[AdminTabStyles.text, isAccounts && AdminHeaderStyles.activeText]}>Accounts</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};



export default AdminHeader;
