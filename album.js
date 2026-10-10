(() => {
    'use strict';

    const byId = id => document.getElementById(id);
    const catalog = Array.isArray(window.albumCatalog) ? window.albumCatalog : [];
    const params = new URLSearchParams(window.location.search);
    const album = params.has('id')
        ? catalog.find(item => item.id === params.get('id'))
        : catalog[0];

    if (!album) {
        byId('albumNotFound').hidden = false;
        document.title = 'Album not found - Spotify2';
        return;
    }

    const tracks = Array.isArray(album.tracks) ? album.tracks : [];
    const playable = index => Boolean(tracks[index] &&
        typeof tracks[index].src === 'string' && tracks[index].src.trim());
    const firstPlayable = tracks.findIndex((track, index) => playable(index));
    const validDuration = value => Number.isFinite(value) && value >= 0;
    const formatTime = seconds => {
        const value = validDuration(seconds) ? Math.floor(seconds) : 0;
        return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
    };
    const text = (id, value) => { byId(id).textContent = value; };

    document.title = `${album.title} - Spotify2`;
    byId('albumCanonical').href = window.albumUrl(album.id);
    text('albumTitle', album.title);
    text('albumArtist', `By ${album.artist}`);
    text('albumReleaseDate', album.releaseDate || 'Coming soon');
    text('albumTrackCount', tracks.length);
    const knownDurations = tracks.filter(track => validDuration(track.duration));
    const totalDuration = knownDurations.reduce((total, track) => total + track.duration, 0);
    text('albumDuration', tracks.length === 0 ? '0:00' : knownDurations.length === 0
        ? 'Coming soon' : `${formatTime(totalDuration)}${knownDurations.length < tracks.length ? ' known' : ''}`);
    text('albumDescription', album.description || '');
    byId('albumDescription').hidden = !album.description;
    document.querySelectorAll('[data-album-buy]').forEach(link => {
        if (album.buyUrl) link.href = album.buyUrl;
        else link.removeAttribute('href');
        link.hidden = !album.buyUrl;
    });

    function renderCover(container) {
        const fallback = () => {
            const icon = document.createElement('span');
            icon.textContent = album.icon || '🎵';
            icon.setAttribute('role', 'img');
            icon.setAttribute('aria-label', `${album.title} album artwork`);
            container.replaceChildren(icon);
        };
        if (!album.cover) {
            fallback();
            return;
        }
        const image = document.createElement('img');
        image.alt = `${album.title} album cover`;
        image.addEventListener('error', fallback, { once: true });
        image.src = album.cover;
        container.replaceChildren(image);
    }
    renderCover(byId('album-cover'));
    renderCover(byId('player-album-art'));

    const audio = byId('audioPlayer');
    const playButton = byId('playBtn');
    const albumPlayButton = byId('albumPlayBtn');
    const previousButton = byId('prevBtn');
    const nextButton = byId('nextBtn');
    const progress = byId('progressBar');
    const volume = byId('volumeSlider');
    const muteButton = byId('muteBtn');
    const list = byId('trackList');
    const rows = [];
    let currentIndex = -1;
    let playRequest = 0;
    let failed = false;

    function adjacent(direction) {
        for (let index = currentIndex + direction; index >= 0 && index < tracks.length; index += direction) {
            if (playable(index)) return index;
        }
        return -1;
    }

    function updateState() {
        const playing = currentIndex >= 0 && !audio.paused && !audio.ended && !failed;
        playButton.textContent = playing ? '⏸' : '▶';
        playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        playButton.disabled = currentIndex < 0;
        previousButton.disabled = currentIndex < 0 || adjacent(-1) < 0;
        nextButton.disabled = currentIndex < 0 || adjacent(1) < 0;
        rows.forEach((row, index) => {
            const active = currentIndex === index;
            row.setAttribute('aria-current', String(active));
            const button = row.querySelector('button');
            button.textContent = active && playing ? '⏸' : '▶';
            button.setAttribute('aria-label', playable(index)
                ? `${active && playing ? 'Pause' : 'Play'} ${tracks[index].title}`
                : `${tracks[index].title}: Coming soon`);
        });
    }

    function updateProgress() {
        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        const time = validDuration(audio.currentTime) ? audio.currentTime : 0;
        const canSeek = currentIndex >= 0 && duration > 0 && !failed;
        byId('progressFill').style.width = `${canSeek ? Math.min(100, Math.max(0, time / duration * 100)) : 0}%`;
        text('currentTime', formatTime(time));
        const catalogDuration = tracks[currentIndex]?.duration;
        text('duration', duration ? formatTime(duration)
            : validDuration(catalogDuration) ? formatTime(catalogDuration) : '0:00');
        progress.setAttribute('aria-valuemax', String(duration));
        progress.setAttribute('aria-valuenow', String(Math.min(duration, time)));
        progress.setAttribute('aria-valuetext', `${formatTime(time)} of ${formatTime(duration)}`);
        progress.setAttribute('aria-disabled', String(!canSeek));
        progress.tabIndex = canSeek ? 0 : -1;
    }

    async function startPlayback() {
        if (!playable(currentIndex)) return;
        const request = ++playRequest;
        failed = false;
        text('playerStatus', `Loading ${tracks[currentIndex].title}…`);
        try {
            await audio.play();
        } catch (error) {
            // Track switches and pauses invalidate previous pending play requests.
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

    function selectTrack(index, autoPlay = true) {
        if (!playable(index)) return;
        ++playRequest;
        audio.pause();
        currentIndex = index;
        failed = false;
        audio.src = tracks[index].src;
        audio.load();
        text('playerTitle', tracks[index].title);
        text('playerArtist', tracks[index].artist || album.artist);
        text('playerStatus', `Ready to play ${tracks[index].title}.`);
        updateState();
        updateProgress();
        if (autoPlay) void startPlayback();
    }

    function togglePlayback() {
        if (!playable(currentIndex)) return;
        if (audio.paused || audio.ended || failed) {
            if (audio.error) selectTrack(currentIndex);
            else void startPlayback();
        } else {
            ++playRequest;
            audio.pause();
        }
    }

    function activateTrack(index) {
        if (!playable(index)) return;
        if (index === currentIndex) togglePlayback();
        else selectTrack(index);
    }

    function element(tag, className, value) {
        const node = document.createElement(tag);
        node.className = className;
        if (value !== undefined) node.textContent = value;
        return node;
    }

    tracks.forEach((track, index) => {
        const available = playable(index);
        const row = element('div', 'song-item');
        row.dataset.trackIndex = String(index);
        row.setAttribute('role', 'group');
        row.setAttribute('aria-label', `${index + 1}. ${track.title}${available ? '' : ': Coming soon'}`);
        row.setAttribute('aria-disabled', String(!available));
        row.tabIndex = available ? 0 : -1;
        const details = element('div', 'song-details');
        details.append(element('div', 'song-title', track.title),
            element('div', 'song-artist', `${track.artist || album.artist}${available ? '' : ' · Coming soon'}`));
        const albumLabel = element('div', 'song-album', album.title);
        const button = element('button', 'song-play-btn', '▶');
        button.type = 'button';
        button.disabled = !available;
        button.addEventListener('click', event => {
            event.stopPropagation();
            activateTrack(index);
        });
        row.append(element('div', 'song-number', index + 1), details, albumLabel,
            element('div', 'song-duration', available
                ? validDuration(track.duration) ? formatTime(track.duration) : '—'
                : 'Coming soon'), button);
        row.addEventListener('click', event => {
            if (!event.target.closest('a, button')) activateTrack(index);
        });
        row.addEventListener('keydown', event => {
            if (event.target === row && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                activateTrack(index);
            }
        });
        rows.push(row);
        list.append(row);
    });
    if (!tracks.length) list.append(element('p', '', 'No tracks available yet.'));

    playButton.addEventListener('click', togglePlayback);
    albumPlayButton.addEventListener('click', () => {
        if (firstPlayable >= 0) selectTrack(firstPlayable);
    });
    previousButton.addEventListener('click', () => selectTrack(adjacent(-1)));
    nextButton.addEventListener('click', () => selectTrack(adjacent(1)));
    byId('showTracksBtn').addEventListener('click', () => {
        byId('albumTracks').scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (rows.length) rows.find(row => row.tabIndex === 0)?.focus({ preventScroll: true });
    });

    audio.addEventListener('play', () => {
        failed = false;
        updateState();
    });
    audio.addEventListener('playing', () => {
        text('playerStatus', `Playing ${tracks[currentIndex].title}.`);
        updateState();
    });
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
        if (next >= 0) selectTrack(next);
        else text('playerStatus', 'Album playback finished.');
    });
    audio.addEventListener('error', () => {
        if (currentIndex < 0) return;
        ++playRequest;
        failed = true;
        audio.pause();
        text('playerStatus', `Unable to load ${tracks[currentIndex].title}. Try again or select another track.`);
        updateState();
        updateProgress();
    });
    ['timeupdate', 'loadedmetadata', 'durationchange', 'emptied'].forEach(event => {
        audio.addEventListener(event, updateProgress);
    });

    function seek(time) {
        if (progress.getAttribute('aria-disabled') === 'true' || !Number.isFinite(time)) return;
        try {
            audio.currentTime = Math.min(audio.duration, Math.max(0, time));
            updateProgress();
        } catch {
            text('playerStatus', 'Seeking is not available yet.');
        }
    }
    progress.addEventListener('click', event => {
        const bounds = progress.getBoundingClientRect();
        if (bounds.width > 0) seek((event.clientX - bounds.left) / bounds.width * audio.duration);
    });
    progress.addEventListener('keydown', event => {
        const positions = { ArrowLeft: audio.currentTime - 5, ArrowRight: audio.currentTime + 5,
            Home: 0, End: audio.duration };
        if (Object.prototype.hasOwnProperty.call(positions, event.key)) {
            event.preventDefault();
            seek(positions[event.key]);
        }
    });
    volume.addEventListener('input', () => {
        const value = Number(volume.value);
        if (Number.isFinite(value)) audio.volume = Math.min(1, Math.max(0, value / 100));
    });
    muteButton.addEventListener('click', () => { audio.muted = !audio.muted; });
    audio.addEventListener('volumechange', () => {
        const muted = audio.muted || audio.volume === 0;
        muteButton.textContent = muted ? '🔇' : '🔊';
        muteButton.setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute');
        muteButton.setAttribute('aria-pressed', String(audio.muted));
        volume.value = String(Math.round(audio.volume * 100));
    });
    audio.volume = Number(volume.value) / 100;
    albumPlayButton.disabled = firstPlayable < 0;
    volume.disabled = firstPlayable < 0;
    muteButton.disabled = firstPlayable < 0;
    byId('showTracksBtn').disabled = tracks.length === 0;
    byId('albumHero').hidden = false;
    byId('albumTracks').hidden = false;
    byId('albumPlayer').hidden = false;
    if (firstPlayable >= 0) selectTrack(firstPlayable, false);
    else {
        text('playerArtist', album.artist);
        text('playerStatus', tracks.length ? 'Coming soon — no playable tracks yet.' : 'No tracks available yet.');
        updateState();
        updateProgress();
    }
})();