# Features Research: Apple Music API

## Executive Summary

Apple Music API provides library-based access to user's music data but **lacks a direct equivalent to Spotify's "top artists" endpoint**. The app will need to rely on the user's library content instead of algorithmically-determined listening preferences.

**Key Finding**: Apple Music API is fundamentally **library-focused** rather than **listening-history-focused**. This is a significant architectural difference from Spotify.

---

## User Data Endpoints

### Library Artists
- **Endpoint**: `GET https://api.music.apple.com/v1/me/library/artists`
- **Purpose**: Fetch all artists in the user's library (alphabetically ordered)
- **Parameters**:
  - `limit`: Number of resources to return (default varies, max appears to be 100 per request)
  - `offset`: Starting position for pagination
  - `include`: Comma-separated relationships to include (e.g., `catalog` to get catalog artist IDs)
- **Response**: Returns `library-artists` resources with library-specific IDs (format: `r.FCwruQb`)
- **Note**: Library artist IDs are **different** from catalog artist IDs and cannot be used interchangeably

**Official Documentation**: [Get All Library Artists](https://developer.apple.com/documentation/applemusicapi/get-all-library-artists)

### Library Albums
- **Endpoint**: `GET https://api.music.apple.com/v1/me/library/albums`
- **Purpose**: Fetch all albums in the user's library (alphabetically ordered)
- **Parameters**:
  - `limit`: Max resources per request (e.g., 25, 50, 100)
  - `offset`: Pagination offset
  - `include`: Include relationships (`catalog`, `artists`, `tracks`)
  - `extend`: Extended attributes (`editorialNotes`)
- **Example**: `https://api.music.apple.com/v1/me/library/albums?include=catalog,artists&limit=50&offset=0`
- **Response**: Returns `library-albums` resources with library-specific IDs

**Official Documentation**: [Get All Library Albums](https://developer.apple.com/documentation/applemusicapi/get-all-library-albums)

### Recently Played
- **Endpoint**: `GET https://api.music.apple.com/v1/me/recent/played/tracks`
- **Purpose**: Get songs the user recently played
- **Limitations**:
  - **Maximum 50 resources** total (not per request)
  - **10 resources per request** maximum (limit parameter capped at 10)
  - Use `offset` values: 0, 10, 20, 30, 40 to access all 50
  - Returns **unique songs** (no duplicates), not chronological play history
  - **No timestamp data** for when songs were played
- **Parameters**:
  - `limit`: Max 10 per request
  - `offset`: Pagination (increments of 10)
- **Use Case**: Limited - provides recent variety but not listening frequency

**Official Documentation**: [Get Recently Played Tracks](https://developer.apple.com/documentation/applemusicapi/get_recently_played_tracks)

### Heavy Rotation (Experimental/Unreliable)
- **Endpoint**: `GET https://api.music.apple.com/v1/me/history/heavy-rotation`
- **Status**: Reported to return **empty arrays** in practice
- **Note**: Developers report this endpoint is non-functional or requires specific conditions
- **Conclusion**: **Not reliable** for production use

---

## Spotify Equivalent Mapping

| Spotify Endpoint | Apple Music Equivalent | Notes |
|------------------|------------------------|-------|
| `GET /v1/me/top/artists?limit=50` | ❌ **No direct equivalent** | Apple Music has no "top artists by listening patterns" |
| | ✅ `GET /v1/me/library/artists` | **Fallback**: All artists in user's library (not ranked by listening) |
| | ⚠️ `GET /v1/me/recent/played/tracks` | **Limited**: Max 50 unique songs (no artist aggregation, no frequency data) |
| `GET /v1/artists/{id}/albums` | ✅ `GET /v1/catalog/{storefront}/artists/{id}/albums` | Requires **catalog artist ID**, not library ID |
| (Album metadata) | ✅ Same structure | Both APIs provide: name, release_date, images, external_urls |
| (Artist images) | ✅ Similar structure | Apple: `artwork.url` (templated), Spotify: `images[]` array |

### Critical Difference: Top Artists vs Library Artists

**Spotify**: `/v1/me/top/artists` returns the user's **most-listened-to artists** algorithmically determined by listening patterns (play count, recency, time spent listening).

**Apple Music**: `/v1/me/library/artists` returns **all artists in the user's library**, regardless of listening frequency. No algorithmic ranking.

**Impact**: Apple Music integration will show anniversaries/releases for **all saved artists**, not just frequently-played ones. This could result in:
- More artists displayed (potentially overwhelming)
- Less personalized (includes saved-but-rarely-played artists)
- Different user experience from Spotify version

---

## Library Access

### Authentication Flow
Apple Music API requires **two tokens**:

1. **Developer Token** (required for all requests)
   - JWT-formatted token signed with your private key
   - Generated using Apple Music private key from Developer Portal
   - Identifies your app as a trusted developer
   - **Not** an OAuth flow - uses cryptographic signing
   - Documentation: [Generating Developer Tokens](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens)

2. **Music User Token** (required for user-specific data)
   - Authorizes access to specific user's library and personal data
   - Obtained via MusicKit authorization flow
   - Different from "Sign in with Apple" tokens (cannot be interchanged)
   - Documentation: [User Authentication for MusicKit](https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit)

**Headers Required**:
```
Authorization: Bearer {developer_token}
Music-User-Token: {music_user_token}
```

### Catalog vs Library IDs

**Critical Concept**: Apple Music separates library and catalog identifiers:
- **Library IDs**: User-specific (format: `r.FCwruQb`), deleted when removed from library, regenerated if re-added
- **Catalog IDs**: Global Apple Music catalog identifiers (format: standard ID)
- **Cannot be used interchangeably**: Library artist ID ≠ Catalog artist ID

### Getting Catalog Data from Library Resources

To fetch albums for a library artist, you need the **catalog artist ID**:

**Option 1: Include catalog relationship**
```
GET /v1/me/library/artists/{id}?include=catalog
```
Returns the library artist **with** embedded catalog artist resource.

**Option 2: Relate to catalog**
```
GET /v1/me/library/artists/{id}?relate=catalog
```
Returns library artist **plus** catalog artist ID reference.

**Option 3: Direct catalog relationship**
```
GET /v1/me/library/artists/{id}/catalog
```
Returns **only** the catalog artist resource.

**Then fetch albums**:
```
GET /v1/catalog/{storefront}/artists/{catalog_id}/albums?include_groups=album&limit=50
```

Documentation: [Get a Catalog Artist's Relationship](https://developer.apple.com/documentation/applemusicapi/fetch-a-relationship-on-this-resource-by-name-5akdm)

---

## Listening History

### What's Available
- **Recently Played**: Up to 50 unique tracks (via `/v1/me/recent/played/tracks`)
- **Heavy Rotation**: Unreliable/non-functional in practice

### What's NOT Available
- ❌ Top artists by listening frequency
- ❌ Top albums by listening frequency
- ❌ Play count for artists/albums
- ❌ Time spent listening to artists
- ❌ Listening history timestamps
- ❌ Duplicate plays (recently played shows unique songs only)
- ❌ Long-term listening statistics

### Apple Music Replay (Consumer Feature)
Apple Music provides **Apple Music Replay** to end users showing:
- Top songs, albums, artists
- Monthly and annual statistics
- Based on play count and listening time

**However**: This data is **not exposed via API** for third-party apps. It's a consumer-facing feature only.

### Why This Matters
The current Spotify implementation uses `/v1/me/top/artists?limit=50` to get the user's **50 most-listened-to artists**. Apple Music has no equivalent API endpoint, meaning:

1. **Cannot replicate exact Spotify behavior** (top artists by listening patterns)
2. **Must use library artists instead** (all saved artists, no ranking)
3. **Different user expectations** (Apple Music users will see ALL their library artists, not just top 50)

---

## Limitations

### 1. No "Top Artists" Endpoint
**Biggest Gap**: No algorithmic ranking of artists by listening patterns. Must use entire library instead.

### 2. Recently Played Constraints
- Hard cap of **50 unique resources** (total, not per request)
- **10 resources per request** maximum
- No timestamps for when resources were played
- No duplicate entries (can't track multiple plays of same song)
- Not useful for determining "top artists"

### 3. Library vs Catalog Separation
- Library IDs cannot be used with catalog endpoints
- Requires additional API call to map library artist → catalog artist → albums
- More complex data flow than Spotify

### 4. Authentication Complexity
- Requires both Developer Token (JWT signing) and Music User Token
- Developer Token requires private key management
- More complex setup than Spotify OAuth 2.0 with PKCE

### 5. Recent API Issues (2026)
- Developers reporting **403 authentication errors** on library endpoints
- Possible stability issues with `/v1/me/library/artists` endpoint
- May indicate ongoing API changes or issues

Source: [Apple Music API Forums - 403 errors](https://developer.apple.com/forums/tags/apple-music-api)

### 6. Storefront Requirement
- Catalog requests require `{storefront}` parameter (e.g., `us`, `gb`)
- Must determine user's storefront (country) before making catalog requests
- Adds complexity to API integration

---

## Rate Limits

### Official Limits (Unconfirmed)
Apple does **not clearly document** rate limits in their public API documentation. Based on third-party sources and developer reports:

- **General API**: ~20 requests/second/user (unconfirmed)
- **Music Analytics API**: 600 queries/minute (confirmed for analytics, not MusicKit)
- **No rate limit headers**: Apple Music API responses don't include rate limit info in headers

Source: [Does Apple Music have an API?](https://musicfetch.io/services/apple-music/api)

### Pagination Best Practices
- **Use `next` link from responses** for pagination (don't calculate your own offset)
- Prevents duplicate results and invalid location errors
- Example response structure includes `next` URL for next page

### Library Endpoints
- Default limit appears to be **100 resources** for library requests
- Can specify smaller limits (25, 50, etc.)
- Use `offset` for pagination

### Recently Played Specific
- **Hard cap**: 50 total resources
- **Per request**: Max 10 resources
- **Pagination**: offset=0, 10, 20, 30, 40 (5 requests to get all 50)

---

## Data Format Differences from Spotify

### Artist Images
**Spotify**:
```json
"images": [
  {"url": "https://...", "height": 640, "width": 640},
  {"url": "https://...", "height": 320, "width": 320}
]
```

**Apple Music**:
```json
"artwork": {
  "url": "https://is1-ssl.mzstatic.com/image/.../source/{w}x{h}bb.jpg",
  "width": 640,
  "height": 640
}
```
Note: Apple uses **templated URLs** where `{w}` and `{h}` are placeholders.

### Album Release Dates
Both APIs provide:
- `release_date`: ISO date string (YYYY-MM-DD)
- `release_date_precision`: "day", "month", or "year"

**Compatible**: Same filtering logic can be reused.

### External URLs
**Spotify**: `external_urls.spotify`
**Apple Music**: `url` (direct link to Apple Music resource)

---

## Recommended Implementation Strategy

### Approach 1: Library-Based (Realistic)
1. Fetch all library artists via `/v1/me/library/artists?include=catalog`
2. For each library artist, get catalog ID from `catalog` relationship
3. Fetch albums for catalog artist via `/v1/catalog/{storefront}/artists/{id}/albums`
4. Filter albums by release date (reuse existing logic)
5. Display all artists with matching albums

**Pros**:
- Uses available API endpoints
- Similar data structure to Spotify
- Reuses date filtering logic

**Cons**:
- Shows ALL library artists (not just top 50)
- Less personalized than Spotify version
- More API calls required (library → catalog mapping)

### Approach 2: Hybrid (Limited Personalization)
1. Use `/v1/me/recent/played/tracks` to get 50 recent songs
2. Extract unique artists from tracks
3. Manually aggregate to find most frequent artists
4. Fetch library data for those artists
5. Get catalog IDs and albums

**Pros**:
- Some level of "recency" personalization
- Closer to Spotify's "top artists" concept

**Cons**:
- Max 50 songs → fewer artists than Spotify's 50
- No frequency data (can't rank by listening)
- Multiple API calls
- Complex aggregation logic

### Approach 3: User Education (Transparent)
Present Apple Music integration differently:
- **Spotify**: "Your Top 50 Artists' Album Anniversaries"
- **Apple Music**: "Album Anniversaries from Your Library"

Set user expectations that Apple Music shows library-based data, not listening-based.

---

## Quality Gate Checklist

- [x] API endpoints verified against official Apple Music API docs
- [x] Clear mapping to Spotify equivalents where possible
- [x] Gaps and limitations explicitly noted
- [x] Authentication requirements documented
- [x] Rate limits researched (with caveats about documentation gaps)
- [x] Data format differences identified
- [x] Implementation strategies proposed

---

## Sources

- [Apple Music API | Apple Developer Documentation](https://developer.apple.com/documentation/applemusicapi)
- [Get All Library Artists | Apple Developer Documentation](https://developer.apple.com/documentation/applemusicapi/get-all-library-artists)
- [Get All Library Albums | Apple Developer Documentation](https://developer.apple.com/documentation/applemusicapi/get-all-library-albums)
- [Get Recently Played Tracks | Apple Developer Documentation](https://developer.apple.com/documentation/applemusicapi/get_recently_played_tracks)
- [Generating Developer Tokens | Apple Developer Documentation](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens)
- [User Authentication for MusicKit | Apple Developer Documentation](https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit)
- [Get a Catalog Artist's Relationship | Apple Developer Documentation](https://developer.apple.com/documentation/applemusicapi/fetch-a-relationship-on-this-resource-by-name-5akdm)
- [Apple Music API fetch more than 10 recently played songs | Apple Developer Forums](https://developer.apple.com/forums/thread/669720)
- [MusicKit - Access user's recently played music | Apple Developer Forums](https://developer.apple.com/forums/thread/696453)
- [Music Kit API library ID into catalog | Apple Developer Forums](https://developer.apple.com/forums/thread/101328)
- [Does Apple Music have an API? | Musicfetch](https://musicfetch.io/services/apple-music/api)
- [(Failed) trying to get recently played songs from Apple Music API | DEV Community](https://dev.to/jurooravec/failed-trying-to-get-recently-played-songs-from-apple-music-api-44im)
- [Spotify API Alternatives - Best Music APIs | Zuplo](https://zuplo.com/blog/2024/12/02/spotify-api-alternatives)
- [Displaying listening data from Apple Music using MusicKit.js | Cory Dransfeldt](https://www.coryd.dev/posts/2023/displaying-listening-data-from-apple-music-using-musickitjs)

---

## Additional Notes

### Recent Issues (2026)
Developers have reported **403 Invalid Authentication** errors on `/v1/me/library/artists` endpoint as of late January 2026. Monitor Apple Developer Forums for updates.

### Testing Considerations
- Requires Apple Developer Program membership ($99/year)
- Requires users to have active Apple Music subscription
- Testing with different storefronts (US, UK, etc.)
- Library content varies widely by user

### Future API Improvements to Watch
Apple may eventually add:
- Top artists/albums endpoints (similar to Spotify)
- Better listening history access
- Rate limit documentation
- Improved heavy-rotation endpoint

Monitor WWDC announcements and [MusicKit documentation](https://developer.apple.com/musickit/) for updates.
