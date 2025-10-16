// LeaveRating.tsx — 1–5 hearts rating screen
import React from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GeneralStyles } from '../../styles/global';
import FBHeader from '../../components/layout/FBHeader';

export default function LeaveRating() {
    const navigation = useNavigation<any>();
    const [rating, setRating] = React.useState<number>(0); // 0 = none selected
    const [submitting, setSubmitting] = React.useState(false);

    const handleSubmit = () => {
        if (!rating || submitting) return;
        setSubmitting(true);
        try {
            console.log('⭐ Submitted rating:', rating);
            console.log('🟢 Setting success flash and leaving LeaveRating');
            (globalThis as any).__feedbackFlash = {
                message: 'Rating submitted successfully!',
                at: Date.now(),
                ms: 3000,
            };
            navigation.goBack();
        } finally {}
    };

    const Heart = ({ index }: { index: number }) => {
        const active = index <= rating;
        return (
        <Pressable
            onPress={() => setRating(index)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Set rating to ${index}`}
            style={{ paddingHorizontal: 8, paddingVertical: 6 }}
        >
            <Ionicons
                name={active ? 'heart' : 'heart-outline'}
                size={35}
                color={active ? '#412d5cff' : '#412d5cff'}
            />
        </Pressable>
        );
    };

return (
    <View style={[GeneralStyles.section]}> 
        <FBHeader
            title="Rate this app!"
            onBack={() => navigation.goBack()}
            onSubmit={handleSubmit}
            submitLabel="Submit"
        />

    {/* Card container */}
        <View
            style={{
                marginTop: 30,
                margin:20,
                borderWidth: 2,
                borderColor: '#2c1f42',
                paddingVertical: 30,
                alignItems: 'center',
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <Heart key={i} index={i} />
                ))}
            </View>
        </View>

    </View>
);
}