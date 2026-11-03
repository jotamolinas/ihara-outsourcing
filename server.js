
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000; // Requirement: Port 3000

const BASE_DIRS = ["dist", "compiled", "."];

const supportedLangs = ['en', 'pt', 'jp', 'de', 'zh', 'ar'];

app.use((req, res, next) => {
  const host = req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'];
  
  if (proto === 'http' && host === 'www.iharaoutsourcing.com') {
    return res.redirect(301, `https://${host}${req.url}`);
  }

  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  // res.setHeader("X-Frame-Options", "DENY"); // REMOVED: This blocks the iFrame preview
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' wss: https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; frame-src 'self' https:;");
  
  next();
});

// Helper to find the active serving directory that contains index.html
const getActiveDir = () => {
  for (const dir of BASE_DIRS) {
    const p = path.join(__dirname, dir, 'index.html');
    if (fs.existsSync(p)) {
      return dir;
    }
  }
  // Fallback to '.' if index.html exists in root, otherwise default to 'compiled'
  return fs.existsSync(path.join(__dirname, 'index.html')) ? '.' : 'compiled';
};

const activeDir = getActiveDir();
console.log(`[Ihara-Server] Detected active assets directory: ${activeDir}`);

// Serve static files from the active directory with cache control
app.use(express.static(activeDir, {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Fallback: If activeDir is not '.' but we also need fallback from 'compiled', serve them
if (activeDir !== 'compiled') {
  app.use(express.static('compiled', {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
}

// Fallback: Also serve from root '.' specifically if activeDir is not '.'
if (activeDir !== '.') {
  app.use(express.static('.', {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
}

// SPA Routing - Express 5 catch-all using Regex for compatibility
app.get(/^(?!\/api).+/, (req, res) => {
  const urlPath = req.path;
  const langMatch = urlPath.match(/^\/([a-z]{2})(\/|$)/);
  const lang = langMatch ? langMatch[1] : '';

  const currentActiveDir = getActiveDir();
  let indexPath = '';
  
  if (lang && supportedLangs.includes(lang)) {
    const langPath = path.join(__dirname, currentActiveDir, lang, 'index.html');
    if (fs.existsSync(langPath)) {
      indexPath = langPath;
    } else {
      const langRoot = path.join(__dirname, lang, 'index.html');
      if (fs.existsSync(langRoot)) {
        indexPath = langRoot;
      }
    }
  }

  if (!indexPath) {
    const defaultIndex = path.join(__dirname, currentActiveDir, 'index.html');
    if (fs.existsSync(defaultIndex)) {
      indexPath = defaultIndex;
    } else {
      // Dynamic fallback cascades
      const attempts = [
        path.join(__dirname, 'dist', 'index.html'),
        path.join(__dirname, 'compiled', 'index.html'),
        path.join(__dirname, 'index.html')
      ];
      for (const attempt of attempts) {
        if (fs.existsSync(attempt)) {
          indexPath = attempt;
          break;
        }
      }
    }
  }

  if (!indexPath) {
    indexPath = path.join(__dirname, 'compiled', 'index.html');
  }

  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`[Ihara-Server] Error sending file (${indexPath}):`, err.message);
      if (!res.headersSent) {
        res.status(500).send("Ihara Outsourcing: El servidor está iniciando o compilando los archivos. Por favor, recargue en unos instantes.");
      }
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Ihara-Server] Port: ${PORT} | Mode: Node.js SPA Routing | Active Directory: ${getActiveDir()}`);
});
