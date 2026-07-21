/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_SUPABASE_URL?: string;
  readonly VITE_ADMIN_SUPABASE_ANON_KEY?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_MQTT_URL?: string;
  readonly VITE_SMTP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
