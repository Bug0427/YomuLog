import React from 'react';
import { Pressable, Text, ViewStyle, TextStyle } from 'react-native';
import { SubmitButtonStyles, FeedBackStyles} from '../../styles/global';

type Props = {
title?: string;
onPress: () => void;
disabled?: boolean;
style?: ViewStyle | ViewStyle[];
textStyle?: TextStyle | TextStyle[];
};

export default function SubmitButton({
title = 'Submit',
onPress,
disabled,
style,
textStyle,
}: Props) {
return (
    <Pressable
    accessibilityRole="button"
    style={[SubmitButtonStyles.item, disabled ? { opacity: 0.5 } : null, style]}
    onPress={onPress}
    disabled={!!disabled}
    >
    <Text style={[FeedBackStyles.itemText, textStyle]}>{title}</Text>
    </Pressable>
);
}