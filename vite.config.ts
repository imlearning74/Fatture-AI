
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Aggiornato con il nome del tuo repository reale rilevato dai log di errore
  base: '/Fatture-AI/', 
  define: {
    'process.env': {
      API_KEY: process.env.API_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    }
  }
});

