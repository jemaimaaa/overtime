import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({ plugins: [react(), VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['icon.svg', 'apple-touch-icon.png'],
  manifest: {
    name: 'Sara Timesheet', short_name: 'Timesheet', description: 'Your hours, simply kept.',
    start_url: '/', scope: '/', display: 'standalone', theme_color: '#f7f5f0', background_color: '#f7f5f0',
    icons: [{src:'/icon-192.png',sizes:'192x192',type:'image/png'}, {src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'}, {src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}],
  },
  workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico}'], navigateFallback: '/index.html' },
})] });
