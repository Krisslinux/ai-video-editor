const { existsSync } = require('node:fs');
const { join } = require('node:path');
const platform = process.argv[2] || process.platform;
const root = join(__dirname, '..', 'vendor', 'ffmpeg', platform);
const files = [platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg', platform === 'win32' ? 'ffprobe.exe' : 'ffprobe', 'LICENSE.txt', 'SOURCE.txt'];
const missing = files.filter(f => !existsSync(join(root, f)));
if (missing.length) { console.error(`Media bundle missing: ${missing.join(', ')} in ${root}. Supply reviewed redistributable tools and notices before packaging.`); process.exit(1); }
