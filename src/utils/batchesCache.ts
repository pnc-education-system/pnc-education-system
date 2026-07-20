import { selectionBatchesApi } from '@/services/api'
import type { SelectionBatch } from '@/services/api/selectionBatches'

const CACHE_KEY = 'batches_cache'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  data: SelectionBatch[]
  timestamp: number
}

let inMemoryCache: SelectionBatch[] | null = null
let fetchPromise: Promise<SelectionBatch[]> | null = null

function readPersistentCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CacheEntry
  } catch {
    return null
  }
}

function writePersistentCache(batches: SelectionBatch[]): void {
  try {
    const entry: CacheEntry = { data: batches, timestamp: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // localStorage might be full — silently ignore
  }
}

function isCacheFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS
}

/**
 * Get batches instantly from cache (memory or localStorage), or kick off a fetch.
 * Returns the cached data immediately if available, or null if we need to wait.
 */
export function getCachedBatches(): SelectionBatch[] | null {
  // 1. Return in-memory cache if set
  if (inMemoryCache) return inMemoryCache

  // 2. Try localStorage (fast even across page refreshes)
  const persisted = readPersistentCache()
  if (persisted && isCacheFresh(persisted)) {
    inMemoryCache = persisted.data
    return inMemoryCache
  }

  return null
}

/**
 * Kicks off a batch fetch if one hasn't started yet.
 * On success, updates both in-memory and localStorage caches.
 * Safe to call multiple times — only the first call triggers the API.
 */
export function prefetchBatches(): void {
  // If we already have fresh cached data, no need to fetch
  if (getCachedBatches()) return

  if (!fetchPromise) {
    fetchPromise = selectionBatchesApi.list()
    fetchPromise.then((batches) => {
      inMemoryCache = batches
      writePersistentCache(batches)
    }).catch(() => {
      // Reset so the next caller can retry
      fetchPromise = null
      inMemoryCache = null
    })
  }
}

/** Returns the in-flight fetch promise, or null if no fetch is in progress. */
export function getFetchPromise(): Promise<SelectionBatch[]> | null {
  return fetchPromise
}

/** Forces the next call to make a fresh API request and clears all caches. */
export function clearCache(): void {
  inMemoryCache = null
  fetchPromise = null
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
}