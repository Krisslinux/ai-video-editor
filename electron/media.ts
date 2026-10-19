import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Asset, Clip, Project, durationUs, projectDurationUs } from '../src/shared/project';

function binary(name: 'ffmpeg' | 'ffprobe') {
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const resources = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  const bundled = resources && join(resources, 'media-tools', process.platform, name + suffix);
  if (bundled && existsSync(bundled)) return bundled;
  return name;
}
export function runTool(name: 'ffmpeg' | 'ffprobe', args: string[], signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary(name), args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], signal });
    let stdout = '', stderr = '';
    child.stdout.on('data', b => { stdout += b; if (stdout.length > 16_000_000) child.kill(); });
    child.stderr.on('data', b => { stderr += b; if (stderr.length > 2_000_000) stderr = stderr.slice(-1_000_000); });
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.name === 'AbortError') reject(new Error(`${name} was cancelled`));
      else if (error.code === 'ENOENT') reject(new Error(`${name} is not installed or not on PATH`));
      else reject(new Error(`${name} failed to start${error.code ? ` (${error.code})` : ''}: ${error.message}`));
    });
    child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(`${name} failed (${code}): ${stderr.slice(-1200)}`)));
  });
}
export async function discoverMediaTools() {
  try {
    await runTool('ffmpeg', ['-version']); await runTool('ffprobe', ['-version']);
    const encoders = await runTool('ffmpeg', ['-hide_banner', '-encoders']);
    if (!/\blibx264\b/.test(encoders)) throw new Error('Selected FFmpeg build lacks the H.264 libx264 encoder required for preview/export');
    return { ready: true, message: 'FFmpeg, ffprobe, and H.264 encoder available' };
  }
  catch (error) { return { ready: false, message: String(error) + '. Install compatible FFmpeg/ffprobe or use a build that bundles them.' }; }
}
export async function probe(path: string): Promise<Omit<Asset, 'id' | 'name' | 'path'>> {
  const raw = await runTool('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path]);
  const info = JSON.parse(raw) as { format?: { duration?: string }; streams?: Array<{ codec_type: string; width?: number; height?: number; avg_frame_rate?: string; sample_rate?: string; channels?: number; duration?: string; disposition?: { attached_pic?: number }; side_data_list?: Array<{ rotation?: number }> }> };
  const video = info.streams?.find(s => s.codec_type === 'video' && !s.disposition?.attached_pic);
  const audio = info.streams?.find(s => s.codec_type === 'audio');
  if (!video && !audio) throw new Error('No supported video or audio stream found');
  const duration = Number(info.format?.duration ?? video?.duration ?? audio?.duration);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 86400) throw new Error('Unknown or unsupported media duration');
  const rotation = video?.side_data_list?.find(data => Number.isFinite(data.rotation))?.rotation ?? 0;
  const rotated = Math.abs(rotation % 180) === 90;
  return { kind: video ? 'video' : 'audio', durationUs: Math.round(duration * 1_000_000), width: rotated ? video?.height : video?.width, height: rotated ? video?.width : video?.height, frameRate: video?.avg_frame_rate, sampleRate: audio?.sample_rate ? Number(audio.sample_rate) : undefined, channels: audio?.channels, hasAudio: Boolean(audio) };
}
const sec = (n: number) => (n / 1_000_000).toFixed(6);
export function graphOptionForVersion(version: string) {
  if (/^ffmpeg version N-/.test(version)) return '-/filter_complex';
  const major = Number(version.match(/^ffmpeg version n?(\d+)/)?.[1]);
  if (!Number.isInteger(major)) throw new Error('Could not identify the installed FFmpeg version');
  return major >= 7 ? '-/filter_complex' : '-filter_complex_script';
}
const byId = (project: Project, clip: Clip) => {
  const asset = project.assets.find(a => a.id === clip.assetId);
  if (!asset || !existsSync(asset.path)) throw new Error(`Missing media: ${asset?.name ?? clip.assetId}`);
  return asset;
};
export type RenderOptions = { width: number; height: number; output: string; signal?: AbortSignal };
export async function render(project: Project, options: RenderOptions): Promise<void> {
  if (!project.video.length) throw new Error('Add a video clip before rendering');
  if (options.width % 2 || options.height % 2 || options.width < 2 || options.height < 2) throw new Error('Invalid output dimensions');
  let videoEnd = 0;
  for (const clip of project.video) {
    if (clip.startUs !== videoEnd) throw new Error('Video clips must be contiguous before rendering');
    videoEnd += durationUs(clip);
  }
  const length = projectDurationUs(project);
  const inputArgs: string[] = [], filters: string[] = [], videoNames: string[] = [], audioNames: string[] = [];
  const sources = new Map<string, { asset: Asset; index: number; video: string[]; audio: string[]; videoUsed: number; audioUsed: number }>();
  for (const clip of [...project.video, ...project.audio]) {
    const asset = byId(project, clip);
    if (!sources.has(asset.id)) {
      const index = sources.size;
      sources.set(asset.id, { asset, index, video: [], audio: [], videoUsed: 0, audioUsed: 0 });
      inputArgs.push('-i', asset.path);
    }
  }
  for (const source of sources.values()) {
    const videos = project.video.filter(clip => clip.assetId === source.asset.id).length;
    const audios = (source.asset.hasAudio ? videos : 0) + project.audio.filter(clip => clip.assetId === source.asset.id && clip.startUs < length).length;
    source.video = Array.from({ length: videos }, (_, n) => videos === 1 ? `[${source.index}:v]` : `[vin${source.index}_${n}]`);
    source.audio = Array.from({ length: audios }, (_, n) => audios === 1 ? `[${source.index}:a]` : `[ain${source.index}_${n}]`);
    if (videos > 1) filters.push(`[${source.index}:v]split=${videos}${source.video.join('')}`);
    if (audios > 1) filters.push(`[${source.index}:a]asplit=${audios}${source.audio.join('')}`);
  }
  for (const clip of project.video) {
    const source = sources.get(clip.assetId)!;
    const asset = source.asset;
    const scale = clip.fit === 'fill'
      ? `scale=${options.width}:${options.height}:force_original_aspect_ratio=increase,crop=${options.width}:${options.height}`
      : `scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease,pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2:black`;
    const v = `v${videoNames.length}`, a = `a${audioNames.length}`;
    filters.push(`${source.video[source.videoUsed++]}trim=start=${sec(clip.sourceInUs)}:end=${sec(clip.sourceOutUs)},setpts=PTS-STARTPTS,fps=30,${scale},setsar=1,format=yuv420p[${v}]`);
    if (asset.hasAudio) filters.push(`${source.audio[source.audioUsed++]}atrim=start=${sec(clip.sourceInUs)}:end=${sec(clip.sourceOutUs)},asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=${clip.gain}${clip.fadeOutUs ? `,afade=t=out:st=${sec(durationUs(clip) - clip.fadeOutUs)}:d=${sec(clip.fadeOutUs)}` : ''},apad,atrim=duration=${sec(durationUs(clip))}[${a}]`);
    else filters.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${sec(durationUs(clip))}[${a}]`);
    videoNames.push(`[${v}]`); audioNames.push(`[${a}]`);
  }
  filters.push(`${videoNames.join('')}concat=n=${videoNames.length}:v=1:a=0[vout]`);
  filters.push(`${audioNames.join('')}concat=n=${audioNames.length}:v=0:a=1[baseaudio]`);
  const mixes = ['[baseaudio]'];
  for (const clip of project.audio) {
    const effectiveDuration = Math.min(durationUs(clip), length - clip.startUs);
    if (effectiveDuration <= 0) continue;
    const source = sources.get(clip.assetId)!;
    const label = `music${mixes.length}`;
    const fadeLength = Math.min(clip.fadeOutUs, effectiveDuration);
    const fade = fadeLength ? `,afade=t=out:st=${sec(effectiveDuration - fadeLength)}:d=${sec(fadeLength)}` : '';
    filters.push(`${source.audio[source.audioUsed++]}atrim=start=${sec(clip.sourceInUs)}:end=${sec(clip.sourceInUs + effectiveDuration)},asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=${clip.gain}${fade},adelay=${Math.round(clip.startUs / 1000)}:all=1[${label}]`);
    mixes.push(`[${label}]`);
  }
  if (mixes.length > 1) filters.push(`${mixes.join('')}amix=inputs=${mixes.length}:duration=longest:normalize=0,atrim=duration=${sec(length)}[aout]`);
  else filters.push('[baseaudio]anull[aout]');
  const graphDir = await mkdtemp(join(tmpdir(), 'ai-video-graph-'));
  try {
    const graphPath = join(graphDir, 'filters.txt');
    await writeFile(graphPath, filters.join(';'));
    const version = await runTool('ffmpeg', ['-version']);
    const graphOption = graphOptionForVersion(version);
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...inputArgs, graphOption, graphPath, '-map', '[vout]', '-map', '[aout]', '-t', sec(length), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', options.output];
    if (process.platform === 'win32' && args.join(' ').length > 30_000) throw new Error('Too many distinct media paths for one Windows render');
    await runTool('ffmpeg', args, options.signal);
  } finally { await rm(graphDir, { recursive: true, force: true }); }
}
export function qualityReport(project: Project): string[] {
  const issues: string[] = [];
  if (!project.video.length) issues.push('No video clips');
  for (const clip of [...project.video, ...project.audio]) {
    const asset = project.assets.find(a => a.id === clip.assetId);
    if (!asset || !existsSync(asset.path)) issues.push(`Missing media: ${asset?.name ?? clip.assetId}`);
    if (clip.gain > 1) issues.push(`Potential clipping: ${asset?.name ?? clip.id} gain above 100%`);
  }
  for (let i = 1; i < project.video.length; i++) if (project.video[i].startUs > project.video[i - 1].startUs + durationUs(project.video[i - 1])) issues.push(`Gap before clip ${i + 1} at ${sec(project.video[i].startUs)}s`);
  issues.push('Speech-cut, caption-bounds, and recording-sync analysis: not checked');
  return issues;
}
