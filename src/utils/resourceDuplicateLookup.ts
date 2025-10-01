import { normalizeUrl } from '@/utils/urlDetection'
import type { Resource } from '@/data/storageAdapter'

/**
 * Finds a resource whose normalized URL matches the provided URL.
 * Returns the first match or null if no match is found.
 */
export function findDuplicateResourceByNormalizedUrl(resources: Resource[], url: string | null | undefined): Resource | null {
  if (!url) return null
  try {
    const target = normalizeUrl(url).toLowerCase()
    for (const resource of resources) {
      if (!resource.url) continue
      try {
        if (normalizeUrl(resource.url).toLowerCase() === target) {
          return resource
        }
      } catch {
        if (resource.url.toLowerCase() === target) {
          return resource
        }
      }
    }
    return null
  } catch {
    const target = url.toLowerCase()
    for (const resource of resources) {
      if (resource.url && resource.url.toLowerCase() === target) {
        return resource
      }
    }
    return null
  }
}


