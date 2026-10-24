// Genera le icone PWA originali (fulmine + linee delle yard). Non usa il logo della squadra.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const out = 'public/icons';
mkdirSync(out, { recursive: true });

const icon = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="g" cx="50%" cy="20%" r="80%">
      <stop offset="0" stop-color="#1D4E9E"/><stop offset="1" stop-color="#0B1F3F"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <g stroke="#F5F7FA" stroke-opacity=".12" stroke-width="6">
    ${[96, 176, 256, 336, 416].map((y) => `<line x1="0" y1="${y}" x2="512" y2="${y}"/>`).join('')}
  </g>
  <g transform="translate(256 256) scale(${1 - pad}) translate(-256 -256)">
    <path d="M300 40 L140 290 H238 L196 472 L380 200 H276 L330 40 Z" fill="#FFC20E" stroke="#0B1F3F" stroke-width="10" stroke-linejoin="round"/>
  </g>
</svg>`;

await sharp(Buffer.from(icon(0.08))).resize(512).png().toFile(`${out}/icon-512.png`);
await sharp(Buffer.from(icon(0.08))).resize(192).png().toFile(`${out}/icon-192.png`);
await sharp(Buffer.from(icon(0.3))).resize(512).png().toFile(`${out}/icon-maskable-512.png`);
console.log('icone generate in', out);
