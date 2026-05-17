import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  Platform,
} from 'react-native';
import { SpotifyPlaylist, SpotifyState, SpotifyControls } from '../hooks/useSpotify';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface Props {
  visible: boolean;
  spotifyState: SpotifyState;
  spotifyControls: SpotifyControls;
  onClose: () => void;
}

export function SpotifyPickerModal({ visible, spotifyState, spotifyControls, onClose }: Props) {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? Colors.darkBg : Colors.lightBg;
  const surface = isDark ? Colors.darkSurface : Colors.lightSurface;
  const textPrimary = isDark ? Colors.darkText : Colors.amberText;
  const textSub = isDark ? Colors.darkSubtext : Colors.lightSubtext;
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyPlaylist[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (visible && spotifyState.playlists.length === 0) {
      spotifyControls.loadPlaylists();
    }
  }, [visible]);

  // Reset search when modal closes
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setSearchResults([]);
    }
  }, [visible]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await spotifyControls.searchPlaylists(query);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const isSearchMode = query.trim().length > 0;
  const items: SpotifyPlaylist[] = isSearchMode ? searchResults : spotifyState.playlists;
  const showSpinner = isSearchMode ? isSearching : spotifyState.isLoading;

  function handleSelect(playlist: SpotifyPlaylist) {
    spotifyControls.selectPlaylist(playlist);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: border }]}>
          <Text style={[styles.title, { color: textPrimary }]}>Choose Music</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[styles.closeText, { color: textSub }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={[styles.searchWrap, { backgroundColor: surface }]}>
          <Text style={[styles.searchIcon, { color: textSub }]}>♫</Text>
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            placeholder="Search Spotify playlists…"
            placeholderTextColor={textSub}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.clearText, { color: textSub }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: textSub }]}>
          {isSearchMode ? 'Search Results' : 'Your Playlists'}
        </Text>

        {/* List */}
        {showSpinner && items.length === 0 ? (
          <ActivityIndicator color={Colors.amber} style={styles.loader} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = spotifyState.selectedPlaylist?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.row, { borderBottomColor: border }]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.playlistName,
                      { color: isSelected ? Colors.amber : textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {isSelected ? '♫  ' : ''}{item.name}
                  </Text>
                  <Text style={[styles.trackCount, { color: textSub }]}>
                    {item.trackCount}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              !showSpinner ? (
                <Text style={[styles.emptyText, { color: textSub }]}>
                  {isSearchMode ? 'No results found' : 'No playlists found'}
                </Text>
              ) : null
            }
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Disconnect link */}
        <TouchableOpacity
          style={styles.disconnectWrap}
          onPress={async () => { await spotifyControls.logout(); onClose(); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.disconnectText, { color: textSub }]}>Disconnect Spotify</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: Typography.body,
    fontFamily: 'Georgia',
    letterSpacing: 1,
  },
  closeText: {
    fontSize: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : 2,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body,
    letterSpacing: 0.3,
    paddingVertical: Platform.OS === 'android' ? Spacing.sm : 0,
  },
  clearText: {
    fontSize: 12,
    paddingLeft: Spacing.sm,
  },
  sectionLabel: {
    fontSize: Typography.small,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  loader: {
    marginTop: Spacing.xl,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playlistName: {
    flex: 1,
    fontSize: Typography.body,
    letterSpacing: 0.3,
    marginRight: Spacing.md,
  },
  trackCount: {
    fontSize: Typography.small,
    letterSpacing: 0.5,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: Typography.body,
    marginTop: Spacing.xl,
    fontStyle: 'italic',
  },
  disconnectWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
  },
  disconnectText: {
    fontSize: Typography.small,
    letterSpacing: 0.5,
    opacity: 0.6,
  },
});
