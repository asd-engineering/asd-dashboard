// @ts-check
/**
 * URL helper utilities.
 *
 * @module getCurrentUrl
 */

/**
 * Return the base URL combined with the first path segment.
 *
 * @function getCurrentUrl
 * @returns {string}
 */
function getCurrentUrl () {
  // Split the URL by "/"
  const parts = document.location.href.split('/')

  // Get the base URL (protocol + domain)
  const baseUrl = parts.slice(0, 3).join('/')

  // Get the first segment of the path after the domain
  const firstPathSegment = parts[3]

  // Combine base URL with the first path segment
  const newUrl = `${baseUrl}/${firstPathSegment}`

  return newUrl
}

export { getCurrentUrl }
