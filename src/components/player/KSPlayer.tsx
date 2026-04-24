import React from 'react';
import { Platform } from 'react-native';
import DesktopPlayer from './DesktopPlayer';

let AndroidVideoPlayer: React.ComponentType | null = null;
let KSPlayerCore: React.ComponentType | null = null;

if (Platform.OS === 'ios') {
  KSPlayerCore = require('./KSPlayerCore').default;
} else if (Platform.OS !== 'web') {
  AndroidVideoPlayer = require('./AndroidVideoPlayer').default;
}

// Simple platform-based player selection
const KSPlayer: React.FC = () => {
  if (Platform.OS === 'web') {
    return <DesktopPlayer />;
  }

  return Platform.OS === 'ios' && KSPlayerCore ? <KSPlayerCore /> : AndroidVideoPlayer ? <AndroidVideoPlayer /> : <DesktopPlayer />;
};

export default KSPlayer;