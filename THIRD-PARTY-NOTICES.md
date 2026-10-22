# Third-party notices

The original project MIT license is retained in LICENSE.

Playfair Display and DM Mono are distributed under the SIL Open Font License 1.1. Font files and their complete license/copyright notices are in public/fonts. Sources: https://github.com/google/fonts/tree/main/ofl/playfairdisplay and https://github.com/google/fonts/tree/main/ofl/dmmono . The commercial GT Ultra font is not used.

The user's partial Type Garden reference names Akshat Agarwal and https://type-garden.vercel.app . Its palettes, botanical concept and seven motion names informed this feature. The supplied snippet is incomplete, uses a different runtime, and is not the renderer shipped here. Frameflow's canvas drawing and native export pipeline are new implementations; no complete third-party motion/export implementation was available to port.

@napi-rs/canvas is MIT licensed. Its upstream source and bundled dependency notices are available at https://github.com/Brooooooklyn/canvas and in the installed package. FFmpeg remains an external operator-installed executable; its licensing depends on the installed build.

## Lyrics processor dependencies

HyperFrames / @hyperframes/engine: https://github.com/heygen-com/hyperframes (MIT). It uses Puppeteer (Apache-2.0) and Chrome for Testing; dependency licenses are included in installed packages. faster-whisper: https://github.com/SYSTRAN/faster-whisper (MIT), using CTranslate2 and OpenAI Whisper model weights (MIT). These are downloaded separately by the explicit operator setup. FFmpeg is supplied by the host distribution; its configured codecs and distribution license apply.
