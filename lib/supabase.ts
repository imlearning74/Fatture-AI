
import { createClient } from '@supabase/supabase-js';

// Queste variabili vengono lette dall'ambiente durante la build su GitHub
// Se stai testando in locale, assicurati di avere un file .env
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Attenzione: Credenziali Supabase mancanti. L'app non potrà salvare i dati.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
