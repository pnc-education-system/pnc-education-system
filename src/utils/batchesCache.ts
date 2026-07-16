import { selectionBatchesApi } from '@/services/api'
import type { SelectionBatch } from '@/services/api/selectionBatches'

let cachedBatches: SelectionBatch[] | null = null
let fetchPromise: Promise<SelectionBatch[]> | null = null

/**
 * Kicks off a batch fetch if one hasn't started yet.
 * Safe to call multiple times — only the first call triggers the API.
 */
export function prefetchBatches(): void {
  if (!fetchPromise) {
    fetchPromise = selectionBatchesApi.list()
    fetchPromise.then((batches) => {
      cachedBatches = batches
    }).catch(() => {
      // Reset so the next caller can retry
      fetchPromise = null
      cachedBatches = null
    })
  }
}

/** Returns the cached batches, or null if the fetch hasn't completed yet. */
export function getCachedBatches(): SelectionBatch[] | null {
  return cachedBatches
}

/** Returns the in-flight fetch promise, or null if no fetch is in progress. */
export function getFetchPromise(): Promise<SelectionBatch[]> | null {
  return fetchPromise
}

/** Forces the next call to prefetchBatches to make a fresh API request. */
export function clearCache(): void {
  cachedBatches = null
  fetchPromise = null
}