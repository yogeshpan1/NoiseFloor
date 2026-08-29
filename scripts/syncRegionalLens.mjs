#!/usr/bin/env node
/**
 * Regenerates src/data/regionalLens.js from
 * NoiseFloor_share/gdelt-dashboard/data/extended/extended.json (produced
 * by that project's backend/build_extended.py, or its cache-only sibling
 * backend/extract_partial_extended.py for partial-progress snapshots).
 *
 * Run any time GDELT has fetched more of the Regional Lens dataset:
 *   node scripts/syncRegionalLens.mjs
 *
 * Only rewrites keys that are actually present in extended.json — a key
 * absent from the source file is left untouched (still null) rather than
 * cleared, so a partial extended.json can never regress an already-synced
 * page back to "pending".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENDED_JSON = path.resolve(
  __dirname,
  '../../NoiseFloor_share/gdelt-dashboard/data/extended/extended.json',
);
const OUT = path.resolve(__dirname, '../src/data/regionalLens.js');

function jsLiteral(v, indent = 0) {
  return JSON.stringify(v, null, 2).replace(/^/gm, '  '.repeat(indent)).trimStart();
}

function main() {
  if (!fs.existsSync(EXTENDED_JSON)) {
    console.error(`Not found: ${EXTENDED_JSON}\nRun backend/build_extended.py or backend/extract_partial_extended.py in NoiseFloor_share first.`);
    process.exit(1);
  }
  const ext = JSON.parse(fs.readFileSync(EXTENDED_JSON, 'utf-8'));
  const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf-8') : '';

  const has = (k) => Object.prototype.hasOwnProperty.call(ext, k) && ext[k] != null;

  const neighbourMatrix = has('neighbour_matrix') ? ext.neighbour_matrix : 'KEEP';
  const crossReaction = has('cross_reaction') ? ext.cross_reaction : 'KEEP';
  const dividend = has('dividend') ? ext.dividend : 'KEEP';

  const extractCurrent = (name) => {
    const m = existing.match(new RegExp(`export const ${name} = ([\\s\\S]*?);\\n`));
    return m ? m[1].trim() : 'null';
  };

  const nmOut = neighbourMatrix === 'KEEP' ? extractCurrent('NEIGHBOUR_MATRIX') : jsLiteral(neighbourMatrix);
  const crOut = crossReaction === 'KEEP' ? extractCurrent('CROSS_REACTION') : jsLiteral(crossReaction);
  const dvOut = dividend === 'KEEP' ? extractCurrent('DIVIDEND_EXTENDED') : jsLiteral(dividend);

  const generated = ext.generated || new Date().toISOString();
  const partial = ext.partial ? ' (partial)' : '';

  const content = `/**
 * Regional Lens data — synced from NoiseFloor_share's extended.json${partial}.
 * Source generated: ${generated}
 * Regenerate: node scripts/syncRegionalLens.mjs
 * DO NOT hand-edit — re-run the sync script instead.
 */

export const NEIGHBOUR_MATRIX = ${nmOut};

export const CROSS_REACTION = ${crOut};

export const DIVIDEND_EXTENDED = ${dvOut};
`;

  fs.writeFileSync(OUT, content);
  console.log(`Wrote ${OUT}`);
  console.log(`  NEIGHBOUR_MATRIX: ${neighbourMatrix === 'KEEP' ? 'unchanged' : `${neighbourMatrix.length} rows`}`);
  console.log(`  CROSS_REACTION:   ${crossReaction === 'KEEP' ? 'unchanged' : 'populated'}`);
  console.log(`  DIVIDEND_EXTENDED: ${dividend === 'KEEP' ? 'unchanged' : 'populated'}`);
}

main();
