// Public settings for the browser. The publishable (anon) key is safe to ship: row level security decides what it can do.
window.WORKBENCH = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseKey: "YOUR-PUBLISHABLE-KEY",
  schema: "public"   // the Postgres schema the tables live in
};
