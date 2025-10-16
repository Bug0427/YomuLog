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

    React.useEffect(() => {
        const unsub = (navigation as any).addListener?.('focus', () => {
            console.log('👤 activeUser (LeaveRating focus):', (globalThis as any).__activeUser);
            console.log('🛠 LeaveRating state:', { rating, submitting });
        });
        return () => { if (typeof unsub === 'function') unsub(); };
    }, [navigation, rating, submitting]);

    const handleSubmit = async () => {
        if (!rating || submitting) return;
        setSubmitting(true);
        try {
            // Get accountId directly from globalThis.currentAccountId (same as FileReport)
            const accountId = (globalThis as any).currentAccountId;
            console.log('🔍 LeaveRating resolved accountId:', accountId);
            const payload = {
                accountId,
                rating,
            };
            console.log('Submitting rating payload:', payload);

            const repo = await import('../../services/feedbackRepo');
            if (typeof repo.insertRating !== 'function') {
                throw new Error('insertRating not exported from feedbackRepo');
            }
            const saved = await repo.insertRating(payload);
            console.log('✅ insertRating result:', saved);

            console.log('🟢 Setting success flash and leaving LeaveRating');
            (globalThis as any).__feedbackFlash = {
                message: 'Rating submitted successfully!',
                at: Date.now(),
                ms: 3000,
            };
            navigation.goBack();
        } catch (e) {
            console.warn('❌ Failed to save rating (screen):', e);
        } finally {
            setSubmitting(false);
        }
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
            disabled={!rating || submitting}
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