import { useRef, useState, useCallback } from 'react';
import { ScrollView } from 'react-native';

export function useScrollTracker() {
    const scrollRef = useRef<ScrollView>(null);
    const [isScrolling, setIsScrolling] = useState(false);

    const handleScrollStart = useCallback(() => {
        setIsScrolling(true);
    }, []);

    const handleScrollEnd = useCallback(() => {
        // 150ms delay — snappy re-appearance after scrolling stops (BUG-03 fix)
        setTimeout(() => setIsScrolling(false), 150);
    }, []);

    return {
        scrollRef,
        isScrolling,
        handleScrollStart,
        handleScrollEnd,
    };
}