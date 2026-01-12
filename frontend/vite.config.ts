import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite Configuration for OpenTLU Frontend
 * 
 * Purpose: Development server and build configuration optimized for
 * Three.js 3D experiences and D3.js visualizations with hot module replacement
 * that preserves WebGL context and DOM state.
 * 
 * Key decisions:
 * - Code splitting strategy separates Three.js and D3 into dedicated chunks
 * - Path aliases enable clean imports across the codebase
 * - Optimized deps handling for WebGL and visualization libraries
 * 
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'port-display',
      configureServer(server) {
        let displayed = false;
        server.httpServer?.once('listening', () => {
          const address = server.httpServer?.address();
          const port = typeof address === 'object' && address !== null ? address.port : null;
          const host = typeof address === 'object' && address !== null ? address.address : null;
          
          // Display port clearly after Vite's output - handle IPv6 "::" as localhost
          if (!displayed && port) {
            displayed = true;
            setTimeout(() => {
              const displayHost = host === '::' || host === '0.0.0.0' ? 'localhost' : host || 'localhost';
              const localUrl = `http://${displayHost}:${port}`;
              const networkUrl = host === '::' || host === '0.0.0.0' ? `http://localhost:${port}` : `http://${host}:${port}`;
              
              console.log('\n' + '='.repeat(60));
              console.log('Frontend Development Server');
              console.log('='.repeat(60));
              console.log(`  Local:   ${localUrl}`);
              console.log(`  Network: ${networkUrl}`);
              console.log(`  Port:    ${port}`);
              console.log('='.repeat(60) + '\n');
            }, 200);
          }
        });
      },
      configurePreviewServer(server) {
        let displayed = false;
        server.httpServer?.once('listening', () => {
          const address = server.httpServer?.address();
          const port = typeof address === 'object' && address !== null ? address.port : null;
          const host = typeof address === 'object' && address !== null ? address.address : null;
          
          // Display port clearly after Vite's output - handle IPv6 "::" as localhost
          if (!displayed && port) {
            displayed = true;
            setTimeout(() => {
              const displayHost = host === '::' || host === '0.0.0.0' ? 'localhost' : host || 'localhost';
              const localUrl = `http://${displayHost}:${port}`;
              const networkUrl = host === '::' || host === '0.0.0.0' ? `http://localhost:${port}` : `http://${host}:${port}`;
              
              console.log('\n' + '='.repeat(60));
              console.log('Frontend Preview Server');
              console.log('='.repeat(60));
              console.log(`  Local:   ${localUrl}`);
              console.log(`  Network: ${networkUrl}`);
              console.log(`  Port:    ${port}`);
              console.log('='.repeat(60) + '\n');
            }, 200);
          }
        });
      },
    },
  ],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/stores': resolve(__dirname, './src/stores'),
      '@/types': resolve(__dirname, './src/types'),
      '@/assets': resolve(__dirname, './src/assets'),
      '@/test': resolve(__dirname, './src/__tests__'),
    },
  },

  // Development server configuration
  server: {
    port: 0, // 0 = find free port automatically
    host: true,
    strictPort: false, // Don't fail if port is in use, find another
    // Proxy API requests to backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  
  // Preview server configuration (for production builds)
  preview: {
    port: 0, // 0 = find free port automatically
    host: true,
    strictPort: false,
  },

  // Build optimization
  build: {
    target: 'ES2022',
    outDir: 'dist',
    sourcemap: true,
    // Chunk splitting for optimal caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for stable dependencies
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // State management chunk
          state: ['@tanstack/react-query', 'zustand', 'react-hook-form', 'zod'],
          // Three.js chunk (large, separate for caching)
          three: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          // D3/Visualization chunk
          viz: ['d3', '@visx/visx', 'recharts'],
          // UI components chunk
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip', 'lucide-react'],
        },
      },
    },
    // Size warnings
    chunkSizeWarningLimit: 500,
  },

  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'd3',
    ],
    // Exclude packages that need special handling
    exclude: ['@react-three/postprocessing'],
  },

  // Environment variable handling
  envPrefix: 'VITE_',

  // CSS configuration
  css: {
    postcss: './postcss.config.js',
  },
});
