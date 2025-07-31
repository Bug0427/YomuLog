import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';
import { useScrollTracker } from '../hooks/useScrollTracker';

interface TrackedScrollViewProps extends ScrollViewProps {
    children: React.ReactNode;
}

export function TrackedScrollView({ children, ...props }: TrackedScrollViewProps) {
    const { scrollRef, isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();

    return (
        <ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        onScrollBeginDrag={handleScrollStart}
        onScrollEndDrag={handleScrollEnd}
        bounces={true}
        alwaysBounceVertical={true}
        {...props}
        >
        {children}
        </ScrollView>
    );
}