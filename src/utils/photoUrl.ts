/**
 * Resolve a student's photo to a full accessible URL.
 *
 * Priority:
 * 1. If `studentId` is provided → uses the API photo serving route
 *    (`/api/v1/photos/{studentId}`) which works reliably even with
 *    `php artisan serve` on Windows where storage symlinks aren't followed.
 * 2. If `path` is a full URL (http/https) → returned as-is.
 * 3. If `path` starts with /storage/ or storage/ → prepends the API origin.
 * 4. Plain relative path → prepends origin + /storage/.
 *
 * Returns null when both path and studentId are null/undefined/empty.
 */
export function resolvePhotoUrl(
  path: string | null | undefined,
  studentId?: number | string | null,
): string | null {
  // If there's no photo path, return null regardless of studentId
  if (!path) return null

  // Prefer API photo route when we have a student ID (reliable in all environments)
  // Add cache-busting timestamp so the browser fetches the latest photo after upload
  if (studentId != null) {
    const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
    const cacheBuster = Date.now()
    return `${apiBase}/photos/${studentId}?t=${cacheBuster}`
  }

  // Already a full URL → return directly
  if (/^https?:\/\//i.test(path)) return path

  const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
  const apiOrigin = new URL(apiBase).origin

  if (path.startsWith('/storage/')) {
    return `${apiOrigin}${path}`
  }
  if (path.startsWith('storage/')) {
    return `${apiOrigin}/${path}`
  }

  // Plain relative path like "students/photos/xxx.jpg"
  return `${apiOrigin}/storage/${path.replace(/^\/+/, '')}`
}

/**
 * Get a student's initials from their full name (up to 2 characters).
 */
export function getInitials(name: string): string {
  if (!name?.trim()) return 'ST'
  return name
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'ST'
}
