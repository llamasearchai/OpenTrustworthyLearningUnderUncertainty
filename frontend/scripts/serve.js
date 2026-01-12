#!/usr/bin/env node

/**
 * Production Server Script
 * 
 * Builds and serves the frontend application on a free port.
 * Automatically finds an available port and displays the URL.
 */

import { build, preview } from 'vite';
import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function findFreePort(startPort = 3000) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        findFreePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

async function buildApp() {
  console.log('Building frontend application...');
  try {
    const { execSync } = await import('child_process');
    execSync('npm run build', { 
      cwd: rootDir, 
      stdio: 'inherit',
      shell: true 
    });
    console.log('Build completed successfully!');
    return true;
  } catch (error) {
    console.error('Build failed:', error);
    return false;
  }
}

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

async function serveProduction() {
  console.log('\nStarting production server...');
  
  // Use vite preview for serving production build (automatically finds free port)
  const server = await preview({
    root: rootDir,
    preview: {
      port: 0, // 0 = find free port
      host: true,
      strictPort: false,
    },
  });
  
  const port = server.config.server.port;
  const address = server.httpServer?.address();
  const actualPort = typeof address === 'object' && address !== null ? address.port : port;
  
  const url = `http://localhost:${actualPort || port}`;
  const networkUrl = `http://${getLocalIP()}:${actualPort || port}`;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Frontend is running at:`);
  console.log(`  Local:   ${url}`);
  console.log(`  Network: ${networkUrl}`);
  console.log(`  Port:    ${actualPort || port}`);
  console.log(`${'='.repeat(60)}\n`);
  
  return server;
}

async function main() {
  const args = process.argv.slice(2);
  const skipBuild = args.includes('--skip-build') || args.includes('-s');
  
  if (!skipBuild) {
    const buildSuccess = await buildApp();
    if (!buildSuccess) {
      process.exit(1);
    }
  }
  
  await serveProduction();
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
