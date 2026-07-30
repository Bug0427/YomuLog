import { useRef, useState, useCallback } from 'react';
import { ScrollView } from 'react-native';

export function useScrollTracker() {
    const scrollRef = useRef<ScrollView>(null);
    const [isScrolling, setIsScrolling] = useState(false);

    const handleScrollStart = useCallback(() => {
        setIsScrolling(true);
    }, []);

    const handleScrollEnd = useCallback(() => {
        // 650ms delay — prevents anchor flicker during brief scroll pauses (was 150ms)
        setTimeout(() => setIsScrolling(false), 650);
    }, []);

    return {
        scrollRef,
        isScrolling,
        handleScrollStart,
        handleScrollEnd,
    };
}