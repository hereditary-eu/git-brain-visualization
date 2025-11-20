import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

const itkConfig = path.resolve(__dirname, 'src', 'itkConfig.js')

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV == 'development' ? '' : process.env.APPLICATION_ENDPOINT,
  plugins: [
    vue(),
    // put lazy loaded JavaScript and Wasm bundles in dist directory
    viteStaticCopy({
      targets: [
        { src: 'node_modules/itk-wasm/dist/web-workers/*', dest: 'assets/itk/web-workers' },
        {
          src: 'node_modules/itk-image-io/*',
          dest: 'assets/itk/image-io',
        },
        {
          src: 'src/assets/example-data/*',
          dest: 'assets/example-data',
        },        
      ],
    }),
  ],
  assetsInclude: ['**/*.nii','**/*.nii.gz','**/*.txt','**/*.xlsx'],
  resolve: {
    // where itk-wasm code has 'import ../itkConfig.js` point to the path of itkConfig
    alias: {
      '../itkConfig.js': itkConfig,
      '../../itkConfig.js': itkConfig
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "bootstrap/scss/bootstrap";`
      }
    }
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['itk-wasm', '@itk-wasm/image-io']
  },
  esbuild: {
    minifyIdentifiers: true
  },
})
