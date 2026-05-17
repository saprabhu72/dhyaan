import { useState, useEffect, useCallback, useRef } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { SPOTIFY_CLIENT_ID, SPOTIFY_SCOPES } from '../config/spotify';

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEY = 'dhyaan_spotify';

const DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
  trackCount: number;
}

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  selectedPlaylist: SpotifyPlaylist | null;
}

export interface SpotifyState {
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedPlaylist: SpotifyPlaylist | null;
  playlists: SpotifyPlaylist[];
}

export interface SpotifyControls {
  authenticate: () => Promise<void>;
  logout: () => Promise<void>;
  loadPlaylists: () => Promise<void>;
  searchPlaylists: (query: string) => Promise<SpotifyPlaylist[]>;
  selectPlaylist: (playlist: SpotifyPlaylist) => Promise<void>;
  play: (fromStart?: boolean) => Promise<void>;
  pause: () => Promise<void>;
  openInSpotify: () => void;
}

export function useSpotify(): [SpotifyState, SpotifyControls] {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Always-current ref used inside async callbacks to avoid stale closures
  const authRef = useRef({ accessToken, refreshToken, expiresAt, selectedPlaylist });
  useEffect(() => {
    authRef.current = { accessToken, refreshToken, expiresAt, selectedPlaylist };
  });

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'dhyaan' });

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    { clientId: SPOTIFY_CLIENT_ID, scopes: SPOTIFY_SCOPES, usePKCE: true, redirectUri },
    DISCOVERY
  );

  // Restore persisted auth on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const s: StoredAuth = JSON.parse(raw);
        setAccessToken(s.accessToken);
        setRefreshToken(s.refreshToken);
        setExpiresAt(s.expiresAt);
        setSelectedPlaylist(s.selectedPlaylist);
      } catch {}
    });
  }, []);

  async function persist(at: string, rt: string, exp: number, pl: SpotifyPlaylist | null) {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: at, refreshToken: rt, expiresAt: exp, selectedPlaylist: pl })
    );
  }

  async function doRefresh(rt: string): Promise<string | null> {
    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: rt,
          client_id: SPOTIFY_CLIENT_ID,
        }).toString(),
      });
      const data = await res.json();
      if (!data.access_token) return null;
      const newExp = Date.now() + data.expires_in * 1000;
      const newRt = data.refresh_token ?? rt;
      setAccessToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);
      setExpiresAt(newExp);
      await persist(data.access_token, newRt, newExp, authRef.current.selectedPlaylist);
      return data.access_token;
    } catch {
      return null;
    }
  }

  async function getToken(): Promise<string | null> {
    const { accessToken: at, refreshToken: rt, expiresAt: exp } = authRef.current;
    if (at && Date.now() < exp - 60_000) return at;
    if (rt) return doRefresh(rt);
    return null;
  }

  async function api(path: string, init?: RequestInit): Promise<Response> {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');
    return fetch(`https://api.spotify.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...((init?.headers as Record<string, string>) ?? {}),
      },
    });
  }

  const authenticate = useCallback(async () => {
    const result = await promptAsync();
    if (result.type !== 'success') return;
    setIsLoading(true);
    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: result.params.code,
          redirect_uri: redirectUri,
          client_id: SPOTIFY_CLIENT_ID,
          code_verifier: request?.codeVerifier ?? '',
        }).toString(),
      });
      const data = await res.json();
      if (data.access_token) {
        const newExp = Date.now() + data.expires_in * 1000;
        setAccessToken(data.access_token);
        setRefreshToken(data.refresh_token);
        setExpiresAt(newExp);
        await persist(data.access_token, data.refresh_token, newExp, null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [promptAsync, request, redirectUri]);

  const logout = useCallback(async () => {
    setAccessToken(null);
    setRefreshToken(null);
    setExpiresAt(0);
    setSelectedPlaylist(null);
    setPlaylists([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const loadPlaylists = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api('/me/playlists?limit=50');
      if (!res.ok) return;
      const data = await res.json();
      setPlaylists(
        (data.items ?? []).map((item: any) => ({
          id: item.id,
          name: item.name,
          uri: item.uri,
          trackCount: item.tracks?.total ?? 0,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchPlaylists = useCallback(async (query: string): Promise<SpotifyPlaylist[]> => {
    if (!query.trim()) return [];
    try {
      const res = await api(`/search?q=${encodeURIComponent(query)}&type=playlist&limit=20`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.playlists?.items ?? []).map((item: any) => ({
        id: item.id,
        name: item.name,
        uri: item.uri,
        trackCount: item.tracks?.total ?? 0,
      }));
    } catch {
      return [];
    }
  }, []);

  const selectPlaylist = useCallback(async (pl: SpotifyPlaylist) => {
    setSelectedPlaylist(pl);
    const { accessToken: at, refreshToken: rt, expiresAt: exp } = authRef.current;
    if (at && rt) await persist(at, rt, exp, pl);
  }, []);

  const play = useCallback(async (fromStart = true) => {
    try {
      const pl = authRef.current.selectedPlaylist;
      const body = fromStart && pl ? JSON.stringify({ context_uri: pl.uri }) : undefined;
      await api('/me/player/play', { method: 'PUT', body });
    } catch {}
  }, []);

  const pause = useCallback(async () => {
    try {
      await api('/me/player/pause', { method: 'PUT' });
    } catch {}
  }, []);

  const openInSpotify = useCallback(() => {
    const pl = authRef.current.selectedPlaylist;
    if (pl) Linking.openURL(pl.uri).catch(() => {});
  }, []);

  return [
    { isAuthenticated: !!accessToken, isLoading, selectedPlaylist, playlists },
    { authenticate, logout, loadPlaylists, searchPlaylists, selectPlaylist, play, pause, openInSpotify },
  ];
}
