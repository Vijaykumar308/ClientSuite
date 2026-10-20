export interface AudioByteRange {
  start: number;
  end: number;
}

export const parseAudioByteRange = (
  header: string | undefined,
  fileSize: number
): AudioByteRange | null | false => {
  if (!header) return null;
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0) return false;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return false;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return false;
    return {
      start: Math.max(fileSize - suffixLength, 0),
      end: fileSize - 1,
    };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : fileSize - 1;
  if (
    !Number.isSafeInteger(start)
    || !Number.isSafeInteger(requestedEnd)
    || start < 0
    || requestedEnd < start
    || start >= fileSize
  ) {
    return false;
  }

  return { start, end: Math.min(requestedEnd, fileSize - 1) };
};
