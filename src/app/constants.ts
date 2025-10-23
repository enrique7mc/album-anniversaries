const stateKey = 'spotify_auth_state';
const accessTokenKey = 'spotify_access_token';
const tokenExpiryKey = 'spotify_token_expiry';
const client_id = 'ed38e1b39051422a94911e7b93e2cd83';
// Note: Using 127.0.0.1 instead of localhost per Spotify's OAuth requirements
const redirect_uri_dev = 'http://127.0.0.1:4200';
const redirect_uri = 'https://album-anniversaries.firebaseapp.com/';
const scope = 'user-read-private user-read-email user-top-read';
const albumsLocalUrl = 'assets/albums.json';
const artistsLocalUrl = 'assets/artists.json';

export {
  albumsLocalUrl,
  artistsLocalUrl,
  client_id,
  redirect_uri,
  scope,
  stateKey,
  accessTokenKey,
  tokenExpiryKey
};
