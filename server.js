#!/usr/bin/env node
import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname, normalize } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 8080;
const DIST_DIR = join(__dirname, 'dist');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'application/font-woff',
  '.woff2': 'application/font-woff2',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.br': 'application/brotli',
  '.gz': 'application/gzip',
};

async function getFile(pathname) {
  // Normalize path to prevent directory traversal
  const normalizedPath = normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  
  // Try direct file path first
  let filePath = join(DIST_DIR, normalizedPath);
  
  try {
    const stats = await stat(filePath);
    if (stats.isFile()) {
      return filePath;
    }
    if (stats.isDirectory()) {
      // Try index.html in directory
      const indexPath = join(filePath, 'index.html');
      const indexStats = await stat(indexPath);
      if (indexStats.isFile()) {
        return indexPath;
      }
    }
  } catch (e) {
    // File doesn't exist, continue to try alternatives
  }
  
  // Try with .html extension
  if (!extname(normalizedPath)) {
    const htmlPath = join(DIST_DIR, normalizedPath + '.html');
    try {
      const stats = await stat(htmlPath);
      if (stats.isFile()) {
        return htmlPath;
      }
    } catch (e) {
      // Continue
    }
    
    // Try directory with index.html
    const dirIndexPath = join(DIST_DIR, normalizedPath, 'index.html');
    try {
      const stats = await stat(dirIndexPath);
      if (stats.isFile()) {
        return dirIndexPath;
      }
    } catch (e) {
      // Continue
    }
  }
  
  // Fallback to index.html for SPA routing
  const fallbackPath = join(DIST_DIR, 'index.html');
  try {
    const stats = await stat(fallbackPath);
    if (stats.isFile()) {
      return fallbackPath;
    }
  } catch (e) {
    // index.html doesn't exist
  }
  
  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = url.pathname;
  
  // Default to index for root
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  const filePath = await getFile(pathname);
  
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }
  
  try {
    const content = await readFile(filePath);
    const ext = extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Handle compressed files
    const acceptEncoding = req.headers['accept-encoding'] || '';
    let finalContent = content;
    let contentEncoding = null;
    
    if (acceptEncoding.includes('br') && filePath.endsWith('.br')) {
      contentEncoding = 'br';
      // Remove .br extension to get original content type
      const originalExt = extname(filePath.slice(0, -3));
      res.setHeader('Content-Type', mimeTypes[originalExt] || contentType);
    } else if (acceptEncoding.includes('gzip') && filePath.endsWith('.gz')) {
      contentEncoding = 'gzip';
      const originalExt = extname(filePath.slice(0, -3));
      res.setHeader('Content-Type', mimeTypes[originalExt] || contentType);
    } else {
      res.setHeader('Content-Type', contentType);
    }
    
    if (contentEncoding) {
      res.setHeader('Content-Encoding', contentEncoding);
    }
    
    // Cache headers
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    
    res.writeHead(200);
    res.end(finalContent);
  } catch (error) {
    console.error('Error serving file:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving files from ${DIST_DIR}`);
});

