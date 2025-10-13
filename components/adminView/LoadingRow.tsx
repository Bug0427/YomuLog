import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';

export type LoadingRowProps = {
widths: number[];
height?: number;
borderColor?: string;
cellBg?: string;
style?: ViewStyle;
animate?: boolean;
};

export default function LoadingRow({
widths,
height = 44,
borderColor = '#543C27',
cellBg = '#E3D3BD',
style,
animate = true,
}: LoadingRowProps) {
const opacity = useRef(new Animated.Value(0.4)).current;

useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
    Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ])
    );
    loop.start();
    return () => loop.stop();
}, [animate, opacity]);

const cells = useMemo(
    () =>
    widths.map((w, i) => (
        <View
        key={`lr-${i}`}
        style={[{
                justifyContent: 'center',
                alignItems: 'center',
                borderRightWidth: 1,
                width: Math.max(1, Math.floor(w)),
                borderRightColor: borderColor,
                backgroundColor: cellBg,
                height,
            },
        ]}
        >
        <Animated.View
            style={[{ 
                height: 12,
                borderRadius: 6, 
                opacity, 
                backgroundColor: 'rgba(0,0,0,0.08)', 
                width: Math.max(12, 
                Math.floor(w * 0.6)) },
            ]}
        />
        </View>
    )),
    [widths, height, borderColor, cellBg, opacity]
);

return (
    <View
        style={[
        { 
            flexDirection: 'row',
            borderLeftWidth: 1,
            borderRightWidth: 1,
            height, 
            borderLeftColor: borderColor, 
            borderRightColor: borderColor 
        },
        style,
    ]}
    >
    {cells}
    </View>
);
}

export function LoadingRows({
widths,
count = 3,
height = 44,
borderColor = '#543C27',
cellBg = '#E3D3BD',
gap = 1,
animate = true,
}: LoadingRowProps & { count?: number; gap?: number }) {
const items = new Array(Math.max(0, count)).fill(0);
return (
    <View>
    {items.map((_, i) => (
        <View key={`lrs-${i}`} style={{ marginTop: i === 0 ? 0 : gap }}>
        <LoadingRow
            widths={widths}
            height={height}
            borderColor={borderColor}
            cellBg={cellBg}
            animate={animate}
        />
        </View>
    ))}
    </View>
);
}