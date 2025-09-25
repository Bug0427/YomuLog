import React, { useRef, useEffect } from 'react';
import { Animated, Pressable, Text, Easing } from 'react-native';
import { AnchorStyles } from '../../styles/global';

interface AnchorProps {
    scrollRef: React.RefObject<any>;
    isScrolling: boolean;
}

export default function Anchor({ scrollRef, isScrolling }: AnchorProps) {
    const scrollOpacity = useRef(new Animated.Value(1)).current;
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };  
    }, []);

    useEffect(() => {
        if (isScrolling) {
            Animated.timing(scrollOpacity, {
                toValue: 0,
                duration: 10,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }).start();
        } else {
            scrollTimeoutRef.current = setTimeout(() => {
                Animated.timing(scrollOpacity, {
                    toValue: 1,
                    duration: 10,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.ease),
                }).start();
            }, 150);
        }
    }, [isScrolling]);

    return (
        <>
        <Animated.View
          pointerEvents="box-none"
          style={[AnchorStyles.scrollButtonUp, AnchorStyles.scrollButtonOverlay, { opacity: scrollOpacity }]}
        >
            <Pressable onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}>
            <Text style={[AnchorStyles.scrollButtonColor, AnchorStyles.scrollButtonIcon]}>↑</Text>
            </Pressable>
        </Animated.View>

        <Animated.View
          pointerEvents="box-none"
          style={[AnchorStyles.scrollButtonDown, AnchorStyles.scrollButtonOverlay, { opacity: scrollOpacity }]}
        >
            <Pressable onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            <Text style={[AnchorStyles.scrollButtonColor, AnchorStyles.scrollButtonIcon]}>↓</Text>
            </Pressable>
        </Animated.View>
        </>
    );
}

export { Anchor };
