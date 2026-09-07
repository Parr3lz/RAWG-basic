export function rawgImage(url: string | null, width = 420): string | null {
    if (!url) return url;
    return url.replace('/media/', `/media/resize/${width}/-/`);
  }
  