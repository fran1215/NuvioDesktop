import React from 'react';
import { Image, type ImageProps } from 'react-native';

type FastImageLike = React.ForwardRefExoticComponent<ImageProps & React.RefAttributes<any>> & {
  resizeMode: {
    contain: 'contain';
    cover: 'cover';
    stretch: 'stretch';
    center: 'center';
  };
  priority: {
    low: 'low';
    normal: 'normal';
    high: 'high';
  };
  cacheControl: {
    immutable: 'immutable';
    web: 'web';
    cacheOnly: 'cacheOnly';
  };
  preload: (sources: Array<{ uri: string }>) => void;
};

const FastImage = React.forwardRef<any, ImageProps>((props, ref) => {
  return <Image ref={ref} {...props} />;
}) as FastImageLike;

FastImage.displayName = 'FastImage';

FastImage.resizeMode = {
  contain: 'contain',
  cover: 'cover',
  stretch: 'stretch',
  center: 'center',
};

FastImage.priority = {
  low: 'low',
  normal: 'normal',
  high: 'high',
};

FastImage.cacheControl = {
  immutable: 'immutable',
  web: 'web',
  cacheOnly: 'cacheOnly',
};

FastImage.preload = (sources) => {
  for (const source of sources) {
    if (source?.uri) {
      Image.prefetch(source.uri).catch(() => {
        // no-op for preload failures on web
      });
    }
  }
};

export default FastImage;
