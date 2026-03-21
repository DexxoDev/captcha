import sharp from 'sharp';
import { normalizeLocale, t } from '../config/i18n.js';
import { settings } from '../config/settings.js';

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export class PanelArtService {
  buildSvg({ guildName, locale = 'ar' }) {
    const activeLocale = normalizeLocale(locale);
    const safeGuildName = escapeXml(guildName.toUpperCase()).slice(0, 40);

    return `
      <svg width="1040" height="420" viewBox="0 0 1040 420" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#010201" />
            <stop offset="48%" stop-color="#07110a" />
            <stop offset="100%" stop-color="#0d2115" />
          </linearGradient>
          <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#16a34a" />
            <stop offset="100%" stop-color="#86efac" />
          </linearGradient>
          <filter id="blur-xl">
            <feGaussianBlur stdDeviation="36" />
          </filter>
          <filter id="blur-sm">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>

        <rect width="1040" height="420" rx="34" fill="url(#bg)" />
        <rect x="12" y="12" width="1016" height="396" rx="26" fill="none" stroke="#22c55e" stroke-opacity="0.16" />
        <rect x="38" y="34" width="964" height="352" rx="24" fill="none" stroke="#bbf7d0" stroke-opacity="0.05" />

        <circle cx="144" cy="78" r="132" fill="#16a34a" opacity="0.12" filter="url(#blur-xl)" />
        <circle cx="886" cy="316" r="150" fill="#14532d" opacity="0.26" filter="url(#blur-xl)" />
        <circle cx="760" cy="120" r="84" fill="#22c55e" opacity="0.14" filter="url(#blur-xl)" />

        <path d="M68 324 C182 270, 284 364, 446 310 S772 252, 974 326" stroke="url(#glow)" stroke-opacity="0.18" stroke-width="4" fill="none" />
        <path d="M86 342 C210 304, 320 374, 492 332 S780 286, 950 340" stroke="#86efac" stroke-opacity="0.08" stroke-width="2" fill="none" />

        <g transform="translate(448 60)">
          <circle cx="72" cy="86" r="104" fill="#16a34a" opacity="0.16" filter="url(#blur-sm)" />
          <path d="M72 0 C118 0, 154 28, 154 72 C154 118, 120 152, 72 186 C24 152, -10 118, -10 72 C-10 28, 26 0, 72 0 Z" fill="#06110a" stroke="#86efac" stroke-width="6" />
          <path d="M42 92 L64 114 L106 68" fill="none" stroke="#dcfce7" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
        </g>

        <text x="80" y="82" fill="#f0fdf4" font-family="'Segoe UI', Tahoma, sans-serif" font-size="20" font-weight="700" letter-spacing="2">
          ${escapeXml(settings.brandName.toUpperCase())}
        </text>
        <text x="80" y="112" fill="#86efac" font-family="'Segoe UI', Tahoma, sans-serif" font-size="16">
          ${safeGuildName}
        </text>

        <text x="520" y="286" text-anchor="middle" fill="#f0fdf4" font-family="'Segoe UI', Tahoma, sans-serif" font-size="${activeLocale === 'ar' ? '58' : '64'}" font-weight="700" letter-spacing="${activeLocale === 'ar' ? '1' : '3'}">
          ${escapeXml(t(activeLocale, 'art.verifyNow'))}
        </text>
        <text x="520" y="334" text-anchor="middle" fill="#86efac" font-family="'Segoe UI', Tahoma, sans-serif" font-size="${activeLocale === 'ar' ? '22' : '24'}" letter-spacing="${activeLocale === 'ar' ? '1' : '3'}">
          ${escapeXml(t(activeLocale, 'art.subtitle'))}
        </text>
      </svg>
    `;
  }

  async renderVerificationBanner({ guildName, locale = 'ar' }) {
    const buffer = await sharp(Buffer.from(this.buildSvg({ guildName, locale })))
      .png({ compressionLevel: 9 })
      .toBuffer();

    return {
      buffer,
      filename: `verify-panel-${guildName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'guild'}.png`,
    };
  }
}
