import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { charsThatFit } from '../../utils/gridUtils';
import{AdminCommonStyles, AdminTabStyles} from '../../styles/global'
import { colors } from '../../styles/tokens';

export type Align = 'left' | 'center' | 'right';

export type RowColumn<T> = {
key: keyof T | string;
title: string;
width?: number;
align?: Align;
render?: (row: T, rowIndex: number) => React.ReactNode;
};

export default function RowView<T extends Record<string, any>>({
item,
index,
columns,
colWidths,
rowHeight,
totalWidth,
expandedKey,
allFit,
collapsedKeys,
onPress,
}: {
item: T;
index: number;
columns: RowColumn<T>[];
colWidths: number[];
rowHeight: number;
totalWidth: number;
expandedKey?: string;
allFit?: boolean;
collapsedKeys?: string[];
onPress: (index: number, item: T) => void;
}) {
return (
    <Pressable onPress={() => onPress(index, item)}>
    <View style={[AdminCommonStyles.dataRow, { backgroundColor: colors.lavender, height: rowHeight, width: totalWidth }]}>
        {columns.map((col, ci) => {
        const keyStr = String(col.key);
        let content: React.ReactNode;

        if (col.render) {
            content = col.render(item, index);
        } else {
            const value = String(item[col.key as keyof T] ?? '');
            const isExpandedCol = allFit ? !((collapsedKeys ?? []).includes(keyStr)) : expandedKey === keyStr;
            if (isExpandedCol) {
            content = <Text style={[AdminTabStyles.text, {fontWeight: '400'}]}>{value}</Text>;
            } else {
            const allowed = Math.max(1, charsThatFit(colWidths[ci]));
            const clipped = value.length > allowed ? value.slice(0, Math.max(0, allowed - 1)) + '…' : value;
            content = (
                <Text style={[AdminTabStyles.text, {fontWeight: '400'}]} numberOfLines={1} ellipsizeMode="tail">
                {clipped}
                </Text>
            );
            }
        }

        return (
            <View
            key={`c-${index}-${keyStr}-${ci}`}
            style={[AdminCommonStyles.dataCell, { width: colWidths[ci], justifyContent: getCellAlign(col.align) }]}
            >
            {content}
            </View>
        );
        })}
    </View>
    </Pressable>
);
}

function getCellAlign(align?: Align) {
switch (align) {
    case 'center':
    return 'center';
    case 'right':
    return 'flex-end';
    default:
    return 'flex-start';
}
}