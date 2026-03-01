import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

function copyPublicAssetsPlugin() {
  return {
    name: 'copy-public-assets',
    writeBundle() {
      const publicDir = 'public';
      const outDir = 'dist';

      function copyDir(src: string, dest: string) {
        if (!existsSync(src)) return;

        mkdirSync(dest, { recursive: true });
        const entries = readdirSync(src);

        for (const entry of entries) {
          // Skip files with "copy" in the name
          if (entry.toLowerCase().includes('copy')) continue;

          const srcPath = join(src, entry);
          const destPath = join(dest, entry);

          try {
            if (statSync(srcPath).isDirectory()) {
              copyDir(srcPath, destPath);
            } else {
              copyFileSync(srcPath, destPath);
            }
          } catch (err) {
            // Skip files that can't be accessed
            console.warn(`Skipping ${entry}: ${err}`);
          }
        }
      }

      // Only copy specific directories to avoid locked files
      const dirsToCopy = ['assets'];
      for (const dir of dirsToCopy) {
        copyDir(join(publicDir, dir), join(outDir, dir));
      }

      // Copy brand directory with filtering
      copyDir(join(publicDir, 'brand'), join(outDir, 'brand'));

      // Copy root files
      const rootFiles = ['_headers', '_redirects', 'manifest.webmanifest'];
      for (const file of rootFiles) {
        try {
          copyFileSync(join(publicDir, file), join(outDir, file));
        } catch (err) {
          // File might not exist
        }
      }
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), copyPublicAssetsPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
  build: {
    copyPublicDir: false, // We handle copying with our custom plugin
  },
});
