(() => {
  const { supabaseUrl, supabaseAnonKey } = window.SKADI_CONFIG || {};
  if (!supabaseUrl || !supabaseAnonKey || !window.supabase) {
    console.error("Supabase client não inicializado.");
    return;
  }

  window.skadiSb = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
})();
