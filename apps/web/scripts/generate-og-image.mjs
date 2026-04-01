import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '..', 'public', 'og-image.png');

const WIDTH = 1200;
const HEIGHT = 630;

// PawMeet brand colors
const PRIMARY = '#065F46'; // emerald-800
const BG = '#FAFAF9';      // warm neutral
const ACCENT = '#D97706';   // amber-600

// Paw icon (scaled from favicon.svg)
const pawSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="120" height="120" fill="${BG}">
  <circle cx="18" cy="10" r="6"/>
  <circle cx="38" cy="8" r="7"/>
  <circle cx="54" cy="14" r="5"/>
  <circle cx="10" cy="22" r="5"/>
  <ellipse cx="32" cy="38" rx="18" ry="22"/>
</svg>`;

// Full SVG layout
const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${PRIMARY}"/>
      <stop offset="100%" stop-color="#064E3B"/>
    </linearGradient>
    <!-- Subtle radial glow -->
    <radialGradient id="glow" cx="70%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>

  <!-- Decorative line -->
  <rect x="80" y="200" width="60" height="3" rx="1.5" fill="${ACCENT}"/>

  <!-- PawMeet text -->
  <text x="80" y="290" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="72" font-weight="700" fill="${BG}" letter-spacing="-1">
    PawMeet
  </text>

  <!-- Tagline -->
  <text x="80" y="350" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="30" fill="${BG}" opacity="0.85">
    Trova il compagno di passeggiata
  </text>
  <text x="80" y="392" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="30" fill="${BG}" opacity="0.85">
    ideale per il tuo cane
  </text>

  <!-- URL badge -->
  <rect x="80" y="460" width="220" height="40" rx="20" fill="${BG}" opacity="0.15"/>
  <text x="190" y="487" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="18" fill="${BG}" opacity="0.9" text-anchor="middle" font-weight="500">
    pawmeet.io
  </text>

  <!-- Paw icon (right side) -->
  <g transform="translate(880, 180)" opacity="0.9">
    <svg viewBox="0 0 64 64" width="240" height="240" fill="${BG}" opacity="0.12">
      <circle cx="18" cy="10" r="6"/>
      <circle cx="38" cy="8" r="7"/>
      <circle cx="54" cy="14" r="5"/>
      <circle cx="10" cy="22" r="5"/>
      <ellipse cx="32" cy="38" rx="18" ry="22"/>
    </svg>
    <svg viewBox="0 0 64 64" width="140" height="140" x="50" y="50" fill="${BG}">
      <circle cx="18" cy="10" r="6"/>
      <circle cx="38" cy="8" r="7"/>
      <circle cx="54" cy="14" r="5"/>
      <circle cx="10" cy="22" r="5"/>
      <ellipse cx="32" cy="38" rx="18" ry="22"/>
    </svg>
  </g>

  <!-- Bottom accent bar -->
  <rect x="0" y="${HEIGHT - 6}" width="${WIDTH}" height="6" fill="${ACCENT}"/>
</svg>`;

await sharp(Buffer.from(svg)).png({ quality: 90 }).toFile(OUTPUT);
console.log(`OG image generated: ${OUTPUT}`);
