# Spotify2 album catalog

This is a static website; no framework or build step is required.

Each album uses the same `album.html` template with a unique URL, such as
`album.html?id=nobody-like-you` or `album.html?id=midnight-signals`.
Opening `album.html` without an ID still opens Nobody Like You.

## Current albums

The catalog contains Nobody Like You by Horsebag and FOR RENT by Dwelling Unit.
Edit `albums.js` to update either album or add another. Each entry supports:

- `id`: a unique, URL-friendly album identifier (keep it stable for existing links).
- `title` and `artist`.
- `metadataFile`: path to that album's metadata JSON file.
- `icon`: emoji used in cards, search, and fallback artwork.
- `cover`: artwork path, or `null` to use the emoji fallback.
- `description`: optional message displayed under the album metadata.
- `tracks`: the songs in playback order, each with `title`, `duration` in seconds,
  and `src` pointing to its audio file relative to the website root. An optional
  track `artist` overrides the album artist.

Audio and cover paths are relative to the website root. A track with `src: null`
is shown as coming soon and cannot be played. A `duration: null` displays an
unknown duration; the player reads the actual duration once the audio file loads.

Each album folder also has a `metadata.json` file with `releaseDate` and `buyUrl`
fields. Set either field to `null` until it is known; `buyUrl` must be an HTTP(S)
URL. The album page and purchase links read these values from that JSON file.
Serve the site over HTTP while developing so the browser can fetch the JSON; direct
`file://` access cannot load fetched metadata.

## Catalog behavior

Set `window.featuredAlbumId` in `albums.js` to choose the featured album (currently
FOR RENT). Both home-page header buttons, both hero CTA buttons, and the footer
display its title and link to its metadata `buyUrl`. These links are hidden when
the featured album or its purchase URL is unavailable. Album-page purchase links
continue to use the album being viewed.

Home-page cards, sidebar links, search results, track counts, and album pages
update automatically from `window.albumCatalog`; there is no need to copy the
album HTML or player code.

`site.js` handles client-side navigation, cards, and search. `album.js` renders
album details, while `player.js` owns a single persistent audio element and queue.
`views.css` shares view styling between both static entry pages.

The bottom player is hidden until a track is selected, then stays available on
Home and album pages, including when playback is paused. Internal links and
browser Back/Forward change the view without reloading the document, so browsing
does not interrupt playback or change the current queue. Selecting a song or
pressing an album's Play button changes playback. The player's track-list button
returns to the playing album. Existing album URLs still work as direct entry
points; refreshing, closing the tab, or leaving the site stops playback.

Serve the folder with a local static web server for the most reliable audio
playback during development. When opened directly as local files, navigation
uses hash routes to avoid browser restrictions on cross-file history updates.