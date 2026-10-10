(async () => {
    const catalog = window.albumCatalog;
    const content = document.querySelector('.content');

    // Both entry URLs mount the same views without replacing the audio player.
    // The fallback is only needed when a local-file album entry cannot fetch HTML.
    let homeView = `
        <section class="hero">
            <h1 tabindex="-1">Your Music, Your Way</h1>
            <p>Listen to Nobody Like You by Horsebag and FOR RENT by Dwelling Unit.</p>
            <div class="cta-buttons">
                <a target="_blank" rel="noopener noreferrer" data-album-buy hidden class="btn-primary">Buy album</a>
                <a target="_blank" rel="noopener noreferrer" data-album-buy hidden class="btn-secondary">Buy album</a>
            </div>
        </section>
        <section class="featured" id="albums"><h2 class="section-title">Albums</h2><div class="music-grid" id="albumGrid"></div></section>`;
    let homeTitle = document.title;
    if (document.getElementById('albumGrid')) {
        // Capture the authored homepage before routing replaces its content.
        homeView = content.innerHTML;
    } else {
        try {
            const response = await fetch('index.html', { cache: 'no-cache' });
            if (!response.ok) throw new Error(`Homepage request failed: ${response.status}`);
            const homeDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
            const homeContent = homeDocument.querySelector('.content');
            if (!homeContent) throw new Error('Homepage content is missing');
            homeView = homeContent.innerHTML;
            homeTitle = homeDocument.title;
        } catch (error) {
            console.warn('Could not load the authored homepage; using fallback.', error);
            homeTitle = 'Spotify2 | Horsebag & Dwelling Unit';
        }
    }
    const albumView = `
        <section id="albumNotFound" hidden><h1 tabindex="-1">Album not found</h1><p>This album is not available. <a href="index.html">Return Home</a>.</p></section>
        <section class="album-hero" id="albumHero" hidden>
            <div class="album-cover" id="album-cover"></div>
            <div class="album-info">
                <div class="album-type">Album</div><h1 class="album-title" id="albumTitle" tabindex="-1"></h1>
                <div class="album-artist" id="albumArtist"></div>
                <div class="album-meta">
                    <div class="meta-item"><span class="meta-label">Release Date</span><span class="meta-value" id="albumReleaseDate"></span></div>
                    <div class="meta-item"><span class="meta-label">Total Tracks</span><span class="meta-value" id="albumTrackCount"></span></div>
                    <div class="meta-item"><span class="meta-label">Duration</span><span class="meta-value" id="albumDuration"></span></div>
                </div>
                <p class="album-description" id="albumDescription" hidden></p>
                <div class="album-actions"><button type="button" class="btn-play" id="albumPlayBtn" aria-label="Play album" disabled>▶ Play</button><a target="_blank" rel="noopener noreferrer" data-album-buy hidden class="btn-like">♡ Buy Now</a></div>
            </div>
        </section>
        <section class="songs-container" id="albumTracks" aria-label="Album tracks" hidden>
            <div class="songs-header"><div>#</div><div>Title</div><div>Album</div><div>Duration</div><div></div></div><div id="trackList"></div>
        </section>`;
    let routeVersion = 0;

    function renderRoute(focus = false) {
        const currentRouteVersion = ++routeVersion;
        const url = location.protocol === 'file:' && location.hash.startsWith('#/')
            ? new URL(location.hash.slice(2), location.href) : new URL(location.href);
        const isAlbum = url.pathname.endsWith('/album.html');
        const album = isAlbum ? (url.searchParams.has('id')
            ? catalog.find(item => item.id === url.searchParams.get('id')) : catalog[0]) : null;
        content.innerHTML = isAlbum ? albumView : homeView;
        if (isAlbum) window.renderAlbum(album);
        else {
            document.title = homeTitle;
            renderGrid();
        }
        const nav = document.querySelector('.nav-buttons');
        nav.innerHTML = '<a target="_blank" rel="noopener noreferrer" data-album-buy hidden class="btn btn-login">Buy Now</a><a target="_blank" rel="noopener noreferrer" data-album-buy hidden class="btn btn-signup">Buy Now</a>';
        const footerLink = document.querySelector('footer a');
        const purchaseAlbum = isAlbum ? album : catalog.find(item => item.id === window.featuredAlbumId);
        nav.querySelectorAll('[data-album-buy]').forEach(link => {
            link.textContent = purchaseAlbum?.title || 'Album';
        });
        if (footerLink) {
            footerLink.hidden = true;
            footerLink.textContent = isAlbum ? `Buy ${purchaseAlbum?.title || 'This Album'}` : purchaseAlbum?.title || 'Album';
            footerLink.rel = 'noopener noreferrer';
        }
        document.querySelectorAll('[data-album-buy]').forEach(link => {
            link.hidden = true;
            link.removeAttribute('href');
            link.rel = 'noopener noreferrer';
            if (!isAlbum) link.textContent = purchaseAlbum?.title || 'Album';
        });
        window.getAlbumMetadata(purchaseAlbum).then(metadata => {
            if (currentRouteVersion !== routeVersion) return;
            document.querySelectorAll('[data-album-buy]').forEach(link => {
                link.hidden = !metadata.buyUrl;
                if (metadata.buyUrl) link.href = metadata.buyUrl;
            });
            if (footerLink) footerLink.hidden = !metadata.buyUrl;
        });
        document.querySelectorAll('.sidebar-link').forEach(link => {
            const target = new URL(link.href);
            const active = isAlbum ? Boolean(album && target.searchParams.get('id') === album.id)
                : target.pathname.endsWith('/index.html') && target.hash === url.hash;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.href = isAlbum ? window.albumUrl(album?.id || url.searchParams.get('id') || '') : 'index.html';
        dropdown.classList.remove('active');
        content.scrollTop = 0;
        if (focus) content.querySelector('section:not([hidden]) h1')?.focus({ preventScroll: true });
        const anchor = url.hash && document.getElementById(url.hash.slice(1));
        if (anchor) anchor.scrollIntoView({ block: 'start' });
        else window.scrollTo(0, 0);
    }

    function internalUrl(href) {
        const url = new URL(href, location.href);
        const home = new URL('index.html', location.href);
        const album = new URL('album.html', location.href);
        return url.origin === home.origin && (url.pathname === home.pathname || url.pathname === album.pathname) ? url : null;
    }
    window.navigateTo = href => {
        const url = internalUrl(href);
        if (!url) return;
        // file: URLs cannot reliably pushState to another file. Keep that entry
        // file and put the requested route in the hash instead.
        if (location.protocol === 'file:') {
            const route = `${url.pathname.endsWith('/album.html') ? 'album.html' : 'index.html'}${url.search}${url.hash}`;
            history.pushState(null, '', `#/${route}`);
            renderRoute(true);
        } else {
            if (url.href !== location.href) history.pushState(null, '', url.href);
            renderRoute(true);
        }
    };
    document.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
        const url = internalUrl(link.href);
        if (!url) return;
        event.preventDefault();
        window.navigateTo(url.href);
    });

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

    function renderGrid() {
        const grid = document.getElementById('albumGrid');
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
    window.addEventListener('popstate', () => renderRoute(true));
    renderRoute();
})();