export function tokenForEndpoint(endpoint: string, supplied: string | undefined, previous?: { endpoint: string; token?: string }) {
  if (supplied) return supplied;
  if (!previous?.token) return undefined;
  try { return new URL(previous.endpoint).origin === new URL(endpoint).origin ? previous.token : undefined; }
  catch { return undefined; }
}
