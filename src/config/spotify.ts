// Register your app at https://developer.spotify.com/dashboard and paste the Client ID below.
// In the dashboard, add these Redirect URIs:
//   dhyaan://  (production / dev builds)
//   exp://localhost:8081/--/  (Expo Go, if testing there)
export const SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID_HERE';

export const SPOTIFY_SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-playback-state',
  'user-modify-playback-state',
];
