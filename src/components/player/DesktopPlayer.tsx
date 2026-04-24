import React, { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Video from 'react-native-video';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../contexts/ThemeContext';

const DesktopPlayer: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PlayerAndroid'>>();
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const {
    uri,
    title = 'Playback',
    episodeTitle,
    quality,
  } = route.params;

  const displayTitle = episodeTitle || title;

  const openExternally = async () => {
    try {
      await Linking.openURL(uri);
    } catch {
      setHasError(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.darkBackground, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: currentTheme.colors.border || 'rgba(255,255,255,0.08)' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: currentTheme.colors.card || 'rgba(255,255,255,0.08)' }]}>
          <Text style={[styles.backButtonText, { color: currentTheme.colors.text }]}>Back</Text>
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={[styles.title, { color: currentTheme.colors.text }]}>{displayTitle}</Text>
          <Text numberOfLines={1} style={[styles.subtitle, { color: currentTheme.colors.mutedText || 'rgba(255,255,255,0.7)' }]}>
            Desktop playback preview{quality ? ` • ${quality}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={openExternally} style={[styles.actionButton, { backgroundColor: currentTheme.colors.primary }]}>
          <Text style={styles.actionButtonText}>Open</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.playerShell}>
        {!hasError ? (
          <Video
            source={{ uri }}
            style={styles.video}
            controls
            resizeMode="contain"
            onLoadStart={() => setIsLoading(true)}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        ) : (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Desktop playback needs a fallback</Text>
            <Text style={styles.errorText}>
              The stream could not be opened directly in the desktop player yet. You can try opening it externally while desktop support is expanded.
            </Text>
            <TouchableOpacity onPress={openExternally} style={[styles.retryButton, { backgroundColor: currentTheme.colors.primary }]}>
              <Text style={styles.retryButtonText}>Open stream</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading && !hasError && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={currentTheme.colors.primary} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  actionButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  playerShell: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  errorCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 560,
    lineHeight: 20,
  },
  retryButton: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default DesktopPlayer;