
import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function build() {
  console.log("🚀 Starting Node-based build...");

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
