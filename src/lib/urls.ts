// Browser-safe helpers only (the address checker lives in normalizeUrl.ts, server-side).
// Screenshot link for the browser. The files API checks they're yours.
export const fileUrl = (prefix: string, file: string) => `/api/files/${prefix}/${file}`;
