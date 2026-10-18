const { spawnSync } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');
const dir = join(__dirname, '..', 'local', 'fixture');
mkdirSync(dir, { recursive: true });
function ff(args) { const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw Error(r.stderr); }
for (const [name, color, hz, duration] of [['one', 'red', 440, 2], ['two', 'blue', 660, 3]]) {
  ff(['-f', 'lavfi', '-i', `color=c=${color}:s=320x240:r=30:d=${duration}`, '-f', 'lavfi', '-i', `sine=frequency=${hz}:sample_rate=48000:duration=${duration}`, '-c:v', 'mpeg4', '-q:v', '4', '-c:a', 'aac', '-shortest', join(dir, `${name}.mp4`)]);
}
ff(['-f', 'lavfi', '-i', 'sine=frequency=220:sample_rate=48000:duration=5', '-c:a', 'pcm_s16le', join(dir, 'music.wav')]);
console.log(dir);
