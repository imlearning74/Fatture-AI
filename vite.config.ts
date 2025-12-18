
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SOSTITUISCI 'gestore-fatture' con il nome esatto del tuo repository su GitHub
export default defineConfig({
  plugins: [react()],
  base: '/gestore-fatture/', 
  define: {
    'process.env': {
      API_KEY: process.env.API_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    }
  }
});
