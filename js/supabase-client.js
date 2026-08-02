const config = window.APP_CONFIG || {};

export const hasSupabase = Boolean(
  config.supabaseUrl &&
  config.supabaseAnonKey &&
  !config.supabaseUrl.includes("YOUR_")
);

export const supabaseClient = hasSupabase
  ? window.supabase.createClient(
      config.supabaseUrl,
      config.supabaseAnonKey
    )
  : null;

export function requireSupabase() {
  if (!supabaseClient) {
    throw new Error("Supabase is not configured or available.");
  }

  return supabaseClient;
}

