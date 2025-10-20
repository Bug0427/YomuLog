import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';
import { LoadingRowStyles } from '../../styles/IndependentStyles/LoadingRowStyles';
import { colors } from '../../styles/tokens';

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
borderColor = colors.cocoa,
cellBg = colors.sand,
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
        style={[
            LoadingRowStyles.cell,
            { width: Math.max(1, Math.floor(w)), borderRightColor: borderColor, backgroundColor: cellBg, height },
        ]}
        >
        <Animated.View
            style={[
                LoadingRowStyles.shimmer,
              { opacity, backgroundColor: colors.overlayScrim, width: Math.max(12, Math.floor(w * 0.6)) },
            ]}
        />
        </View>
    )),
    [widths, height, borderColor, cellBg, opacity]
);

return (
    <View
        style={[
            LoadingRowStyles.row,
            { height, borderLeftColor: borderColor, borderRightColor: borderColor },
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
borderColor = colors.deepPlum,
cellBg = colors.lavender,
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