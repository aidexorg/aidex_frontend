/** Default matches docker-compose / README-DEV when VITE_API_BASE is unset at build time. */
const DEFAULT_API_BASE = 'http://localhost:3000/api/v1';

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE?.trim();
  return configured || DEFAULT_API_BASE;
}
