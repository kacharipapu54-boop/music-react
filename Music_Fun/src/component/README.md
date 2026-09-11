# Music React — Premium UI Upgrade

## Replace these files

Copy these into the same locations in your project:

- `App.tsx`
- `index.css`
- `favorite.jsx`
- `favorite.css`
- `Components/home.jsx`
- `Components/home.css`
- `Components/Music_card.jsx`
- `Components/Music_card.css`
- `Components/musicList.jsx`
- `Components/musicList.css`
- `services/youtubeApi.js`
- `services/youtubeCache.js`

Keep your existing `.env.local`:

```env
VITE_YOUTUBE_API_KEY=your_key_here
```

## What changed

- Premium dark music-app visual system
- Responsive layout from 320px phones through large desktop
- 2-column phone card layout and 1-column very-small-phone fallback
- Responsive search/results toolbar
- Mobile-safe floating player using `env(safe-area-inset-bottom)`
- Skeleton loading cards
- Better empty/error states
- Better card hover/focus states
- Improved favorites page
- Search filtering for Shorts/reactions/trailers/podcasts/etc.
- YouTube category + embeddable + syndicated filtering
- Minimum 2-minute track filter
- YouTube video status check for non-embeddable videos
- One shared YouTube API service instead of duplicate search logic
- 12-hour localStorage search cache
- Duplicate request protection with pending-search cache
- Removed the misleading "Background play" switch
- Favorites persist in localStorage
- Auto-next remains supported through the YouTube IFrame API

## Important

This still uses YouTube's embedded player. It does NOT bypass YouTube restrictions and does not guarantee background/locked-screen playback.

Also, the browser-visible `VITE_YOUTUBE_API_KEY` is still a client-side key. For production, move YouTube API calls to a Vercel server/API route and keep the key server-side.
