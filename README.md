# Karaoke Scoring App

A full-stack karaoke application with real-time voice scoring, YouTube integration, and file upload capabilities.

## Features

- Real-time voice pitch detection and scoring
- YouTube video search and integration
- Audio file upload and management
- Lyrics display
- SQLite database for storing songs and videos
- Responsive web interface

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up YouTube API key:
   - Get a YouTube Data API v3 key from Google Cloud Console
   - Set the environment variable: `YOUTUBE_API_KEY=AIzaSyCZ6WHNJzNyEz01RMdlgCCQyG36j2ijSp0`

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Search YouTube**: Enter a song title in the search box to find karaoke videos
2. **Add Videos**: Click on search results to add YouTube videos to your library
3. **Upload Songs**: Use the upload form to add your own audio files
4. **Sing Along**: Select a song, enable your microphone, and start singing!
5. **Real-time Scoring**: Your pitch accuracy is scored in real-time

## API Endpoints

- `GET /api/songs` - Get all songs
- `POST /api/upload` - Upload a song file
- `GET /api/youtube/search?q=query` - Search YouTube
- `POST /api/youtube/add` - Add YouTube video to library
- `GET /api/lyrics/:songId` - Get lyrics for a song

## Technologies Used

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: SQLite
- APIs: YouTube Data API v3
- Audio Processing: Web Audio API

## Notes

- The pitch detection is a basic implementation using autocorrelation
- For production use, consider integrating a more sophisticated pitch detection library
- YouTube API requires an API key and has usage limits
- Microphone access requires HTTPS in production