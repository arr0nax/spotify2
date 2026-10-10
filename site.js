(() => {
    const catalog = window.albumCatalog;

    function albumLink(album, className) {
        const link = document.createElement('a');
        link.href = window.albumUrl(album.id);
        link.className = className;
        return link;
    }

    function addCover(container, album) {
        const fallback = document.createElement('span');
        fallback.className = 'cover-fallback';
        fallback.textContent = album.icon || '🎵';
        fallback.setAttribute('aria-hidden', 'true');
        container.append(fallback);
        if (!album.cover) return;

        const image = document.createElement('img');
        image.className = 'cover-art';
        image.src = album.cover;
        image.alt = `${album.title} album cover`;
        image.addEventListener('error', () => image.remove(), { once: true });
        container.append(image);
    }

    // Both pages use the same library links, so newly added albums appear everywhere.
    const library = document.getElementById('albumLibrary');
    if (library) {
        catalog.forEach(album => {
            const link = albumLink(album, 'sidebar-link');
            const cover = document.createElement('span');
            cover.className = 'sidebar-cover';
            addCover(cover, album);
            const title = document.createElement('span');
            title.className = 'sidebar-album-title';
            title.textContent = album.title;
            link.append(cover, title);
            if (new URLSearchParams(location.search).get('id') === album.id ||
                (location.pathname.endsWith('/album.html') && !location.search && album === catalog[0])) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
            library.append(link);
        });
    }

    const grid = document.getElementById('albumGrid');
    if (grid) {
        catalog.forEach(album => {
            const link = albumLink(album, 'music-card');
            const image = document.createElement('div');
            image.className = 'card-image';
            addCover(image, album);
            const info = document.createElement('div');
            info.className = 'card-info';
            const title = document.createElement('div');
            title.className = 'card-title';
            title.textContent = album.title;
            const artist = document.createElement('div');
            artist.className = 'card-artist';
            artist.textContent = album.artist;
            const play = document.createElement('div');
            play.className = 'play-btn';
            play.textContent = '▶';
            info.append(title, artist, play);
            link.append(image, info);
            grid.append(link);
        });
    }

    const input = document.getElementById('searchInput');
    const dropdown = document.getElementById('searchDropdown');
    function search() {
        const query = input.value.trim().toLowerCase();
        const matches = catalog.filter(album =>
            `${album.title} ${album.artist} ${album.tracks.map(track => track.title).join(' ')}`
                .toLowerCase().includes(query));
        dropdown.replaceChildren();
        matches.forEach(album => {
            const link = albumLink(album, 'suggestion-item');
            const icon = document.createElement('div');
            icon.className = 'suggestion-icon';
            icon.textContent = album.icon;
            const text = document.createElement('div');
            text.className = 'suggestion-text';
            const title = document.createElement('div');
            title.className = 'suggestion-title';
            title.textContent = album.title;
            const subtitle = document.createElement('div');
            subtitle.className = 'suggestion-subtitle';
            subtitle.textContent = `Album by ${album.artist}`;
            text.append(title, subtitle);
            link.append(icon, text);
            dropdown.append(link);
        });
        if (!matches.length) {
            const empty = document.createElement('div');
            empty.className = 'suggestion-item';
            empty.textContent = 'No albums found';
            dropdown.append(empty);
        }
        dropdown.classList.add('active');
    }
    input.addEventListener('focus', search);
    input.addEventListener('input', search);
    input.addEventListener('keydown', event => {
        if (event.key === 'Escape') dropdown.classList.remove('active');
        if (event.key === 'Enter') {
            const result = dropdown.querySelector('a');
            if (result) result.click();
        }
    });
    document.addEventListener('click', event => {
        if (!event.target.closest('.search-container')) dropdown.classList.remove('active');
    });
})();