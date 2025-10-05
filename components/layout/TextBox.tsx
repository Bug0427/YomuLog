import React, { useState } from 'react';
import { View, Text, TextInput, Keyboard } from 'react-native';
import { FeedBackStyles } from '../../styles/global';

export type TextBoxProps = {
label?: string;                 // e.g., "Add details (max 160)"
maxLength?: number;             // default 160
initialValue?: string;
placeholder?: string;
showCounter?: boolean;          // default true
submitDisabled?: boolean;       // screen controls enable/disable (kept for compatibility)
onChangeText?: (text: string) => void;
onSubmit?: (text: string) => void; // optional, screen handles submit via external button
};

export default function TextBox({
label = 'Add details (max 160)',
maxLength = 160,
initialValue = '',
placeholder = 'Type here…',
showCounter = true,
// submitDisabled not used here anymore, kept for prop compatibility
onChangeText,
onSubmit,
}: TextBoxProps) {
const [value, setValue] = useState(initialValue);

const handleChange = (t: string) => {
    const next = t.length > maxLength ? t.slice(0, maxLength) : t;
    setValue(next);
    onChangeText?.(next);
};

const handleSubmit = () => {
    if (onSubmit) onSubmit(value);
    Keyboard.dismiss();
};

return (
    <View style={{ gap: 8 }}>
    <Text style={FeedBackStyles.itemText}>{label}</Text>

    <TextInput
        style={[FeedBackStyles.item, { minHeight: 96, textAlignVertical: 'top' }]}
        multiline
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#543C27"
        maxLength={maxLength}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
    />

    {showCounter && (
        <Text style={FeedBackStyles.helper}>{value.length}/{maxLength}</Text>
    )}
    </View>
);
}