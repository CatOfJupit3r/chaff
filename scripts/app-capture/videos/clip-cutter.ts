import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import type { CaptureTheme } from '../app-capture.constants.ts';
import { VIDEO_ENCODING, VIDEO_OUTPUT_DIR, VIDEO_PACE } from './site-video.constants.ts';
import type { iClipMark } from './site-video.types.ts';

/** Cuts the marked clips out of a session recording as silent H.264 loops with a poster frame. */
export class ClipCutter {
  public constructor(private readonly theme: CaptureTheme) {}

  public cut(videoPath: string, marks: iClipMark[], elapsedAtCloseMs: number) {
    mkdirSync(VIDEO_OUTPUT_DIR, { recursive: true });
    const leadMs = Math.max(0, this.durationMs(videoPath) - elapsedAtCloseMs);
    return marks.map((mark) => {
      const baseName = `${mark.clip}-${this.theme}`;
      const clipPath = path.join(VIDEO_OUTPUT_DIR, `${baseName}.mp4`);
      const posterPath = path.join(VIDEO_OUTPUT_DIR, `${baseName}.jpg`);
      const startSeconds = Math.max(0, leadMs + mark.startMs - VIDEO_PACE.CLIP_LEAD_IN_MS) / 1000;
      const durationSeconds = (mark.endMs - mark.startMs + VIDEO_PACE.CLIP_LEAD_IN_MS) / 1000;
      this.encodeClip(videoPath, clipPath, startSeconds, durationSeconds);
      this.extractPoster(clipPath, posterPath, durationSeconds);
      return clipPath;
    });
  }

  private encodeClip(source: string, target: string, startSeconds: number, durationSeconds: number) {
    this.ffmpeg([
      '-ss',
      startSeconds.toFixed(2),
      '-i',
      source,
      '-t',
      durationSeconds.toFixed(2),
      '-an',
      '-r',
      VIDEO_ENCODING.FRAME_RATE,
      '-c:v',
      'libx264',
      '-preset',
      VIDEO_ENCODING.PRESET,
      '-crf',
      VIDEO_ENCODING.CRF,
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      target,
    ]);
  }

  /** The poster is the clip's last frame, so the page shows where the clip ends up before it plays. */
  private extractPoster(clip: string, target: string, durationSeconds: number) {
    this.ffmpeg([
      '-ss',
      Math.max(0, durationSeconds - 0.5).toFixed(2),
      '-i',
      clip,
      '-frames:v',
      '1',
      '-q:v',
      VIDEO_ENCODING.POSTER_QUALITY,
      target,
    ]);
  }

  private durationMs(videoPath: string) {
    const seconds = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', videoPath],
      {
        encoding: 'utf8',
      },
    );
    return Number.parseFloat(seconds) * 1000;
  }

  private ffmpeg(args: string[]) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  }
}
