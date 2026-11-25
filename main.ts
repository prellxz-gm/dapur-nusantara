// main.ts — entrypoint: copy game/ and screenshots/ beside it to the output
// dir and write /output/dossier.json via buildDossier from vendor/makefun-game.ts.
// Node 22 stdlib only.
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

await mkdir(outputDir, { recursive: true });
await cp(join(here, 'game'), join(outputDir, 'game'), { recursive: true });
await cp(join(here, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const dossierBytes = buildDossier(outputDir, caps);
await writeFile(join(outputDir, 'dossier.json'), dossierBytes);
console.log(`copied game/ and screenshots/ to ${outputDir}`);
console.log(`wrote ${join(outputDir, 'dossier.json')} (${dossierBytes.length} bytes)`);
