# Lyrics providers

Open Lyrics → Find lyrics online after the uploaded audio has been analyzed. Enter the recording title and artist; album and an optional 11-character YouTube video ID narrow the lookup. Auto searches the fetch sources, collects alternatives and puts verified metadata/duration matches first. Selecting a result saves its supplied timing, query and attribution in the project, resets the previous offset, and enables the existing timing editor. No API test or capability gate runs first.

A matching duration within two seconds helps identify the recording. It does not prove sample-accurate sync: an intro, live take, speed change or different master can still differ. Unknown metadata is labeled, not assumed to match. Word timing gets a quality preference after recording match; line-timed text stays line-timed. No words are assigned evenly divided times. Preview and offset/cue correction remain available.

| Provider | Integration |
| --- | --- |
| BiniLyrics | Official web /api/lookup (track/artist/album/duration), then allowed lyrics-storage.binimum.org or lrc.red TTML; source availability varies |
| BetterLyrics | TTML through api.betterlyrics.org/getLyrics; cached reads can work without a key |
| BetterLyrics Portato | QQ/QRC through the BetterLyrics /qq/getLyrics endpoint |
| PaxSenix | api.paxsenix.org/lyrics/lrcget; separate PaxSenix bearer key |
| PaxSenix: Spotify | PaxSenix Spotify search plus /lyrics/spotify; same separate key |
| PaxSenix: Musixmatch | PaxSenix /lyrics/musixmatch; same separate key |
| LyricsPlus | Documented /v1/ttml/get endpoint on its primary published service |
| SimpMusic | Public /v1/search or /v1/{videoId}; community synced/plain records |
| Unison | /lyrics by video ID or song/artist/album/duration |
| YouTube captions | Open YouTube Studio and import an authorized SRT/VTT/TTML file |
| YouTube Music | Open source, paste plain lyrics or import a timed file; no direct account integration |
| Megalobiz | Open source, download its LRC and import it |
| KuGou | BetterLyrics /kugou/getLyrics; line LRC |
| LRCLIB | Public /api/search by track/artist, retaining alternative recordings |
| Musixmatch | LyricsPlus with source=musixmatch; depends on that backend's upstream access |
| Genius | Open source and paste text for manual timing; no timed Genius API is simulated |

## Separate credentials

Choose a PaxSenix or BetterLyrics-family entry to save its source key. Keys are encrypted with AES-GCM in lyric_credentials and scoped to the signed-in user. Only configured provider names return to the browser. Save key performs storage only and works independently of the native processor. PaxSenix has one shared key for its three entries. BetterLyrics, Portato and KuGou share the optional BetterLyrics key. A provider may still reject that key or a request; source results report actual access, rate-limit and availability failures.

Your custom Claude/OpenAI/Anthropic token is never forwarded to lyrics services. Public searches send song metadata, duration and optional video ID only. The uploaded audio remains private. These searches do not consume the app's AI-call allowance. AI transcription/theme generation keeps its existing separate token/local-Whisper behavior.

## Imports and saved results

Imports accept LRC (metadata, offsets, repeated timestamps, blank end markers and enhanced word timestamps), Apple-style TTML, QQ QRC, SRT, WebVTT, the existing cue JSON and timestamp tables. Syllables with no intervening word boundary are joined using their real supplied start/end. Background/transliteration spans are excluded. Cue range, order and bounds are validated; an overlapping or malformed source is not silently repaired. XML DTDs/entities and HTML error pages are rejected.

Plain lyrics can be loaded with Load text for timing. Their start/end values remain unset (zero); assign each time manually before Save timing. Timed imports and provider selections can export without a connected AI provider. The renderer still requires the separate native processor.

Searches use fixed services, at most four sources concurrently, a ten-second source timeout (20 seconds for BiniLyrics lookup plus file retrieval) and a bounded response. There is no proxy rotation, cookie harvesting, forced cache refresh or uncertain paid-call replay. One search per user runs at a time. A single private cache object per project holds a query for five minutes (empty results for 30 seconds); changing song, metadata or source key invalidates it. Selecting lyrics persists them independently of that cache. Keys never appear in URLs, logs or browser storage.

## Primary contracts and current verification

- BetterLyrics: https://lyrics-api-docs.boidu.dev/docs/providers and /docs/authentication
- Unison: https://lyrics-api-docs.boidu.dev/unison
- BiniLyrics: https://lyrics.binimum.org/developers (shared lookup shape; the first-party web client uses /api/lookup)
- LyricsPlus: https://github.com/ibratabian17/LyricsPlus/blob/cookie/docs/endpoints.md (primary service list: YouLyPlus src/background/constants.js)
- PaxSenix: https://api.paxsenix.org/docs (current request shapes also cross-checked against ArchiveTune's maintained PaxsenixLyrics client)
- SimpMusic: https://api-lyrics.simpmusic.org/ (request/response shapes cross-checked against maintained SimpMusic clients)
- LRCLIB: https://lrclib.net/docs
- Authorized YouTube caption downloads: https://developers.google.com/youtube/data/reference/rest/v3/captions/download

Live public lookup on 2026-10-21 returned real LRCLIB line timing and BetterLyrics word timing. Other calls encountered blocked/unavailable sources, including a LyricsPlus HTTP-200 HTML error page, now rejected. No claim is made that all third-party services are reachable, every key works, or every song is available. PaxSenix was tested with isolated fixtures; no personal source key was supplied for a live test. Do not replace unavailable integrations with fabricated results.
