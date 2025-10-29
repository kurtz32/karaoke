require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Database setup
const db = new sqlite3.Database('./karaoke.db');

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    artist TEXT,
    file_path TEXT,
    youtube_id TEXT,
    lyrics TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Routes

// Get all songs
app.get('/api/songs', (req, res) => {
  db.all('SELECT * FROM songs ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Upload song file
app.post('/api/upload', upload.single('song'), (req, res) => {
  const { title, artist, lyrics } = req.body;
  const filePath = req.file.path;

  db.run('INSERT INTO songs (title, artist, file_path, lyrics) VALUES (?, ?, ?, ?)',
    [title, artist, filePath, lyrics], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Song uploaded successfully' });
    });
});

// Search YouTube
app.get('/api/youtube/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter required' });
  }

  try {
    // Note: You'll need to get a YouTube Data API key
    const API_KEY = process.env.YOUTUBE_API_KEY;
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: {
        part: 'snippet',
        q: query + ' karaoke',
        type: 'video',
        key: API_KEY,
        maxResults: 10
      }
    });

    const videos = response.data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.default.url,
      channelTitle: item.snippet.channelTitle
    }));

    res.json(videos);
  } catch (error) {
    console.error('YouTube API error:', error);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Add YouTube video to database
app.post('/api/youtube/add', (req, res) => {
  const { youtubeId, title, channelTitle } = req.body;

  db.run('INSERT INTO songs (title, artist, youtube_id) VALUES (?, ?, ?)',
    [title, channelTitle, youtubeId], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'YouTube video added successfully' });
    });
});

// Get lyrics for a song (placeholder - in real app, you'd integrate with lyrics API)
app.get('/api/lyrics/:songId', (req, res) => {
  const songId = req.params.songId;
  db.get('SELECT lyrics FROM songs WHERE id = ?', [songId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ lyrics: row ? row.lyrics : null });
  });
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});