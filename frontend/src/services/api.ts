const DEFAULT_BASE_URL = 'http://localhost:8000'

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_BASE_URL

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GET ${path} failed (${res.status}): ${text || res.statusText}`)
  }
  return (await res.json()) as T
}

