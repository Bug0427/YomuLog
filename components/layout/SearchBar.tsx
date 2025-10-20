import React, { FC } from 'react';
import { View, Pressable, Text, TextInput, Platform } from 'react-native';
import type { ViewStyle } from 'react-native';
import { GeneralStyles, SearchBarStyles } from '../../styles/global';
import { colors } from '../../styles/tokens';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useBreakpoint } from '../../utils/findDimensions';


export type SearchBarProps = {
onOpenOrder?: () => void;
onSearchPress?: () => void;
onFilterPress?: () => void;
value?: string;                 
onChangeText?: (t: string) => void; 
placeholder?: string;           
showFilters?: boolean;          
};

const SearchBar: FC<SearchBarProps> = ({
onOpenOrder,
onSearchPress,
onFilterPress,
value,
onChangeText,
placeholder = 'Search',
showFilters = true,
}) => {

// Single source of truth for layout decisions
const bp = useBreakpoint();

// Consistent square tap targets across devices to avoid "oval" buttons on web
// Apple (44pt) / Android (48dp). Use a single square size for simplicity.
const tapSize = Platform.OS === 'android' ? 48 : 44;
const iconSize = Math.round(tapSize * 0.45);

// Reusable square container for icon buttons
const filterButton: ViewStyle = {
    width: tapSize,
    height: tapSize,
    borderRadius: tapSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
};

// Shared container row
return (
    <View style={GeneralStyles.alignment}>
    {/* Order / menu button (hamburger) */}
    <Pressable
        style={[SearchBarStyles.order, filterButton]}
        onPress={onOpenOrder}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
    >
        <Text style={[SearchBarStyles.hamburger, { fontSize: iconSize, lineHeight: iconSize }]}>☰</Text>
    </Pressable>

    <View
        style={[
            SearchBarStyles.searchBar,
            SearchBarStyles.searchRow
        ]}
        >
        <Pressable
            onPress={onSearchPress}
            accessibilityRole="button"
            accessibilityLabel="Run search"
            hitSlop={8}
            style={SearchBarStyles.searchIconBtn}
        >
            <Feather name="search" size={iconSize} color={colors.cocoa} />
        </Pressable>
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholderText}
            style={[SearchBarStyles.input, { paddingVertical: 4 }]}
            returnKeyType="search"
            onSubmitEditing={() => onSearchPress?.()}
            accessibilityLabel="Search"
        />
    </View>

    {/* Filters button (can hide on very small width if desired) */}
    {showFilters !== false && (
        <Pressable
        style={[SearchBarStyles.filter, filterButton]}
        onPress={onFilterPress}
        accessibilityRole="button"
        accessibilityLabel="Open filters"
        >
        <MaterialCommunityIcons name="filter-outline" size={iconSize} color={colors.cocoa} />
        </Pressable>
    )}
    </View>
);
};

export default SearchBar;

