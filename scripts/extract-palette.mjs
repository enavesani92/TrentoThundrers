// Estrae la palette dominante dai file logo/foto con k-means sui pixel.
// Uso: node scripts/extract-palette.mjs public/brand/logogiallo.jpg [altri file...] [--k=6]
import sharp from 'sharp';

const args = process.argv.slice(2);
const k = Number((args.find((a) => a.startsWith('--k=')) ?? '--k=6').slice(4));
const files = args.filter((a) => !a.startsWith('--'));
if (!files.length) {
  console.error('Uso: node scripts/extract-palette.mjs <file...> [--k=6]');
  process.exit(1);
}

const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

async function pixels(file) {
  const { data, info } = await sharp(file).resize(160, 160, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = [];
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 128) continue; // ignora i pixel trasparenti
    out.push([data[i], data[i + 1], data[i + 2]]);
  }
  return out;
}

function kmeans(px, k, iters = 30) {
  // init deterministica: k pixel equidistanti dopo ordinamento per luminanza
  const sorted = [...px].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  let centers = Array.from({ length: k }, (_, i) => sorted[Math.floor(((i + 0.5) / k) * sorted.length)].slice());
  let counts = [];
  for (let it = 0; it < iters; it++) {
    const sums = centers.map(() => [0, 0, 0]);
    counts = centers.map(() => 0);
    for (const p of px) {
      let best = 0;
      for (let c = 1; c < k; c++) if (dist(p, centers[c]) < dist(p, centers[best])) best = c;
      sums[best][0] += p[0]; sums[best][1] += p[1]; sums[best][2] += p[2];
      counts[best]++;
    }
    centers = centers.map((c, i) => (counts[i] ? sums[i].map((s) => s / counts[i]) : c));
  }
  return centers.map((c, i) => ({ hex: hex(c), share: counts[i] / px.length })).sort((a, b) => b.share - a.share);
}

for (const file of files) {
  const px = await pixels(file);
  console.log(`\n${file} (${px.length} pixel opachi)`);
  for (const { hex: h, share } of kmeans(px, k)) console.log(`  ${h}  ${(share * 100).toFixed(1)}%`);
}
