(() => {
    'use strict';
    const byId = id => document.getElementById(id);
    const text = (id, value) => { byId(id).textContent = value; };
    const player = window.musicPlayer;
    let album = null;
    let metadataVersion = 0;
    function element(tag, className, value) {
        const node = document.createElement(tag);
        node.className = className;
        if (value !== undefined) node.textContent = value;
        return node;
    }
    function updateState() {
        if (!album) return;
        document.querySelectorAll('.song-item').forEach((row, index) => {
            const active = player.album === album && player.index === index;
            const playing = active && player.playing;
            row.setAttribute('aria-current', String(active));
            const button = row.querySelector('button');
            button.textContent = playing ? '⏸' : '▶';
            button.setAttribute('aria-label', player.playable(album, index)
                ? `${playing ? 'Pause' : 'Play'} ${album.tracks[index].title}`
                : `${album.tracks[index].title}: Coming soon`);
        });
    }
    document.addEventListener('playerstatechange', updateState);
    // Rendering never changes the player's queue, source, or playback position.
    window.renderAlbum = nextAlbum => {
        const currentMetadataVersion = ++metadataVersion;
        album = nextAlbum;
        if (!album) {
            byId('albumNotFound').hidden = false;
            document.title = 'Album not found - Spotify2';
            return;
        }
        const tracks = album.tracks;
        document.title = `${album.title} - Spotify2`;
        text('albumTitle', album.title);
        text('albumArtist', `By ${album.artist}`);
        text('albumReleaseDate', 'Coming soon');
        window.getAlbumMetadata(album).then(metadata => {
            if (currentMetadataVersion === metadataVersion && album === nextAlbum) {
                text('albumReleaseDate', metadata.releaseDate || 'Coming soon');
            }
        });
        text('albumTrackCount', tracks.length);
        const known = tracks.filter(track => player.validDuration(track.duration));
        const total = known.reduce((sum, track) => sum + track.duration, 0);
        text('albumDuration', !tracks.length ? '0:00' : !known.length ? 'Coming soon'
            : `${player.formatTime(total)}${known.length < tracks.length ? ' known' : ''}`);
        text('albumDescription', album.description || '');
        byId('albumDescription').hidden = !album.description;
        const cover = byId('album-cover');
        const fallback = element('span', '', album.icon || '🎵');
        fallback.setAttribute('role', 'img');
        fallback.setAttribute('aria-label', `${album.title} album artwork`);
        cover.replaceChildren(fallback);
        if (album.cover) {
            const image = document.createElement('img');
            image.alt = `${album.title} album cover`;
            image.src = album.cover;
            image.addEventListener('load', () => fallback.hidden = true, { once: true });
            image.addEventListener('error', () => image.remove(), { once: true });
            cover.append(image);
        }
        const list = byId('trackList');
        tracks.forEach((track, index) => {
            const available = player.playable(album, index);
            const row = element('div', 'song-item');
            row.dataset.trackIndex = String(index);
            row.setAttribute('role', 'group');
            row.setAttribute('aria-label', `${index + 1}. ${track.title}${available ? '' : ': Coming soon'}`);
            row.setAttribute('aria-disabled', String(!available));
            row.tabIndex = available ? 0 : -1;
            const details = element('div', 'song-details');
            details.append(element('div', 'song-title', track.title),
                element('div', 'song-artist', `${track.artist || album.artist}${available ? '' : ' · Coming soon'}`));
            const button = element('button', 'song-play-btn', '▶');
            button.type = 'button';
            button.disabled = !available;
            const activate = () => player.activate(nextAlbum, index);
            button.addEventListener('click', event => { event.stopPropagation(); activate(); });
            row.append(element('div', 'song-number', index + 1), details,
                element('div', 'song-album', album.title),
                element('div', 'song-duration', available
                    ? player.validDuration(track.duration) ? player.formatTime(track.duration) : '—'
                    : 'Coming soon'), button);
            row.addEventListener('click', event => { if (!event.target.closest('a, button')) activate(); });
            row.addEventListener('keydown', event => {
                if (event.target === row && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    activate();
                }
            });
            list.append(row);
        });
        if (!tracks.length) list.append(element('p', '', 'No tracks available yet.'));
        byId('albumPlayBtn').disabled = !tracks.some((track, index) => player.playable(album, index));
        byId('albumPlayBtn').addEventListener('click', () => player.playAlbum(nextAlbum));
        byId('albumHero').hidden = false;
        byId('albumTracks').hidden = false;
        updateState();
    };
})();