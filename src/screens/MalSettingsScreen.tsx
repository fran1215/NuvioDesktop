import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform,
  Switch,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FastImage from '@d11/react-native-fast-image';
import { MalAuth } from '../services/mal/MalAuth';
import { MalApiService } from '../services/mal/MalApi';
import { MalSync } from '../services/mal/MalSync';
import { mmkvStorage } from '../services/mmkvStorage';
import { MalUser } from '../types/mal';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../styles';
import CustomAlert from '../components/CustomAlert';
import { useTranslation } from 'react-i18next';

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

const MalSettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { currentTheme } = useTheme();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<MalUser | null>(null);
  
  const [syncEnabled, setSyncEnabled] = useState(mmkvStorage.getBoolean('mal_enabled') ?? true);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(mmkvStorage.getBoolean('mal_auto_update') ?? true);
  const [autoAddEnabled, setAutoAddEnabled] = useState(mmkvStorage.getBoolean('mal_auto_add') ?? true);
  const [autoLibrarySyncEnabled, setAutoLibrarySyncEnabled] = useState(mmkvStorage.getBoolean('mal_auto_sync_to_library') ?? false);
  const [includeNsfwEnabled, setIncludeNsfwEnabled] = useState(mmkvStorage.getBoolean('mal_include_nsfw') ?? true);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertActions, setAlertActions] = useState<Array<{ label: string; onPress: () => void }>>([]);

  const openAlert = (title: string, message: string, actions?: any[]) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertActions(actions || [{ label: t('common.ok'), onPress: () => setAlertVisible(false) }]);
    setAlertVisible(true);
  };

  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      // Initialize Auth (loads from storage)
      const token = MalAuth.getToken();
      
      if (token && !MalAuth.isTokenExpired(token)) {
        setIsAuthenticated(true);
        // Fetch Profile
        const profile = await MalApiService.getUserInfo();
        setUserProfile(profile);
      } else if (token && MalAuth.isTokenExpired(token)) {
          // Try refresh
          const refreshed = await MalAuth.refreshToken();
          if (refreshed) {
              setIsAuthenticated(true);
              const profile = await MalApiService.getUserInfo();
              setUserProfile(profile);
          } else {
              setIsAuthenticated(false);
              setUserProfile(null);
          }
      } else {
        setIsAuthenticated(false);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('[MalSettings] Auth check failed', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
        const result = await MalAuth.login();
        if (result === true) {
            await checkAuthStatus();
            openAlert('Success', 'Connected to MyAnimeList');
        } else {
            const errorMessage = typeof result === 'string' ? result : 'Failed to connect to MyAnimeList';
            openAlert('Error', errorMessage);
        }
    } catch (e: any) {
        console.error(e);
        openAlert('Error', `An error occurred during sign in: ${e.message || 'Unknown error'}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSignOut = () => {
      openAlert('Sign Out', 'Are you sure you want to disconnect?', [
          { label: 'Cancel', onPress: () => setAlertVisible(false) },
          { 
              label: 'Sign Out', 
              onPress: () => {
                  MalAuth.clearToken();
                  setIsAuthenticated(false);
                  setUserProfile(null);
                  setAlertVisible(false);
              }
          }
      ]);
  };

  const toggleSync = (val: boolean) => {
      setSyncEnabled(val);
      mmkvStorage.setBoolean('mal_enabled', val);
  };

  const toggleAutoUpdate = (val: boolean) => {
      setAutoUpdateEnabled(val);
      mmkvStorage.setBoolean('mal_auto_update', val);
  };

  const toggleAutoAdd = (val: boolean) => {
      setAutoAddEnabled(val);
      mmkvStorage.setBoolean('mal_auto_add', val);
  };

  const toggleAutoLibrarySync = (val: boolean) => {
      setAutoLibrarySyncEnabled(val);
      mmkvStorage.setBoolean('mal_auto_sync_to_library', val);
  };

  const toggleIncludeNsfw = (val: boolean) => {
      setIncludeNsfwEnabled(val);
      mmkvStorage.setBoolean('mal_include_nsfw', val);
  };

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: currentTheme.colors.darkBackground }
    ]}>
      <StatusBar barStyle={'light-content'} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={currentTheme.colors.highEmphasis}
          />
          <Text style={[styles.backText, { color: currentTheme.colors.highEmphasis }]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.headerTitle, { color: currentTheme.colors.highEmphasis }]}>
        MyAnimeList
      </Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: currentTheme.colors.elevation2 }]}>
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                </View>
            ) : isAuthenticated && userProfile ? (
                <View style={styles.profileContainer}>
                    <View style={styles.profileHeader}>
                        {userProfile.picture ? (
                            <FastImage 
                                source={{ uri: userProfile.picture }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: currentTheme.colors.primary }]}>
                                <Text style={styles.avatarText}>{userProfile.name.charAt(0)}</Text>
                            </View>
                        )}
                        <View style={styles.profileInfo}>
                            <Text style={[styles.profileName, { color: currentTheme.colors.highEmphasis }]}>
                                {userProfile.name}
                            </Text>
                            <View style={styles.profileDetailRow}>
                                <MaterialIcons name="fingerprint" size={14} color={currentTheme.colors.mediumEmphasis} />
                                <Text style={[styles.profileDetailText, { color: currentTheme.colors.mediumEmphasis }]}>
                                    ID: {userProfile.id}
                                </Text>
                            </View>
                            {userProfile.location && (
                                <View style={styles.profileDetailRow}>
                                    <MaterialIcons name="location-on" size={14} color={currentTheme.colors.mediumEmphasis} />
                                    <Text style={[styles.profileDetailText, { color: currentTheme.colors.mediumEmphasis }]}>
                                        {userProfile.location}
                                    </Text>
                                </View>
                            )}
                            {userProfile.birthday && (
                                <View style={styles.profileDetailRow}>
                                    <MaterialIcons name="cake" size={14} color={currentTheme.colors.mediumEmphasis} />
                                    <Text style={[styles.profileDetailText, { color: currentTheme.colors.mediumEmphasis }]}>
                                        {userProfile.birthday}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {userProfile.anime_statistics && (
                        <View style={styles.statsContainer}>
                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Text style={[styles.statValue, { color: currentTheme.colors.primary }]}>
                                        {userProfile.anime_statistics.num_items}
                                    </Text>
                                    <Text style={[styles.statLabel, { color: currentTheme.colors.mediumEmphasis }]}>Total</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={[styles.statValue, { color: currentTheme.colors.primary }]}>
                                        {userProfile.anime_statistics.num_days_watched.toFixed(1)}
                                    </Text>
                                    <Text style={[styles.statLabel, { color: currentTheme.colors.mediumEmphasis }]}>Days</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={[styles.statValue, { color: currentTheme.colors.primary }]}>
                                        {userProfile.anime_statistics.mean_score.toFixed(1)}
                                    </Text>
                                    <Text style={[styles.statLabel, { color: currentTheme.colors.mediumEmphasis }]}>Mean</Text>
                                </View>
                            </View>
                            
                            <View style={[styles.statGrid, { borderColor: currentTheme.colors.border }]}>
                                <View style={styles.statGridItem}>
                                    <View style={[styles.statusDot, { backgroundColor: '#2DB039' }]} />
                                    <Text style={[styles.statGridLabel, { color: currentTheme.colors.highEmphasis }]}>Watching</Text>
                                    <Text style={[styles.statGridValue, { color: currentTheme.colors.highEmphasis }]}>
                                        {userProfile.anime_statistics.num_items_watching}
                                    </Text>
                                </View>
                                <View style={styles.statGridItem}>
                                    <View style={[styles.statusDot, { backgroundColor: '#26448F' }]} />
                                    <Text style={[styles.statGridLabel, { color: currentTheme.colors.highEmphasis }]}>Completed</Text>
                                    <Text style={[styles.statGridValue, { color: currentTheme.colors.highEmphasis }]}>
                                        {userProfile.anime_statistics.num_items_completed}
                                    </Text>
                                </View>
                                <View style={styles.statGridItem}>
                                    <View style={[styles.statusDot, { backgroundColor: '#F9D457' }]} />
                                    <Text style={[styles.statGridLabel, { color: currentTheme.colors.highEmphasis }]}>On Hold</Text>
                                    <Text style={[styles.statGridValue, { color: currentTheme.colors.highEmphasis }]}>
                                        {userProfile.anime_statistics.num_items_on_hold}
                                    </Text>
                                </View>
                                <View style={styles.statGridItem}>
                                    <View style={[styles.statusDot, { backgroundColor: '#A12F31' }]} />
                                    <Text style={[styles.statGridLabel, { color: currentTheme.colors.highEmphasis }]}>Dropped</Text>
                                    <Text style={[styles.statGridValue, { color: currentTheme.colors.highEmphasis }]}>
                                        {userProfile.anime_statistics.num_items_dropped}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                    
                    <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                            style={[styles.smallButton, { backgroundColor: currentTheme.colors.primary, flex: 1, marginRight: 8 }]}
                            onPress={async () => {
                                setIsLoading(true);
                                try {
                                    const synced = await MalSync.syncMalToLibrary();
                                    if (synced) {
                                        openAlert('Sync Complete', 'MAL data has been refreshed.');
                                    } else {
                                        openAlert('Sync Failed', 'Could not refresh MAL data.');
                                    }
                                } catch {
                                    openAlert('Sync Failed', 'Could not refresh MAL data.');
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                        >
                            <MaterialIcons name="sync" size={18} color="white" style={{ marginRight: 6 }} />
                            <Text style={styles.buttonText}>Sync</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.smallButton, { backgroundColor: currentTheme.colors.error, width: 100 }]}
                            onPress={handleSignOut}
                        >
                            <Text style={styles.buttonText}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.signInContainer}>
                    <Image 
                        source={require('../../assets/rating-icons/mal-icon.png')} 
                        style={{ width: 80, height: 80, marginBottom: 16, borderRadius: 16 }} 
                        resizeMode="contain"
                    />
                    <Text style={[styles.signInTitle, { color: currentTheme.colors.highEmphasis }]}>
                        Connect MyAnimeList
                    </Text>
                    <Text style={[styles.signInDescription, { color: currentTheme.colors.mediumEmphasis }]}>
                        Sync your watch history and manage your anime list.
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: currentTheme.colors.primary }]}
                        onPress={handleSignIn}
                    >
                        <Text style={styles.buttonText}>Sign In with MAL</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>

        {isAuthenticated && (
            <View style={[styles.card, { backgroundColor: currentTheme.colors.elevation2 }]}>
                <View style={styles.settingsSection}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.colors.highEmphasis }]}>
                        Sync Settings
                    </Text>
                    
                    <View style={styles.settingItem}>
                        <View style={styles.settingContent}>
                            <View style={styles.settingTextContainer}>
                                <Text style={[styles.settingLabel, { color: currentTheme.colors.highEmphasis }]}>
                                    Enable MAL Sync
                                </Text>
                                <Text style={[styles.settingDescription, { color: currentTheme.colors.mediumEmphasis }]}>
                                    Global switch to enable or disable all MyAnimeList features.
                                </Text>
                            </View>
                            <Switch
                                value={syncEnabled}
                                onValueChange={toggleSync}
                                trackColor={{ false: currentTheme.colors.border, true: currentTheme.colors.primary + '80' }}
                                thumbColor={syncEnabled ? currentTheme.colors.white : currentTheme.colors.mediumEmphasis}
                            />
                        </View>
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingContent}>
                            <View style={styles.settingTextContainer}>
                                <Text style={[styles.settingLabel, { color: currentTheme.colors.highEmphasis }]}>
                                    Auto Episode Update
                                </Text>
                                <Text style={[styles.settingDescription, { color: currentTheme.colors.mediumEmphasis }]}>
                                    Automatically update your progress on MAL when you finish watching an episode (&gt;=90% completion).
                                </Text>
                            </View>
                            <Switch
                                value={autoUpdateEnabled}
                                onValueChange={toggleAutoUpdate}
                                trackColor={{ false: currentTheme.colors.border, true: currentTheme.colors.primary + '80' }}
                                thumbColor={autoUpdateEnabled ? currentTheme.colors.white : currentTheme.colors.mediumEmphasis}
                            />
                        </View>
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingContent}>
                            <View style={styles.settingTextContainer}>
                                <Text style={[styles.settingLabel, { color: currentTheme.colors.highEmphasis }]}>
                                    Auto Add Anime
                                </Text>
                                <Text style={[styles.settingDescription, { color: currentTheme.colors.mediumEmphasis }]}>
                                    If an anime is not in your MAL list, it will be added automatically when you start watching.
                                </Text>
                            </View>
                            <Switch
                                value={autoAddEnabled}
                                onValueChange={toggleAutoAdd}
                                trackColor={{ false: currentTheme.colors.border, true: currentTheme.colors.primary + '80' }}
                                thumbColor={autoAddEnabled ? currentTheme.colors.white : currentTheme.colors.mediumEmphasis}
                            />
                        </View>
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingContent}>
                            <View style={styles.settingTextContainer}>
                                <Text style={[styles.settingLabel, { color: currentTheme.colors.highEmphasis }]}>
                                    Auto-Sync to Library
                                </Text>
                                <Text style={[styles.settingDescription, { color: currentTheme.colors.mediumEmphasis }]}>
                                    Automatically add items from your MAL 'Watching' list to your Nuvio Library.
                                </Text>
                            </View>
                            <Switch
                                value={autoLibrarySyncEnabled}
                                onValueChange={toggleAutoLibrarySync}
                                trackColor={{ false: currentTheme.colors.border, true: currentTheme.colors.primary + '80' }}
                                thumbColor={autoLibrarySyncEnabled ? currentTheme.colors.white : currentTheme.colors.mediumEmphasis}
                            />
                        </View>
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingContent}>
                            <View style={styles.settingTextContainer}>
                                <Text style={[styles.settingLabel, { color: currentTheme.colors.highEmphasis }]}>
                                    Include NSFW Content
                                </Text>
                                <Text style={[styles.settingDescription, { color: currentTheme.colors.mediumEmphasis }]}>
                                    Allow NSFW entries to be returned when fetching your MAL list.
                                </Text>
                            </View>
                            <Switch
                                value={includeNsfwEnabled}
                                onValueChange={toggleIncludeNsfw}
                                trackColor={{ false: currentTheme.colors.border, true: currentTheme.colors.primary + '80' }}
                                thumbColor={includeNsfwEnabled ? currentTheme.colors.white : currentTheme.colors.mediumEmphasis}
                            />
                        </View>
                    </View>
                </View>
            </View>
        )}
      </ScrollView>
      
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
        actions={alertActions}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT + 8 : 8,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  backText: { fontSize: 17, marginLeft: 8 },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
  },
  loadingContainer: { padding: 40, alignItems: 'center' },
  signInContainer: { padding: 24, alignItems: 'center' },
  signInTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  signInDescription: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  button: {
    width: '100%',
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { fontSize: 16, fontWeight: '500', color: 'white' },
  profileContainer: { padding: 20 },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, color: 'white', fontWeight: 'bold' },
  profileInfo: { marginLeft: 16, flex: 1 },
  profileName: { fontSize: 18, fontWeight: '600' },
  profileDetailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  profileDetailText: { fontSize: 12, marginLeft: 4 },
  statsContainer: { marginTop: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    borderTopWidth: 1, 
    paddingTop: 16,
    gap: 12
  },
  statGridItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '45%',
    marginBottom: 8
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statGridLabel: { fontSize: 13, flex: 1 },
  statGridValue: { fontSize: 13, fontWeight: '600' },
  actionButtonsRow: { flexDirection: 'row', marginTop: 20 },
  smallButton: {
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  signOutButton: { marginTop: 20 },
  settingsSection: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  settingItem: { marginBottom: 16 },
  settingContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingTextContainer: { flex: 1, marginRight: 16 },
  settingLabel: { fontSize: 15, fontWeight: '500', marginBottom: 4 },
  settingDescription: { fontSize: 14 },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    marginTop: -8,
  },
  noteText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

export default MalSettingsScreen;
