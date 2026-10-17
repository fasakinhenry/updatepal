// one place for env access. only VITE_ values reach the browser, never put secrets here.
const str = (v: unknown, d: string) => (typeof v === "string" && v ? v : d);
export const env = {
  appUrl: str(import.meta.env.VITE_APP_URL, "http://localhost:5173"),
  apiBase: str(import.meta.env.VITE_API_BASE_URL, "http://localhost:4000/api"),
  dicebear: str(import.meta.env.VITE_DICEBEAR_BASE_URL, "https://api.dicebear.com/9.x"),
  mockAi: import.meta.env.VITE_AI_MOCK_MODE !== "false",
};
