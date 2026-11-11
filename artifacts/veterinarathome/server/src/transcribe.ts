import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

// Распознавание речи на сервере: ffmpeg переводит запись в WAV 16 кГц,
// локальная нейросеть Whisper (whisper.cpp) превращает её в текст. Работает без интернета.
const BIN = (name: string) => [`/opt/homebrew/bin/${name}`, `/usr/local/bin/${name}`].find((p) => fs.existsSync(p)) ?? name;
const MODEL = path.resolve(__dirname, '../models/ggml-small-q5_1.bin');

function run(cmd: string, args: string[], timeoutMs = 60_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`${cmd}: ${err.message} ${String(stderr).slice(-300)}`));
      else resolve(String(stdout));
    });
  });
}

export function transcriptionAvailable() {
  return fs.existsSync(MODEL);
}

export async function transcribeFile(inputPath: string): Promise<string> {
  if (!transcriptionAvailable()) return '';
  const wav = path.join(os.tmpdir(), `vetdom-${crypto.randomUUID()}.wav`);
  try {
    await run(BIN('ffmpeg'), ['-y', '-loglevel', 'error', '-i', inputPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
    const out = await run(BIN('whisper-cli'), ['-m', MODEL, '-l', 'ru', '-nt', '-np', '-t', String(Math.max(2, Math.min(8, os.cpus().length))), '-f', wav], 120_000);
    return out.split('\n').map((l) => l.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  } catch (err) {
    console.error('Распознавание речи не удалось:', err instanceof Error ? err.message : err);
    return '';
  } finally {
    fs.rm(wav, { force: true }, () => {});
  }
}
