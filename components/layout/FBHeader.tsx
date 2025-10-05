import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { GeneralStyles, FeedBackStyles } from '../../styles/global';


export type FBHeaderProps = {
    title: string;
    onBack?: () => void;                  // optional; if omitted, back button is hidden
    backLabel?: string;                   // default: "Back"
    onSubmit?: () => void;                // optional; if provided, shows a Submit button on right
    submitLabel?: string;                 // default: "Submit"
    containerStyle?: ViewStyle;           // optional container override
    titleStyle?: TextStyle;               // optional title override
    showDivider?: boolean;                // default: true
};

export default function FBHeader({
    title,
    onBack,
    backLabel = 'Back',
    onSubmit,
    submitLabel = 'Submit',
    containerStyle,
    titleStyle,
    showDivider = true,
}: FBHeaderProps) {
return (
    <View style={[FeedBackStyles.wrapper, containerStyle]}>      
    <View style={[FeedBackStyles.Button, {justifyContent: 'space-between', marginBottom: 7}]}>
        {onBack ? (
        <Pressable onPress={onBack} style={[FeedBackStyles.Button, {marginBottom:0}]} hitSlop={10}>
            <Text style={FeedBackStyles.Text}>{backLabel}</Text>
        </Pressable>
        ) : (
        <View style={FeedBackStyles.actionBtnPlaceholder} />
        )}

        {/* Center: Title */}
        <Text style={[GeneralStyles.h1, titleStyle]} numberOfLines={1}>
        {title}
        </Text>

        {/* Right: Submit button (only if onSubmit exists) */}
        {onSubmit ? (
        <Pressable onPress={onSubmit} style={[FeedBackStyles.Button, {marginBottom:0}]} hitSlop={10}>
            <Text style={FeedBackStyles.Text}>{submitLabel}</Text>
        </Pressable>
        ) : (
        <View style={FeedBackStyles.actionBtnPlaceholder} />
        )}
    </View>

    {showDivider && <View style={FeedBackStyles.divider} />}
    </View>
);
}

