// Dev-only, one-off asset generator. Run with: node scripts/generateEarthTexture.mjs
// Produces (all committed to src/assets/):
//   textures/earth-gold-equirect.png  — stylized gold-continent/navy-ocean globe texture
//   nepal-outline.svg                 — Nepal's polygon, for the Hero parallax background
//   world-110m.geo.json               — country-level GeoJSON, reused by WorldMap.jsx
// Source data: world-atlas (Natural Earth 110m TopoJSON, public domain, no attribution required).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as topojson from 'topojson-client';
import { geoEquirectangular, geoPath } from 'd3-geo';
import sharp from 'sharp';
import iso from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json' with { type: 'json' };

iso.registerLocale(en);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'src/assets');
const texturesDir = path.join(assetsDir, 'textures');
fs.mkdirSync(texturesDir, { recursive: true });

const landTopo = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/world-atlas/land-110m.json'), 'utf8'));
const countriesTopo = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/world-atlas/countries-110m.json'), 'utf8'));

const land = topojson.feature(landTopo, landTopo.objects.land);
const countries = topojson.feature(countriesTopo, countriesTopo.objects.countries);

// ---------------------------------------------------------------------------
// 1. Globe texture — equirectangular gold-on-navy PNG, with Nepal/India/China
//    rendered as distinctly colored, individually-bordered countries (not just
//    part of the generic landmass blob) so the story's three protagonists are
//    identifiable on the globe itself.
// ---------------------------------------------------------------------------
const W = 2048;
const H = 1024;
const projection = geoEquirectangular().translate([W / 2, H / 2]).scale(W / (2 * Math.PI));
const path2 = geoPath(projection);

const landPathD = path2(land);

// Natural Earth numeric ISO-3166 ids.
const NEPAL_ID = '524';
const INDIA_ID = '356';
const CHINA_ID = '156';

const nepalFeature2 = countries.features.find((f) => f.id === NEPAL_ID);
const indiaFeature = countries.features.find((f) => f.id === INDIA_ID);
const chinaFeature = countries.features.find((f) => f.id === CHINA_ID);

const indiaPathD = path2(indiaFeature);
const chinaPathD = path2(chinaFeature);
const nepalPathD2 = path2(nepalFeature2);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f4d03f" />
      <stop offset="50%" stop-color="#d4af37" />
      <stop offset="100%" stop-color="#f4d03f" />
    </linearGradient>
    <filter id="nepalGlow" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#0b1a3a" />
  <path d="${landPathD}" fill="url(#goldGrad)" stroke="#f4d03f" stroke-width="0.6" stroke-opacity="0.5" />
  <path d="${indiaPathD}" fill="#ff4444" fill-opacity="0.85" stroke="#ff8080" stroke-width="1.1" />
  <path d="${chinaPathD}" fill="#00ffff" fill-opacity="0.55" stroke="#7dffff" stroke-width="1.1" />
  <g filter="url(#nepalGlow)">
    <path d="${nepalPathD2}" fill="#fff6d8" stroke="#ffffff" stroke-width="1.6" />
  </g>
</svg>`;

fs.writeFileSync(path.join(texturesDir, 'earth-gold-equirect.svg'), svg);

await sharp(Buffer.from(svg)).resize(W, H).png().toFile(path.join(texturesDir, 'earth-gold-equirect.png'));

console.log('Wrote textures/earth-gold-equirect.png (%dx%d)', W, H);

// ---------------------------------------------------------------------------
// 2. Nepal outline SVG — for Hero parallax background
// ---------------------------------------------------------------------------
const nepalFeature = countries.features.find((f) => f.id === '524');
if (!nepalFeature) throw new Error('Nepal feature not found in countries-110m.json');

const nepalProjection = geoEquirectangular().fitSize([600, 400], nepalFeature);
const nepalPath = geoPath(nepalProjection);
const nepalD = nepalPath(nepalFeature);

const nepalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <path d="${nepalD}" fill="none" stroke="#d4af37" stroke-width="1.5" />
</svg>`;

fs.writeFileSync(path.join(assetsDir, 'nepal-outline.svg'), nepalSvg);
console.log('Wrote nepal-outline.svg');

// ---------------------------------------------------------------------------
// 3. World GeoJSON (country-level, with alpha-3 codes attached) — for WorldMap.jsx
// ---------------------------------------------------------------------------
const worldProjection = geoEquirectangular().translate([500, 250]).scale(500 / Math.PI);
const worldPath = geoPath(worldProjection);

const features = countries.features
  .map((f) => {
    const alpha3 = iso.numericToAlpha3(f.id) || null;
    return {
      type: 'Feature',
      id: f.id,
      properties: { name: f.properties.name, code: alpha3 },
      pathD: worldPath(f),
    };
  })
  .filter((f) => f.pathD);

fs.writeFileSync(
  path.join(assetsDir, 'world-110m.geo.json'),
  JSON.stringify({ width: 1000, height: 500, features }),
);
console.log('Wrote world-110m.geo.json (%d country paths)', features.length);
