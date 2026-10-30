/**
 * Dynamically updates the browser favicon with the provided image URL or Data URI.
 * @param {string} iconUrl - The URL or base64 data URI of the logo/favicon
 */
export function setAppFavicon(iconUrl) {
  if (!iconUrl || typeof document === 'undefined') return;
  try {
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = iconUrl;
    link.type = iconUrl.startsWith('data:image/svg')
      ? 'image/svg+xml'
      : iconUrl.startsWith('data:image/png')
      ? 'image/png'
      : iconUrl.startsWith('data:image/jpeg') || iconUrl.startsWith('data:image/jpg')
      ? 'image/jpeg'
      : 'image/x-icon';
  } catch (e) {
    console.warn('Failed to update favicon:', e);
  }
}

