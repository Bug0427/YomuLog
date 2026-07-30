import { useRef, useState, useCallback } from 'react';
import { ScrollView } from 'react-native';

export function useScrollTracker() {
    const scrollRef = useRef<ScrollView>(null);
    const [isScrolling, setIsScrolling] = useState(false);

    const handleScrollStart = useCallback(() => {
        setIsScrolling(true);
    }, []);

    const handleScrollEnd = useCallback(() => {
        // Snappy 50ms delay — anchors reappear near-instantly (was 150ms)
        setTimeout(() => setIsScrolling(false), 50);
    }, []);

    return {
        scrollRef,
        isScrolling,
        handleScrollStart,
        handleScrollEnd,
    };
}