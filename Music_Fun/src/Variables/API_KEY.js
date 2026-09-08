export const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY
export const API_KEYS = [
	API_KEY,
	...(import.meta.env.VITE_YOUTUBE_API_KEYS || '').split(','),
].map((key) => key.trim()).filter(Boolean)
export const API_URL = 'https://www.googleapis.com/youtube/v3/search'
export const VIDEOS_API_URL = 'https://www.googleapis.com/youtube/v3/videos'