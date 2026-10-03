// Every call to the Studio API goes through here.
//
// The API refuses any request that does not carry the studio token (see
// src/auth.ts in meraki-studio-api). This page is public, so it cannot hold
// that token itself. The person using it pastes the token in once, and it is
// kept in this browser tab's session storage: it is never put in a URL, never
// written to disk by this app, and it is gone when the tab closes.

const API = import.meta.env.VITE_API_URL || '';
const KEY = 'meraki-studio-token';

/** Thrown when the API says the token is missing or wrong. */
export class UnauthorizedError extends Error {
  constructor() {
    super('The studio token was not accepted.');
    this.name = 'UnauthorizedError';
  }
}

/** Thrown when the server itself has no token configured and refuses everyone. */
export class LockedError extends Error {
  constructor() {
    super('The Studio API is locked. STUDIO_API_TOKEN is not set on the server.');
    this.name = 'LockedError';
  }
}

function read(): string {
  try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; }
}

let token = read();

export function hasToken(): boolean {
  return token.length > 0;
}

export function setToken(value: string): void {
  token = value.trim();
  try { sessionStorage.setItem(KEY, token); } catch { /* the token still works for this page load */ }
}

export function clearToken(): void {
  token = '';
  try { sessionStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}

/** fetch() against the Studio API with the token attached. */
export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await window.fetch(`${API}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event('studio-unauthorized'));
    throw new UnauthorizedError();
  }
  if (res.status === 503) throw new LockedError();
  return res;
}

/** One MCP tool call, returning the parsed JSON-RPC response. */
export async function callTool(name: string, args: Record<string, unknown>) {
  const res = await api('/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params: { name, arguments: args }, id: Date.now() }),
  });
  return res.json();
}
