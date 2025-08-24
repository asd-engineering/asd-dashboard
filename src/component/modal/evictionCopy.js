// @ts-check
/**
 * Text constants for the eviction modal.
 * @module evictionCopy
 */
/**
 * Header text for the modal.
 * @param {number} n
 * @returns {string}
 */
export const header = (n) => n === 1 ? '1 widget must be removed to continue navigation.' : `${n} widgets must be removed to continue navigation.`

/**
 * Subtext showing per-service limits.
 * @param {number} maxPerService
 * @returns {string}
 */
export const subtext = (maxPerService) => `Limit: Max widgets per service = ${maxPerService}.`

/**
 * Disclaimer shown under the modal.
 * @type {string}
 */
export const disclaimer = 'You are removing a widget from memory. Unsaved data in that widget may be lost (same as page refresh).'
