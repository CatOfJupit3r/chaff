export function markdownUrl(value: string, baseUrl?: string) {
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}
