const SUPABASE_CONFIG = {
  URL: 'https://inyfjzcasgebkjgveudt.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlueWZqemNhc2dlYmtqZ3ZldWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NTEwNjMsImV4cCI6MjEwMTUyNzA2M30.4auPDJqFxZB-LIqyYMks3eYBh0_tkfo9siEKM3QRHkA',
  STORAGE_BUCKET: 'archivos-obras'
};

let supabaseClient = null;

function initSupabase() {
  if (typeof supabase !== 'undefined' && SUPABASE_CONFIG.URL && SUPABASE_CONFIG.ANON_KEY
      && !SUPABASE_CONFIG.URL.includes('TU_URL') && !SUPABASE_CONFIG.ANON_KEY.includes('TU_ANON')) {
    supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    return supabaseClient;
  }
  console.warn('⚠️ Supabase no configurado. Abre js/config.js e introduce tu URL y anon key.');
  return null;
}

function getSupabase() {
  return supabaseClient || initSupabase();
}

window.getSupabase = getSupabase;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
