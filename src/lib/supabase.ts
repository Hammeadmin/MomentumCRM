import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Better error handling for missing env vars in production
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = `Missing Supabase environment variables. 
    VITE_SUPABASE_URL: ${supabaseUrl ? 'SET' : 'MISSING'}
    VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'SET' : 'MISSING'}
    
    If deploying to Netlify:
    1. Go to Site Settings → Environment Variables
    2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
    3. Trigger a new deployment (env vars are embedded at build time)`;

  console.error(errorMessage);

  // Show error in the DOM instead of throwing (for debugging)
  if (typeof document !== 'undefined') {
    document.body.innerHTML = `<pre style="color: red; padding: 20px;">${errorMessage}</pre>`;
  }

  throw new Error(errorMessage);
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);