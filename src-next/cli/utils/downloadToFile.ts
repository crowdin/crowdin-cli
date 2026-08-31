import { createWriteStream } from 'node:fs';
import { mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import CliError from '@/cli/errors/CliError.ts';

/**
 * Streams a download to a local file, creating the parent directory.
 *
 * Not `Bun.write(path, response)`: on Bun 1.4.0 that call never settles when the GC collects the
 * Response while the body is still arriving (oven-sh/bun#40278), so the CLI stops with no file, no
 * error and no exit. Piping the body through node's stream pipeline is the same single streaming
 * pass without the stall.
 *
 * Two spellings that look tidier are silently wrong on the same version: `Bun.write(path,
 * response.body)` stringifies the stream and writes 23 bytes of "[object ReadableStream]", and
 * `writeFile(path, Readable.fromWeb(response.body))` inflates binary bodies by ~3% once they arrive
 * in more than one chunk. Both exit 0, and a single-chunk body hides both.
 *
 * The bytes land in a sibling `.part` file and are renamed over the destination only once the whole
 * body has arrived: a download that dies halfway leaves the previous local file alone instead of
 * replacing it with a truncated one.
 */
export async function downloadToFile(url: string, destination: string): Promise<void> {
  const response = await fetch(url);

  // The signed URLs answer errors with a body of their own; without this the XML would be written
  // out as if it were the requested file.
  if (!response.ok || !response.body) {
    throw new CliError(`Download failed with status ${response.status}`);
  }

  // Bun on Windows rejects a recursive mkdir of a directory that already exists, which a bare file
  // name ('.') always is; POSIX treats it as a no-op.
  await mkdir(path.dirname(destination), { recursive: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  });

  // Randomised so two downloads racing for one destination can't write to the same part file.
  const partPath = `${destination}.${Math.random().toString(36).slice(2, 10)}.part`;
  const sink = createWriteStream(partPath);

  try {
    await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), sink);

    // A body cut short mid-transfer can still end the stream cleanly, and the truncated file would
    // then be renamed over a good one.
    const expected = Number(response.headers.get('content-length'));

    if (Number.isFinite(expected) && expected > 0 && sink.bytesWritten !== expected) {
      throw new CliError(`Download is incomplete: got ${sink.bytesWritten} of ${expected} bytes`);
    }

    await rename(partPath, destination);
  } catch (error) {
    await unlink(partPath).catch(() => {});
    throw error;
  }
}
