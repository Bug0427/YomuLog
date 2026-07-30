// components/general/FallbackImage.tsx
// Image wrapper with onError fallback — swaps to placeholder when load fails.
import React, { useState } from 'react';
import { Image, View, StyleProp, ImageStyle, ImageSourcePropType } from 'react-native';
import { CardViewStyles } from '../../styles/global';

type Props = {
  source: ImageSourcePropType | undefined;
  style?: StyleProp<ImageStyle>;
  fallbackStyle?: StyleProp<ImageStyle>;
};

export default function FallbackImage({ source, style, fallbackStyle }: Props) {
  const [errored, setErrored] = useState(false);

  if (errored || !source || (typeof source === 'object' && !('uri' in source) && !source)) {
    return (
      <View
        style={[
          CardViewStyles.placeholder,
          CardViewStyles.mediaFull,
          fallbackStyle,
        ]}
      />
    );
  }

  return (
    <Image
      source={source}
      style={style}
      resizeMode="cover"
      onError={() => setErrored(true)}
    />
  );
}
