// Artwork exported directly from backend/components/loja/QuickCategoryBar.tsx.
export const categoryArtwork = {
  sparkles: require('../../assets/home/sparkles.webp'),
  tag: require('../../assets/home/tag.webp'),
  new: require('../../assets/home/new.webp'),
  diamond: require('../../assets/home/diamond.webp'),
  phone: require('../../assets/home/phone.webp'),
  heart: require('../../assets/home/heart.webp'),
};

export const instagramProfile = 'https://www.instagram.com/kabijoux_?igsh=aGV2Z2dxb252NzF5';

// Existing official highlight artwork, resized to the actual mobile display size.
export const storyArtwork: Record<string, number> = {
  novidades: require('../../assets/home/story-novidades.webp'),
  promocoes: require('../../assets/home/story-promocoes.webp'),
  lancamentos: require('../../assets/home/story-lancamentos.webp'),
  clientes: require('../../assets/home/story-clientes.webp'),
  ofertas: require('../../assets/home/story-ofertas.webp'),
};

// Reuse the site's existing image optimizer only for its own static assets.
// External product providers keep their original URLs and existing cache keys.
export function thumbnail(source: string | null, width: number): string | null {
  if (!source) return null;
  try {
    const url = new URL(source);
    if (url.hostname !== 'kabijoux.com.br' || !/^\/(uploads|images|banners)\//.test(url.pathname)) return source;
    const size = [64, 128, 256, 384, 640, 750, 828, 1080, 1200].find(size => size >= width) ?? 1200;
    return `${url.origin}/_next/image?url=${encodeURIComponent(url.pathname + url.search)}&w=${size}&q=75`;
  } catch { return source; }
}
