
import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const LEGACY_ADS_ID = 'AW-701598609';
const NEW_ADS_ID = 'AW-18551375914';

function restoreLegacyAdsTracking(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      restoreLegacyAdsTracking(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

    const original = fs.readFileSync(fullPath, 'utf8');
    const withLegacyId = original.replaceAll(NEW_ADS_ID, LEGACY_ADS_ID);
    let foundLegacyConfig = false;
    const updated = withLegacyId.split('\n').filter((line) => {
      if (line.trim() !== `gtag('config', '${LEGACY_ADS_ID}');`) return true;
      if (foundLegacyConfig) return false;
      foundLegacyConfig = true;
      return true;
    }).join('\n');

    if (updated !== original) {
      fs.writeFileSync(fullPath, updated);
      console.log(`✅ Restored legacy Google Ads tracking in ${fullPath}`);
    }
  }
}

async function build() {
  console.log("🚀 Starting Node-based build...");

  // Use only the existing Ads account across source, localized, and generated
  // HTML. This keeps its existing conversion event snippets while avoiding a
  // second config for the same account.
  restoreLegacyAdsTracking('.');

  if (!fs.existsSync('compiled')) {
    fs.mkdirSync('compiled', { recursive: true });
  }

  try {
    await esbuild.build({
      entryPoints: ['index.tsx'],
      bundle: true,
      minify: true,
      format: 'esm',
      outfile: 'compiled/index.js',
      jsx: 'automatic',
      define: {
        'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || '')
      },
      external: [
        'react',
        'react/*',
        'react-dom',
        'react-dom/*',
        'framer-motion',
        'lucide-react',
        'recharts',
        'three',
        '@react-three/fiber',
        '@react-three/drei',
        '@google/genai'
      ],
      // We are using external for these because the index.html has an importmap
    });

    console.log("✅ Build completed successfully.");
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

build();
