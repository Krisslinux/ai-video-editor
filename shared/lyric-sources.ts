import type {Transcript} from './types.ts';

export const lyricProviders = [
 {id:'binilyrics',name:'BiniLyrics',mode:'fetch',url:'https://lyrics.binimum.org/'},
 {id:'betterlyrics',name:'BetterLyrics',mode:'fetch',key:'betterlyrics',url:'https://lyrics-api-docs.boidu.dev/'},
 {id:'portato',name:'BetterLyrics Portato',mode:'fetch',key:'betterlyrics',url:'https://lyrics-api-docs.boidu.dev/docs/providers'},
 {id:'paxsenix',name:'PaxSenix',mode:'fetch',key:'paxsenix',url:'https://api.paxsenix.org/docs'},
 {id:'paxsenix-spotify',name:'PaxSenix: Spotify',mode:'fetch',key:'paxsenix',url:'https://api.paxsenix.org/docs'},
 {id:'paxsenix-musixmatch',name:'PaxSenix: Musixmatch',mode:'fetch',key:'paxsenix',url:'https://api.paxsenix.org/docs'},
 {id:'lyricsplus',name:'LyricsPlus',mode:'fetch',url:'https://github.com/ibratabian17/LyricsPlus'},
 {id:'simpmusic',name:'SimpMusic',mode:'fetch',url:'https://lyrics.simpmusic.org/'},
 {id:'unison',name:'Unison',mode:'fetch',url:'https://unison.boidu.dev/'},
 {id:'youtube-captions',name:'YouTube captions',mode:'import',url:'https://studio.youtube.com/',note:'Import an SRT, VTT or TTML caption file. Direct caption downloads require permission to edit the video.'},
 {id:'youtube-music',name:'YouTube Music',mode:'import',url:'https://music.youtube.com/',note:'Open the song and paste its lyrics, or import a timed file. Direct YouTube Music lyric retrieval is not connected.'},
 {id:'megalobiz',name:'Megalobiz',mode:'import',url:'https://www.megalobiz.com/',note:'Find the song on Megalobiz, download its LRC, then import it here.'},
 {id:'kugou',name:'KuGou',mode:'fetch',key:'betterlyrics',url:'https://lyrics-api-docs.boidu.dev/docs/providers',note:'Fetched through BetterLyrics KuGou.'},
 {id:'lrclib',name:'LRCLIB',mode:'fetch',url:'https://lrclib.net/'},
 {id:'musixmatch',name:'Musixmatch',mode:'fetch',url:'https://www.musixmatch.com/',note:'Fetched through LyricsPlus; availability depends on its Musixmatch source.'},
 {id:'genius',name:'Genius',mode:'import',url:'https://genius.com/',note:'Find the song on Genius and paste its lyrics. Genius text does not supply sync times.'},
] as const;
export type LyricProviderId=typeof lyricProviders[number]['id'];
export type LyricLookup={title:string;artist:string;album:string;provider:LyricProviderId|'auto';videoId?:string};
export type LyricAttribution={provider:LyricProviderId;title:string;artist:string;album:string;durationMs?:number;url:string};
export type LyricCandidate=LyricAttribution & {id:string;timing:'word'|'line'|'plain';cues:Transcript[];plainText:string;score:number;recommended:boolean;durationDeltaMs?:number;notes:string[]};
export type LyricSearchResult={candidates:LyricCandidate[];sources:{provider:LyricProviderId;status:'found'|'empty'|'unavailable'|'key-required'|'import';message:string}[]};
