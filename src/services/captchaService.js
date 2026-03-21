import crypto from 'node:crypto';
import sharp from 'sharp';

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class CaptchaService {
  constructor() {
    this.alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    this.palette = ['#f0fdf4', '#dcfce7', '#bbf7d0', '#4ade80', '#22c55e'];
  }

  generateCode(length = 6) {
    return Array.from({ length }, () => {
      const index = crypto.randomInt(0, this.alphabet.length);
      return this.alphabet[index];
    }).join('');
  }

  buildNoise(width, height) {
    return Array.from({ length: 16 }, () => {
      const x1 = randomBetween(0, width);
      const y1 = randomBetween(0, height);
      const x2 = randomBetween(0, width);
      const y2 = randomBetween(0, height);
      const opacity = Math.random() * 0.22 + 0.08;
      const stroke = this.palette[randomBetween(0, this.palette.length - 1)];
      return `<path d="M ${x1} ${y1} Q ${randomBetween(0, width)} ${randomBetween(0, height)} ${x2} ${y2}" stroke="${stroke}" stroke-width="${randomBetween(1, 3)}" fill="none" opacity="${opacity}" />`;
    }).join('');
  }

  buildCharacters(code) {
    return code
      .split('')
      .map((character, index) => {
        const x = 34 + index * 56 + randomBetween(-5, 5);
        const y = 86 + randomBetween(-7, 7);
        const rotate = randomBetween(-20, 20);
        const skew = randomBetween(-10, 10);
        const size = randomBetween(40, 52);
        const fill = this.palette[randomBetween(0, this.palette.length - 1)];

        return [
          `<g transform="translate(${x}, ${y}) rotate(${rotate}) skewX(${skew})">`,
          `<text x="0" y="0" font-family="'Segoe UI', Tahoma, sans-serif" font-size="${size}" font-weight="700" fill="${fill}">${character}</text>`,
          '</g>',
        ].join('');
      })
      .join('');
  }

  buildSvg(code) {
    const width = 340;
    const height = 140;
    const dots = Array.from({ length: 50 }, () => {
      const cx = randomBetween(0, width);
      const cy = randomBetween(0, height);
      const radius = Math.random() * 2 + 0.5;
      const opacity = Math.random() * 0.25 + 0.05;
      return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="#f8fafc" opacity="${opacity}" />`;
    }).join('');

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#010201" />
            <stop offset="50%" stop-color="#06110a" />
            <stop offset="100%" stop-color="#0d2214" />
          </linearGradient>
          <filter id="blur">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <rect width="${width}" height="${height}" rx="26" fill="url(#g)" />
        <rect x="8" y="8" width="${width - 16}" height="${height - 16}" rx="20" fill="none" stroke="#22c55e" stroke-opacity="0.35" />
        <ellipse cx="78" cy="34" rx="90" ry="30" fill="#16a34a" opacity="0.18" filter="url(#blur)" />
        <ellipse cx="275" cy="105" rx="72" ry="34" fill="#14532d" opacity="0.22" filter="url(#blur)" />
        ${this.buildNoise(width, height)}
        ${dots}
        ${this.buildCharacters(code)}
      </svg>
    `;
  }

  async render(code) {
    const svg = this.buildSvg(code);
    const buffer = await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9 })
      .toBuffer();

    const token = crypto.randomBytes(6).toString('hex');

    return {
      buffer,
      filename: `aegis-captcha-${token}.png`,
    };
  }
}
