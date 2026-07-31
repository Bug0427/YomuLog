import { useRef, useState, useCallback } from 'react';
import { ScrollView } from 'react-native';

export function useScrollTracker() {
    const scrollRef = useRef<ScrollView>(null);
    const [isScrolling, setIsScrolling] = useState(false);

    const handleScrollStart = useCallback(() => {
        setIsScrolling(true);
    }, []);

    const handleScrollEnd = useCallback(() => {
        // 600ms delay — anchors stay hidden during scroll micro-pauses, reappear after deliberate stop
        setTimeout(() => setIsScrolling(false), 600);
    }, []);

    return {
        scrollRef,
        isScrolling,
        handleScrollStart,
        handleScrollEnd,
    };
}