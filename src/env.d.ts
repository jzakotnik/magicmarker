// ==========================
// src/env.d.ts (TypeScript types for Vite env)
// ==========================
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_AZURE_OPENAI_ENDPOINT: string;
  readonly VITE_AZURE_OPENAI_API_KEY: string;
  readonly VITE_AZURE_OPENAI_DEPLOYMENT: string;
  readonly VITE_AZURE_OPENAI_API_VERSION?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
