
import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const LEGACY_ADS_CONFIG = /^\s*gtag\('config',\s*'AW-701598609'\);\s*\r?\n/gm;
const LEGACY_PAGEVIEW_CONVERSION = /\s*<!-- Event snippet for Vista de una página conversion page -->\s*<script>\s*gtag\('event',\s*'conversion',\s*\{'send_to':\s*'AW-701598609\/6brYCKeL9-IcEJGXxs4C'\}\);\s*<\/script>/g;

function removeLegacyAdsTracking(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      removeLegacyAdsTracking(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

    const original = fs.readFileSync(fullPath, 'utf8');
    const updated = original
      .replace(LEGACY_ADS_CONFIG, '')
      .replace(LEGACY_PAGEVIEW_CONVERSION, '');

    if (updated !== original) {
      fs.writeFileSync(fullPath, updated);
      console.log(`✅ Removed legacy Google Ads configuration from ${fullPath}`);
    }
  }
}

async function build() {
  console.log("🚀 Starting Node-based build...");

  // Keep the new Google Ads tag and WhatsApp conversion tracking, but remove
  // the retired account configuration and its outdated page-view conversion
  // from source and generated HTML pages before they are published.
  removeLegacyAdsTracking('.');

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
