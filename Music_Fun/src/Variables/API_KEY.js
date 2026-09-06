export const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY
export const API_URL = 'https://www.googleapis.com/youtube/v3/search'
export const VIDEOS_API_URL = 'https://www.googleapis.com/youtube/v3/videos'

localStorage.removeItem('music_library_cache')
localStorage.removeItem('youtube_search_cache')
sessionStorage.removeItem('youtube_quota_error')
