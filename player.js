(() => {
    'use strict';
    // This element lives outside the views and is never replaced on navigation.
    if (!document.getElementById('audioPlayer')) {
        document.body.insertAdjacentHTML('beforeend', `
            <audio id="audioPlayer" preload="metadata" hidden></audio>
            <div class="player" id="albumPlayer" role="region" aria-label="Audio player" hidden>
                <div class="player-content">
                    <div class="player-song-info">
                        <div class="player-album-art" id="player-album-art">♪</div>
                        <div class="player-song-details"><h4 id="playerTitle">Choose a track</h4><p id="playerArtist"></p></div>
                    </div>
                    <div class="player-controls">
                        <div class="controls-buttons">
                            <button type="button" class="control-btn" id="prevBtn" aria-label="Previous track" disabled>⏮️</button>
                            <button type="button" class="control-btn play-pause-btn" id="playBtn" aria-label="Play" disabled>▶</button>
                            <button type="button" class="control-btn" id="nextBtn" aria-label="Next track" disabled>⏭️</button>
                        </div>
                        <div class="progress-bar" id="progressBar" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-disabled="true" tabindex="-1"><div class="progress-fill" id="progressFill"></div></div>
                        <div class="time-display"><span id="currentTime">0:00</span><span id="duration">0:00</span></div>
                        <p id="playerStatus" role="status" aria-live="polite" aria-atomic="true"></p>
                    </div>
                    <div class="player-right">
                        <div class="volume-control">
                            <button type="button" class="control-btn" id="muteBtn" aria-label="Mute" aria-pressed="false">🔊</button>
                            <input type="range" id="volumeSlider" class="volume-slider" min="0" max="100" value="70" aria-label="Volume">
                        </div>
                        <button type="button" class="control-btn" id="showTracksBtn" aria-label="Show playing album" disabled>≡</button>
                    </div>
                </div>
            </div>`);
    }
    const byId = id => document.getElementById(id);
    const text = (id, value) => { byId(id).textContent = value; };
    const audio = byId('audioPlayer');
    const progress = byId('progressBar');
    const volume = byId('volumeSlider');
    const validDuration = value => Number.isFinite(value) && value >= 0;
    const formatTime = seconds => {
        const value = validDuration(seconds) ? Math.floor(seconds) : 0;
        return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
    };
    const playable = (album, index) => {
        const src = album?.tracks?.[index]?.src;
        return typeof src === 'string' && Boolean(src.trim());
    };
    let album = null;
    let currentIndex = -1;
    let playRequest = 0;
    let failed = false;
    const track = () => album?.tracks[currentIndex];

    function adjacent(direction) {
        for (let index = currentIndex + direction; index >= 0 && index < (album?.tracks.length || 0); index += direction) {
            if (playable(album, index)) return index;
        }
        return -1;
    }
    function updateState() {
        const playing = currentIndex >= 0 && !audio.paused && !audio.ended && !failed;
        // An empty player takes no space; paused or failed tracks keep their controls.
        byId('albumPlayer').hidden = currentIndex < 0;
        text('playBtn', playing ? '⏸' : '▶');
        byId('playBtn').setAttribute('aria-label', playing ? 'Pause' : 'Play');
        byId('playBtn').disabled = currentIndex < 0;
        byId('prevBtn').disabled = currentIndex < 0 || adjacent(-1) < 0;
        byId('nextBtn').disabled = currentIndex < 0 || adjacent(1) < 0;
        byId('showTracksBtn').disabled = !album;
        document.dispatchEvent(new CustomEvent('playerstatechange'));
    }
    function updateProgress() {
        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        const time = validDuration(audio.currentTime) ? audio.currentTime : 0;
        const canSeek = currentIndex >= 0 && duration > 0 && !failed;
        byId('progressFill').style.width = `${canSeek ? Math.min(100, Math.max(0, time / duration * 100)) : 0}%`;
        text('currentTime', formatTime(time));
        text('duration', formatTime(duration || track()?.duration));
        progress.setAttribute('aria-valuemax', String(duration));
        progress.setAttribute('aria-valuenow', String(Math.min(duration, time)));
        progress.setAttribute('aria-valuetext', `${formatTime(time)} of ${formatTime(duration)}`);
        progress.setAttribute('aria-disabled', String(!canSeek));
        progress.tabIndex = canSeek ? 0 : -1;
    }
    async function startPlayback() {
        if (!playable(album, currentIndex)) return;
        const request = ++playRequest;
        failed = false;
        text('playerStatus', `Loading ${track().title}…`);
        try { await audio.play(); }
        catch (error) {
            if (request !== playRequest) return;
            failed = true;
            audio.pause();
            text('playerStatus', error.name === 'NotAllowedError'
                ? 'Playback was blocked by the browser. Press Play to try again.'
                : 'Unable to play this track. Try again or select another track.');
            updateState();
            updateProgress();
        }
    }
    function selectTrack(nextAlbum, index) {
        if (!playable(nextAlbum, index)) return;
        ++playRequest;
        audio.pause();
        album = nextAlbum;
        currentIndex = index;
        failed = false;
        audio.src = track().src;
        audio.load();
        text('playerTitle', track().title);
        text('playerArtist', track().artist || album.artist);
        const cover = byId('player-album-art');
        cover.textContent = album.icon || '♪';
        if (album.cover) {
            const image = document.createElement('img');
            image.alt = `${album.title} album cover`;
            image.src = album.cover;
            image.addEventListener('error', () => image.remove(), { once: true });
            cover.append(image);
        }
        updateState();
        updateProgress();
        void startPlayback();
    }
    function togglePlayback() {
        if (!playable(album, currentIndex)) return;
        if (audio.paused || audio.ended || failed) {
            if (audio.error) selectTrack(album, currentIndex);
            else void startPlayback();
        } else { ++playRequest; audio.pause(); }
    }
    window.musicPlayer = {
        playable, formatTime, validDuration,
        get album() { return album; },
        get index() { return currentIndex; },
        get playing() { return currentIndex >= 0 && !audio.paused && !audio.ended && !failed; },
        playAlbum(nextAlbum) {
            const index = nextAlbum.tracks.findIndex((item, i) => playable(nextAlbum, i));
            selectTrack(nextAlbum, index);
        },
        activate(nextAlbum, index) {
            if (album === nextAlbum && currentIndex === index) togglePlayback();
            else selectTrack(nextAlbum, index);
        }
    };
    byId('playBtn').addEventListener('click', togglePlayback);
    byId('prevBtn').addEventListener('click', () => selectTrack(album, adjacent(-1)));
    byId('nextBtn').addEventListener('click', () => selectTrack(album, adjacent(1)));
    byId('showTracksBtn').addEventListener('click', () => {
        if (!album) return;
        window.navigateTo(`${window.albumUrl(album.id)}#albumTracks`);
        document.querySelector('.song-item[aria-current="true"]')?.focus({ preventScroll: true });
    });
    audio.addEventListener('play', () => { failed = false; updateState(); });
    audio.addEventListener('playing', () => { text('playerStatus', `Playing ${track().title}.`); updateState(); });
    audio.addEventListener('pause', () => {
        updateState();
        if (!failed && !audio.ended && currentIndex >= 0) text('playerStatus', 'Paused.');
    });
    audio.addEventListener('waiting', () => {
        if (!audio.paused && !failed) text('playerStatus', 'Buffering…');
    });
    audio.addEventListener('ended', () => {
        updateState();
        const next = adjacent(1);
        if (next >= 0) selectTrack(album, next);
        else text('playerStatus', 'Album playback finished.');
    });
    audio.addEventListener('error', () => {
        if (currentIndex < 0) return;
        ++playRequest;
        failed = true;
        audio.pause();
        text('playerStatus', `Unable to load ${track().title}. Try again or select another track.`);
        updateState();
        updateProgress();
    });
    ['timeupdate', 'loadedmetadata', 'durationchange', 'emptied'].forEach(event => audio.addEventListener(event, updateProgress));
    function seek(time) {
        if (progress.getAttribute('aria-disabled') === 'true' || !Number.isFinite(time)) return;
        try {
            audio.currentTime = Math.min(audio.duration, Math.max(0, time));
            updateProgress();
        } catch { text('playerStatus', 'Seeking is not available yet.'); }
    }
    progress.addEventListener('click', event => {
        const bounds = progress.getBoundingClientRect();
        if (bounds.width > 0) seek((event.clientX - bounds.left) / bounds.width * audio.duration);
    });
    progress.addEventListener('keydown', event => {
        const positions = { ArrowLeft: audio.currentTime - 5, ArrowRight: audio.currentTime + 5, Home: 0, End: audio.duration };
        if (Object.prototype.hasOwnProperty.call(positions, event.key)) { event.preventDefault(); seek(positions[event.key]); }
    });
    volume.addEventListener('input', () => { audio.volume = Number(volume.value) / 100; });
    byId('muteBtn').addEventListener('click', () => { audio.muted = !audio.muted; });
    audio.addEventListener('volumechange', () => {
        text('muteBtn', audio.muted || audio.volume === 0 ? '🔇' : '🔊');
        byId('muteBtn').setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute');
        byId('muteBtn').setAttribute('aria-pressed', String(audio.muted));
        volume.value = String(Math.round(audio.volume * 100));
    });
    audio.volume = Number(volume.value) / 100;
    volume.disabled = false;
    byId('muteBtn').disabled = false;
    text('playerTitle', 'Choose a track');
    text('playerStatus', 'Pick a song from an album to start listening.');
    updateState();
    updateProgress();
    new ResizeObserver(entries => {
        document.documentElement.style.setProperty('--player-height', `${entries[0].target.getBoundingClientRect().height}px`);
    }).observe(byId('albumPlayer'));
})();