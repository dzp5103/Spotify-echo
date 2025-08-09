/**
 * Spotify MVP API Endpoints
 * Implements core Spotify functionality for issues #150, #151, #154
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Middleware to ensure Spotify tokens are available and valid
async function requireSpotifyAuth(req, res, next) {
  try {
    if (!req.auth || !req.auth.isAuthenticated) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in with Spotify to access this endpoint'
      });
    }

    if (!req.auth.spotifyTokens) {
      return res.status(401).json({
        error: 'Spotify tokens not available',
        message: 'Please re-authenticate with Spotify'
      });
    }

    // Check if token is expired and needs refresh
    const tokens = req.auth.spotifyTokens;
    if (tokens.expires_at && Date.now() > tokens.expires_at - 60000) {
      try {
        // Attempt to refresh the token
        const refreshResult = await req.auth.authService.refreshSpotifyToken(tokens.refresh_token);
        
        // Update tokens in session
        req.auth.spotifyTokens = {
          ...tokens,
          ...refreshResult,
          expires_at: Date.now() + (refreshResult.expires_in * 1000)
        };
        
        // Update session
        const session = await req.auth.authService.getSession(req.auth.sessionId);
        if (session) {
          session.spotifyTokens = req.auth.spotifyTokens;
          await req.auth.authService.updateSession(req.auth.sessionId, session);
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        return res.status(401).json({
          error: 'Token refresh failed',
          message: 'Please re-authenticate with Spotify'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Spotify auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication check failed',
      message: error.message
    });
  }
}

// Helper function to make Spotify API calls
async function makeSpotifyRequest(endpoint, accessToken, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `https://api.spotify.com/v1${endpoint}`;
  
  try {
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      data: options.data,
      params: options.params
    });
    
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
    }
    
    if (error.response?.status === 401) {
      throw new Error('Spotify authentication expired');
    }
    
    throw new Error(`Spotify API error: ${error.response?.status || 'Unknown'} ${error.message}`);
  }
}

/**
 * GET /api/spotify/me
 * Get current user's Spotify profile
 */
router.get('/me', requireSpotifyAuth, async (req, res) => {
  try {
    const profile = await makeSpotifyRequest('/me', req.auth.spotifyTokens.access_token);
    
    res.json({
      success: true,
      user: profile,
      message: 'Spotify profile retrieved successfully'
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: error.message
    });
  }
});

/**
 * GET /api/spotify/playlists
 * Get user's playlists
 */
router.get('/playlists', requireSpotifyAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const playlists = await makeSpotifyRequest('/me/playlists', req.auth.spotifyTokens.access_token, {
      params: {
        limit: Math.min(50, parseInt(limit)),
        offset: parseInt(offset)
      }
    });
    
    res.json({
      success: true,
      playlists: playlists.items,
      total: playlists.total,
      next: playlists.next,
      previous: playlists.previous,
      message: 'Playlists retrieved successfully'
    });
  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({
      error: 'Failed to get playlists',
      message: error.message
    });
  }
});

/**
 * GET /api/spotify/playlist/:playlistId
 * Get specific playlist details
 */
router.get('/playlist/:playlistId', requireSpotifyAuth, async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { fields } = req.query;
    
    const playlist = await makeSpotifyRequest(`/playlists/${playlistId}`, req.auth.spotifyTokens.access_token, {
      params: fields ? { fields } : undefined
    });
    
    res.json({
      success: true,
      playlist: playlist,
      message: 'Playlist retrieved successfully'
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({
      error: 'Failed to get playlist',
      message: error.message
    });
  }
});

/**
 * POST /api/spotify/playlists
 * Create new playlist
 */
router.post('/playlists', requireSpotifyAuth, async (req, res) => {
  try {
    const { name, description = '', 'public': isPublic = true } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: 'Missing playlist name',
        message: 'Playlist name is required'
      });
    }
    
    const userId = req.auth.user.id;
    const playlist = await makeSpotifyRequest(`/users/${userId}/playlists`, req.auth.spotifyTokens.access_token, {
      method: 'POST',
      data: {
        name,
        description,
        public: isPublic
      }
    });
    
    res.json({
      success: true,
      playlist: playlist,
      message: 'Playlist created successfully'
    });
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({
      error: 'Failed to create playlist',
      message: error.message
    });
  }
});

/**
 * GET /api/spotify/playback
 * Get current playback state
 */
router.get('/playback', requireSpotifyAuth, async (req, res) => {
  try {
    const playback = await makeSpotifyRequest('/me/player', req.auth.spotifyTokens.access_token);
    
    res.json({
      success: true,
      playback: playback || null,
      message: playback ? 'Playback state retrieved' : 'No active playback'
    });
  } catch (error) {
    console.error('Get playback error:', error);
    res.status(500).json({
      error: 'Failed to get playback state',
      message: error.message
    });
  }
});

/**
 * GET /api/spotify/recently-played
 * Get recently played tracks
 */
router.get('/recently-played', requireSpotifyAuth, async (req, res) => {
  try {
    const { limit = 20, after, before } = req.query;
    
    const params = {
      limit: Math.min(50, parseInt(limit))
    };
    
    if (after) params.after = after;
    if (before) params.before = before;
    
    const recentTracks = await makeSpotifyRequest('/me/player/recently-played', req.auth.spotifyTokens.access_token, {
      params
    });
    
    res.json({
      success: true,
      tracks: recentTracks.items,
      next: recentTracks.next,
      cursors: recentTracks.cursors,
      message: 'Recently played tracks retrieved successfully'
    });
  } catch (error) {
    console.error('Get recently played error:', error);
    res.status(500).json({
      error: 'Failed to get recently played tracks',
      message: error.message
    });
  }
});

/**
 * GET /api/spotify/top/artists
 * Get user's top artists
 */
router.get('/top/artists', requireSpotifyAuth, async (req, res) => {
  try {
    const { time_range = 'medium_term', limit = 20, offset = 0 } = req.query;
    
    const topArtists = await makeSpotifyRequest('/me/top/artists', req.auth.spotifyTokens.access_token, {
      params: {
        time_range,
        limit: Math.min(50, parseInt(limit)),
        offset: parseInt(offset)
      }
    });
    
    res.json({
      success: true,
      artists: topArtists.items,
      total: topArtists.total,
      message: 'Top artists retrieved successfully'
    });
  } catch (error) {
    console.error('Get top artists error:', error);
    res.status(500).json({
      error: 'Failed to get top artists',
      message: error.message
    });
  }
});

/**
 * GET /api/spotify/top/tracks
 * Get user's top tracks
 */
router.get('/top/tracks', requireSpotifyAuth, async (req, res) => {
  try {
    const { time_range = 'medium_term', limit = 20, offset = 0 } = req.query;
    
    const topTracks = await makeSpotifyRequest('/me/top/tracks', req.auth.spotifyTokens.access_token, {
      params: {
        time_range,
        limit: Math.min(50, parseInt(limit)),
        offset: parseInt(offset)
      }
    });
    
    res.json({
      success: true,
      tracks: topTracks.items,
      total: topTracks.total,
      message: 'Top tracks retrieved successfully'
    });
  } catch (error) {
    console.error('Get top tracks error:', error);
    res.status(500).json({
      error: 'Failed to get top tracks',
      message: error.message
    });
  }
});

/**
 * GET /api/spotify/audio-features/:trackIds
 * Get audio features for tracks
 */
router.get('/audio-features/:trackIds', requireSpotifyAuth, async (req, res) => {
  try {
    const { trackIds } = req.params;
    const ids = trackIds.split(',').slice(0, 100); // Limit to 100 tracks
    
    const audioFeatures = await makeSpotifyRequest('/audio-features', req.auth.spotifyTokens.access_token, {
      params: {
        ids: ids.join(',')
      }
    });
    
    res.json({
      success: true,
      audio_features: audioFeatures.audio_features,
      message: 'Audio features retrieved successfully'
    });
  } catch (error) {
    console.error('Get audio features error:', error);
    res.status(500).json({
      error: 'Failed to get audio features',
      message: error.message
    });
  }
});

/**
 * GET /api/spotify/recommendations
 * Get track recommendations
 */
router.get('/recommendations', requireSpotifyAuth, async (req, res) => {
  try {
    const {
      seed_artists,
      seed_genres,
      seed_tracks,
      limit = 20,
      market,
      ...audioFeatures
    } = req.query;
    
    // Validate that at least one seed is provided
    if (!seed_artists && !seed_genres && !seed_tracks) {
      return res.status(400).json({
        error: 'Missing seed data',
        message: 'At least one of seed_artists, seed_genres, or seed_tracks is required'
      });
    }
    
    const params = {
      limit: Math.min(100, parseInt(limit))
    };
    
    if (seed_artists) params.seed_artists = seed_artists;
    if (seed_genres) params.seed_genres = seed_genres;
    if (seed_tracks) params.seed_tracks = seed_tracks;
    if (market) params.market = market;
    
    // Add audio feature parameters
    const audioFeatureParams = [
      'min_acousticness', 'max_acousticness', 'target_acousticness',
      'min_danceability', 'max_danceability', 'target_danceability',
      'min_duration_ms', 'max_duration_ms', 'target_duration_ms',
      'min_energy', 'max_energy', 'target_energy',
      'min_instrumentalness', 'max_instrumentalness', 'target_instrumentalness',
      'min_key', 'max_key', 'target_key',
      'min_liveness', 'max_liveness', 'target_liveness',
      'min_loudness', 'max_loudness', 'target_loudness',
      'min_mode', 'max_mode', 'target_mode',
      'min_popularity', 'max_popularity', 'target_popularity',
      'min_speechiness', 'max_speechiness', 'target_speechiness',
      'min_tempo', 'max_tempo', 'target_tempo',
      'min_time_signature', 'max_time_signature', 'target_time_signature',
      'min_valence', 'max_valence', 'target_valence'
    ];
    
    audioFeatureParams.forEach(param => {
      if (audioFeatures[param] !== undefined) {
        params[param] = audioFeatures[param];
      }
    });
    
    const recommendations = await makeSpotifyRequest('/recommendations', req.auth.spotifyTokens.access_token, {
      params
    });
    
    res.json({
      success: true,
      tracks: recommendations.tracks,
      seeds: recommendations.seeds,
      message: 'Recommendations retrieved successfully'
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      error: 'Failed to get recommendations',
      message: error.message
    });
  }
});

/**
 * GET /api/spotify/search
 * Search for tracks, artists, albums, playlists
 */
router.get('/search', requireSpotifyAuth, async (req, res) => {
  try {
    const { q, type = 'track', limit = 20, offset = 0, market } = req.query;
    
    if (!q) {
      return res.status(400).json({
        error: 'Missing search query',
        message: 'Query parameter "q" is required'
      });
    }
    
    const params = {
      q,
      type,
      limit: Math.min(50, parseInt(limit)),
      offset: parseInt(offset)
    };
    
    if (market) params.market = market;
    
    const searchResults = await makeSpotifyRequest('/search', req.auth.spotifyTokens.access_token, {
      params
    });
    
    res.json({
      success: true,
      results: searchResults,
      message: 'Search completed successfully'
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/spotify/devices
 * Get user's available devices
 */
router.get('/devices', requireSpotifyAuth, async (req, res) => {
  try {
    const devices = await makeSpotifyRequest('/me/player/devices', req.auth.spotifyTokens.access_token);
    
    res.json({
      success: true,
      devices: devices.devices,
      message: 'Devices retrieved successfully'
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      error: 'Failed to get devices',
      message: error.message
    });
  }
});

/**
 * PUT /api/spotify/playback/play
 * Start/resume playback
 */
router.put('/playback/play', requireSpotifyAuth, async (req, res) => {
  try {
    const { device_id, context_uri, uris, offset, position_ms } = req.body;
    
    const data = {};
    if (context_uri) data.context_uri = context_uri;
    if (uris) data.uris = uris;
    if (offset) data.offset = offset;
    if (position_ms) data.position_ms = position_ms;
    
    const endpoint = device_id ? `/me/player/play?device_id=${device_id}` : '/me/player/play';
    
    await makeSpotifyRequest(endpoint, req.auth.spotifyTokens.access_token, {
      method: 'PUT',
      data
    });
    
    res.json({
      success: true,
      message: 'Playback started'
    });
  } catch (error) {
    console.error('Start playback error:', error);
    res.status(500).json({
      error: 'Failed to start playback',
      message: error.message
    });
  }
});

/**
 * PUT /api/spotify/playback/pause
 * Pause playback
 */
router.put('/playback/pause', requireSpotifyAuth, async (req, res) => {
  try {
    const { device_id } = req.body;
    
    const endpoint = device_id ? `/me/player/pause?device_id=${device_id}` : '/me/player/pause';
    
    await makeSpotifyRequest(endpoint, req.auth.spotifyTokens.access_token, {
      method: 'PUT'
    });
    
    res.json({
      success: true,
      message: 'Playback paused'
    });
  } catch (error) {
    console.error('Pause playback error:', error);
    res.status(500).json({
      error: 'Failed to pause playback',
      message: error.message
    });
  }
});

module.exports = router;