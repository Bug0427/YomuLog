import React, { useRef, useEffect } from 'react';
import { Animated, Pressable, Text, Easing, ScrollView } from 'react-native';
import { AnchorStyles } from '../../styles/global';

interface AnchorProps {
    scrollRef: React.RefObject<ScrollView | null>;
    isScrolling: boolean;
}

export default function Anchor({ scrollRef, isScrolling }: AnchorProps) {
    const scrollOpacity = useRef(new Animated.Value(1)).current;
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };  
    }, []);

    useEffect(() => {
        // Stop any pending fade-in if a new scroll event comes in
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = null;
        }

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
                scrollTimeoutRef.current = null;
            }, 60);
        }
    }, [isScrolling, scrollOpacity]);

    const scrollToTop = () => {
        const node: any = scrollRef.current;
        if (!node) return;
        // Standard ScrollView / FlatList
        if (typeof node.scrollTo === 'function') {
            node.scrollTo({ y: 0, animated: true });
            return;
        }
        // FlatList / SectionList
        if (typeof node.scrollToOffset === 'function') {
            node.scrollToOffset({ offset: 0, animated: true });
            return;
        }
        // Older RN responder API
        if (typeof node.getScrollResponder === 'function') {
            const responder = node.getScrollResponder();
            if (responder && typeof responder.scrollResponderScrollTo === 'function') {
                responder.scrollResponderScrollTo({ y: 0, animated: true });
                return;
            }
        }
        // Optional: warn for debugging
        console.warn('[Anchor] No supported scroll-to-top method found on scrollRef');
    };

    const scrollToBottom = () => {
        const node: any = scrollRef.current;
        if (!node) return;
        if (typeof node.scrollToEnd === 'function') {
            node.scrollToEnd({ animated: true });
            return;
        }
        // FlatList fallback: scrollToIndex to last item if data length known (not available here), so just try a large offset
        if (typeof node.scrollToOffset === 'function') {
            node.scrollToOffset({ offset: Number.MAX_SAFE_INTEGER, animated: true });
            return;
        }
        if (typeof node.getScrollResponder === 'function') {
            const responder = node.getScrollResponder();
            if (responder && typeof responder.scrollResponderScrollToEnd === 'function') {
                responder.scrollResponderScrollToEnd({ animated: true });
                return;
            }
        }
        console.warn('[Anchor] No supported scroll-to-end method found on scrollRef');
    };

    return (
        <>
        <Animated.View
          pointerEvents="box-none"
          style={[AnchorStyles.scrollButtonUp, AnchorStyles.scrollButtonOverlay, { opacity: scrollOpacity }]}
        >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scroll to top"
              hitSlop={8}
              onPress={scrollToTop}
            >
                <Text style={[{color: '#463B54', fontSize: 18}]}>↑</Text>
            </Pressable>
        </Animated.View>

        <Animated.View
          pointerEvents="box-none"
          style={[AnchorStyles.scrollButtonDown, AnchorStyles.scrollButtonOverlay, { opacity: scrollOpacity }]}
        >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scroll to bottom"
              hitSlop={8}
              onPress={scrollToBottom}
            >
                <Text style={[{color: '#463B54', fontSize: 18}]}>↓</Text>
            </Pressable>
        </Animated.View>
        </>
    );
}

export { Anchor };
