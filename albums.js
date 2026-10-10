// The catalog is shared by the home page, search, navigation, and album player.
// Add an album here to give it its own album.html?id=your-album-id page.
// Track src values are paths relative to album.html; null means not uploaded yet.
(() => {
    // Home-page purchase buttons and footer promote this album.
    window.featuredAlbumId = 'for-rent';
    window.albumCatalog = [
        {
            id: 'nobody-like-you',
            title: 'Nobody Like You',
            artist: 'Horsebag',
            metadataFile: 'albums/Nobody%20Like%20You/metadata.json',
            cover: 'albums/Nobody%20Like%20You/cover.jpg',
            icon: '🎵',
            tracks: [
                { title: 'Itchiest Shirt', duration: 133, src: 'albums/Nobody%20Like%20You/01_itchiest_shirt.mp3' },
                { title: 'Checkout Line', duration: 52, src: 'albums/Nobody%20Like%20You/02_checkout_line.mp3' },
                { title: 'Blood Jockey', duration: 285, src: 'albums/Nobody%20Like%20You/03_blood_jockey.mp3' },
                { title: "Todd's Face Is My Face", duration: 243, src: 'albums/Nobody%20Like%20You/04_todds_face_is_my_face.mp3' },
                { title: 'Opened Your Mail', duration: 158, src: 'albums/Nobody%20Like%20You/05_opened_your_mail.mp3' },
                { title: 'Lizard With A Knife', duration: 88, src: 'albums/Nobody%20Like%20You/06_lizard_with_a_knife.mp3' },
                { title: 'Piss Machine', duration: 215, src: 'albums/Nobody%20Like%20You/07_piss_machine.mp3' },
                { title: 'Diseased Ape Enclosure', duration: 164, src: 'albums/Nobody%20Like%20You/08_diseased_ape_enclosure.mp3' },
                { title: 'Lump Talk', duration: 118, src: 'albums/Nobody%20Like%20You/09_lump_talk.mp3' },
                { title: 'Riding on the Back of a Bug', duration: 109, src: 'albums/Nobody%20Like%20You/10_riding_on_the_back_of_a_bug.mp3' },
                { title: 'Saturate', duration: 336, src: 'albums/Nobody%20Like%20You/11_saturate.mp3' },
                { title: 'Timeclown', duration: 223, src: 'albums/Nobody%20Like%20You/12_timeclown.mp3' }
            ]
        },
        {
            id: 'for-rent',
            title: 'FOR RENT',
            artist: 'Dwelling Unit',
            metadataFile: 'albums/FOR%20RENT/metadata.json',
            cover: 'albums/FOR%20RENT/cover.jpg',
            icon: '🎵',
            tracks: [
                { title: 'SEXTOY', duration: 149, src: 'albums/FOR%20RENT/1-SEXTOY.mp3' },
                { title: 'WANTS MORE', duration: 290, src: 'albums/FOR%20RENT/2-WANTS-MORE.mp3' },
                { title: 'BLOOD MOON', duration: 304, src: 'albums/FOR%20RENT/3-BLOOD-MOON.mp3' },
                { title: 'BETWEEN THE EYES / IS THERE SOMETHING', duration: 290, src: 'albums/FOR%20RENT/4-BETWEEN-THE-EYES-IS-THERE-SOMETHING.mp3' },
                { title: "MOMMY'S HUNG", duration: 215, src: 'albums/FOR%20RENT/5-MOMMYS-HUNG.mp3' },
                { title: 'DEAR PLEASURE', duration: 223, src: 'albums/FOR%20RENT/6-DEAR-PLEASURE.mp3' },
                { title: 'I WANT YR BODY', duration: 269, src: 'albums/FOR%20RENT/7-I-WANT-YR-BODY.mp3' },
                { title: 'CONCRETE', duration: 237, src: 'albums/FOR%20RENT/8-CONCRETE.mp3' },
                { title: 'KÜSS MICH', duration: 356, src: 'albums/FOR%20RENT/9-K%C3%9CSS-MICH.mp3' }
            ]
        }
    ];

    const metadataCache = new Map();
    window.getAlbumMetadata = album => {
        if (!album?.metadataFile) return Promise.resolve({ releaseDate: null, buyUrl: null });
        if (!metadataCache.has(album.id)) {
            metadataCache.set(album.id, fetch(album.metadataFile)
                .then(response => {
                    if (!response.ok) throw new Error(`Could not load metadata for ${album.id}`);
                    return response.json();
                })
                .then(metadata => ({
                    releaseDate: typeof metadata.releaseDate === 'string' && metadata.releaseDate.trim()
                        ? metadata.releaseDate.trim() : null,
                    buyUrl: typeof metadata.buyUrl === 'string' && /^https?:\/\//i.test(metadata.buyUrl.trim())
                        ? metadata.buyUrl.trim() : null
                }))
                .catch(() => ({ releaseDate: null, buyUrl: null })));
        }
        return metadataCache.get(album.id);
    };

    window.albumUrl = id => `album.html?id=${encodeURIComponent(id)}`;
})();