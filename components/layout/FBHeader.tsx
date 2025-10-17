import React from 'react';
import { View, Text, Pressable, ViewStyle, TextStyle } from 'react-native';
import { GeneralStyles, FeedbackStyles } from '../../styles/global';


export type FBHeaderProps = {
    title: string;
    onBack?: () => void;                  // optional; if omitted, back button is hidden
    backLabel?: string;                   // default: "Back"
    onSubmit?: () => void;                // optional; if provided, shows a Submit button on right
    submitLabel?: string;                 // default: "Submit"
    containerStyle?: ViewStyle;           // optional container override
    titleStyle?: TextStyle;               // optional title override
    showDivider?: boolean;                // default: true
    disabled?: boolean;                   // optional; disables the submit button
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
    disabled,
}: FBHeaderProps) {
return (
    <View style={[FeedbackStyles.wrapper, containerStyle]}>      
    <View style={FeedbackStyles.headerRow}>
        {onBack ? (
        <Pressable onPress={onBack} style={[FeedbackStyles.button, FeedbackStyles.buttonTight]} hitSlop={10}>
            <Text style={FeedbackStyles.text}>{backLabel}</Text>
        </Pressable>
        ) : (
        <View style={FeedbackStyles.actionBtnPlaceholder} />
        )}

        {/* Center: Title */}
        <Text style={[GeneralStyles.h1, titleStyle]} numberOfLines={1}>
        {title}
        </Text>

        {/* Right: Submit button (only if onSubmit exists) */}
        {onSubmit ? (
        <Pressable
            onPress={onSubmit}
            disabled={disabled}
            style={[
                FeedbackStyles.button,
                FeedbackStyles.buttonTight,
                disabled ? { opacity: 0.5 } : null,
            ]}
            hitSlop={10}
        >
            <Text style={FeedbackStyles.text}>{submitLabel}</Text>
        </Pressable>
        ) : (
        <View style={FeedbackStyles.actionBtnPlaceholder} />
        )}
    </View>

    {showDivider && <View style={FeedbackStyles.divider} />}
    </View>
);
}
