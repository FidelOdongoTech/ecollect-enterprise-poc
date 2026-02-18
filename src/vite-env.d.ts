/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GROQ_API_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_URL?: string; // Opt Direct PostgreSQL API URL
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
