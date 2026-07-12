// Pull the 11-char video id out of any common YouTube URL shape:
// watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID, or a bare id.
export function youTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return /^[A-Za-z0-9_-]{11}$/.test(url.trim()) ? url.trim() : null;
}

// Privacy-friendly embed URL, autoplaying, no related-video clutter.
export function youTubeEmbed(url: string): string | null {
  const id = youTubeId(url);
  return id
    ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`
    : null;
}
