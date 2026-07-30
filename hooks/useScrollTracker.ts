import { useRef, useState, useCallback } from 'react';
import { ScrollView } from 'react-native';

export function useScrollTracker() {
    const scrollRef = useRef<ScrollView>(null);
    const [isScrolling, setIsScrolling] = useState(false);

    const handleScrollStart = useCallback(() => {
        setIsScrolling(true);
    }, []);

    const handleScrollEnd = useCallback(() => {
        // Snappy 150ms delay — anchors reappear near-instantly (was 500ms)
        setTimeout(() => setIsScrolling(false), 150);
    }, []);

    return {
        scrollRef,
        isScrolling,
        handleScrollStart,
        handleScrollEnd,
    };
}