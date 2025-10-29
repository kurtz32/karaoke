// DOM elements
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const songSelect = document.getElementById('songSelect');
const lyricsDisplay = document.getElementById('lyricsDisplay');
const scoreElement = document.getElementById('score');
const micBtn = document.getElementById('micBtn');
const micStatus = document.getElementById('micStatus');
const youtubeSearch = document.getElementById('youtubeSearch');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const uploadForm = document.getElementById('uploadForm');

// Variables
let currentSong = null;
let lyricsInterval = null;
let score = 0;
let audioContext = null;
let analyser = null;
let microphone = null;
let pitchDetector = null;
let player = null;
let isYouTubePlaying = false;

// YouTube API callback
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtubePlayer', {
        height: '360',
        width: '640',
        playerVars: {
            'playsinline': 1,
            'modestbranding': 1,
            'rel': 0,
            'showinfo': 0
        },
        events: {
            'onStateChange': onPlayerStateChange,
            'onReady': onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    console.log('YouTube player is ready');
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        isYouTubePlaying = true;
        playPauseBtn.textContent = 'Pause';
    } else if (event.data == YT.PlayerState.PAUSED || event.data == YT.PlayerState.ENDED) {
        isYouTubePlaying = false;
        playPauseBtn.textContent = 'Play';
    }
}

// Initialize app
function init() {
    loadSongs();
    setupEventListeners();
}

// Load songs from backend
async function loadSongs() {
    try {
        const response = await fetch('/api/songs');
        const songs = await response.json();

        songSelect.innerHTML = '<option value="">Select a song</option>';
        songs.forEach(song => {
            const option = document.createElement('option');
            option.value = song.id;
            option.textContent = song.title + (song.artist ? ` - ${song.artist}` : '');
            option.dataset.song = JSON.stringify(song);
            songSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    playPauseBtn.addEventListener('click', togglePlayPause);
    songSelect.addEventListener('change', loadSong);
    micBtn.addEventListener('click', toggleMicrophone);
    audioPlayer.addEventListener('timeupdate', updateLyrics);
    searchBtn.addEventListener('click', searchYouTube);
    youtubeSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchYouTube();
    });
    uploadForm.addEventListener('submit', uploadSong);
}

// Toggle play/pause
function togglePlayPause() {
    if (currentSong && currentSong.youtube_id) {
        // YouTube video
        if (player && typeof player.getPlayerState === 'function') {
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING) {
                player.pauseVideo();
            } else {
                player.playVideo();
            }
        } else {
            console.error('YouTube player not available');
        }
    } else {
        // Audio file
        if (audioPlayer.paused) {
            audioPlayer.play();
            playPauseBtn.textContent = 'Pause';
        } else {
            audioPlayer.pause();
            playPauseBtn.textContent = 'Play';
        }
    }
}

// Load selected song
function loadSong() {
    const songId = songSelect.value;
    if (songId !== '') {
        const option = songSelect.querySelector(`option[value="${songId}"]`);
        currentSong = JSON.parse(option.dataset.song);

        if (currentSong.youtube_id) {
            // Load YouTube video
            document.getElementById('youtubePlayer').style.display = 'block';
            audioPlayer.style.display = 'none';
            if (player && player.loadVideoById) {
                player.loadVideoById(currentSong.youtube_id);
            } else {
                console.error('YouTube player not ready');
            }
        } else {
            // Load audio file
            document.getElementById('youtubePlayer').style.display = 'none';
            audioPlayer.style.display = 'block';
            audioPlayer.src = currentSong.file_path;
        }

        displayLyrics();
    }
}

// Display lyrics
function displayLyrics() {
    lyricsDisplay.innerHTML = '';
    currentSong.lyrics.forEach((line, index) => {
        const lineElement = document.createElement('div');
        lineElement.textContent = line.text;
        lineElement.dataset.index = index;
        lyricsDisplay.appendChild(lineElement);
    });
}

// Update lyrics based on current time
function updateLyrics() {
    if (!currentSong) return;

    let currentTime;
    if (currentSong.youtube_id && player && player.getCurrentTime) {
        currentTime = player.getCurrentTime();
    } else {
        currentTime = audioPlayer.currentTime;
    }

    // For now, we'll use a simple lyrics display without timing
    // In a real app, you'd parse lyrics with timestamps
    if (currentSong.lyrics) {
        displayLyrics();
    }
}

// Display lyrics
function displayLyrics() {
    lyricsDisplay.innerHTML = '';
    if (currentSong && currentSong.lyrics) {
        const lyrics = JSON.parse(currentSong.lyrics);
        lyrics.forEach((line, index) => {
            const lineElement = document.createElement('div');
            lineElement.textContent = line.text;
            lineElement.dataset.index = index;
            lyricsDisplay.appendChild(lineElement);
        });
    } else {
        lyricsDisplay.innerHTML = '<div>No lyrics available</div>';
    }
}

// Toggle microphone
async function toggleMicrophone() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);

            micStatus.textContent = 'Microphone: Enabled';
            micBtn.textContent = 'Disable Microphone';

            // Start pitch detection
            startPitchDetection();
        } catch (error) {
            console.error('Error accessing microphone:', error);
            micStatus.textContent = 'Microphone: Error - ' + error.message;
        }
    } else {
        // Stop microphone
        if (microphone) {
            microphone.disconnect();
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        analyser = null;
        microphone = null;

        micStatus.textContent = 'Microphone: Disabled';
        micBtn.textContent = 'Enable Microphone';

        // Stop pitch detection
        stopPitchDetection();
    }
}

// Search YouTube
async function searchYouTube() {
    const query = youtubeSearch.value.trim();
    if (!query) return;

    try {
        const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
        const videos = await response.json();

        displaySearchResults(videos);
    } catch (error) {
        console.error('Error searching YouTube:', error);
    }
}

// Display search results
function displaySearchResults(videos) {
    searchResults.innerHTML = '';
    videos.forEach(video => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'search-result';
        resultDiv.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}">
            <div>
                <strong>${video.title}</strong>
                <br>
                <small>${video.channelTitle}</small>
            </div>
        `;
        resultDiv.addEventListener('click', () => addYouTubeVideo(video));
        searchResults.appendChild(resultDiv);
    });
}

// Add YouTube video to library
async function addYouTubeVideo(video) {
    try {
        const response = await fetch('/api/youtube/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(video),
        });

        if (response.ok) {
            alert('Video added to your library!');
            loadSongs(); // Refresh the song list
            searchResults.innerHTML = ''; // Clear search results
            youtubeSearch.value = ''; // Clear search input
        } else {
            alert('Error adding video');
        }
    } catch (error) {
        console.error('Error adding YouTube video:', error);
    }
}

// Upload song
async function uploadSong(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('title', e.target.title.value);
    formData.append('artist', e.target.artist.value);
    formData.append('lyrics', e.target.lyrics.value);
    formData.append('song', e.target.song.files[0]);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            alert('Song uploaded successfully!');
            loadSongs(); // Refresh the song list
            e.target.reset(); // Clear the form
        } else {
            alert('Error uploading song');
        }
    } catch (error) {
        console.error('Error uploading song:', error);
    }
}

// Start pitch detection
function startPitchDetection() {
    pitchDetector = setInterval(() => {
        if (analyser) {
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

            // Simple pitch detection (this is a basic implementation)
            const pitch = detectPitch(dataArray, audioContext.sampleRate);

            // Compare with song pitch (simplified)
            if (currentSong && pitch > 0) {
                const expectedPitch = getExpectedPitch(audioPlayer.currentTime);
                const accuracy = calculateAccuracy(pitch, expectedPitch);
                updateScore(accuracy);
            }
        }
    }, 100); // Update every 100ms
}

// Stop pitch detection
function stopPitchDetection() {
    if (pitchDetector) {
        clearInterval(pitchDetector);
        pitchDetector = null;
    }
}

// Simple pitch detection using autocorrelation
function detectPitch(dataArray, sampleRate) {
    // This is a very basic pitch detection algorithm
    // In a real implementation, you'd use a more sophisticated library
    let maxCorrelation = 0;
    let bestOffset = -1;

    for (let offset = 1; offset < dataArray.length / 2; offset++) {
        let correlation = 0;
        for (let i = 0; i < dataArray.length - offset; i++) {
            correlation += dataArray[i] * dataArray[i + offset];
        }
        if (correlation > maxCorrelation) {
            maxCorrelation = correlation;
            bestOffset = offset;
        }
    }

    if (bestOffset > 0) {
        return sampleRate / bestOffset;
    }
    return 0;
}

// Get expected pitch for current time (simplified)
function getExpectedPitch(currentTime) {
    // This is a placeholder - in a real app, you'd have pitch data for each song
    // For now, return a constant pitch
    return 440; // A4 note
}

// Calculate accuracy
function calculateAccuracy(userPitch, expectedPitch) {
    if (expectedPitch === 0) return 0;
    const ratio = userPitch / expectedPitch;
    const cents = 1200 * Math.log2(ratio);
    const accuracy = Math.max(0, 100 - Math.abs(cents));
    return Math.min(accuracy, 100);
}

// Update score
function updateScore(accuracy) {
    score += accuracy * 0.1; // Add points based on accuracy
    scoreElement.textContent = Math.round(score);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);