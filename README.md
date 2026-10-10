# Spotify2 album catalog

This is a static website; no framework or build step is required.

Each album uses the same `album.html` template with a unique URL, such as
`album.html?id=nobody-like-you` or `album.html?id=midnight-signals`.
Opening `album.html` without an ID still opens Nobody Like You.

## Current albums

The catalog contains Nobody Like You by Horsebag and FOR RENT by Dwelling Unit.
Edit `albums.js` to update either album or add another. Each entry supports:

- `id`: a unique, URL-friendly album identifier (keep it stable for existing links).
- `title`, `artist`, and `releaseDate`: album metadata.
- `icon`: emoji used in cards, search, and fallback artwork.
- `cover`: artwork path, or `null` to use the emoji fallback.
- `buyUrl`: purchase URL, or `null` to hide purchase links.
- `description`: optional message displayed under the album metadata.
- `tracks`: the songs in playback order, each with `title`, `duration` in seconds,
  and `src` pointing to its audio file relative to the website root. An optional
  track `artist` overrides the album artist.

Audio and cover paths are relative to the website root. A track with `src: null`
is shown as coming soon and cannot be played. A `duration: null` displays an
unknown duration; the player reads the actual duration once the audio file loads.

## Catalog behavior

Home-page cards, sidebar links, search results, track counts, and album pages
update automatically from `window.albumCatalog`; there is no need to copy the
album HTML or player code.

`site.js` handles shared navigation, cards, and search. `album.js` handles album
rendering and playback. Serve the folder with a local static web server for the
most reliable audio playback during development.