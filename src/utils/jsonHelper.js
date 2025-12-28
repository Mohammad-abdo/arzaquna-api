/**
 * Helper functions for handling JSON fields in Prisma
 * Prisma automatically parses JSON fields, but we ensure they're arrays
 */

/**
 * Ensure a value is an array (handles JSON fields from Prisma)
 * @param {any} value - Value that might be an array or JSON string
 * @returns {Array} - Always returns an array
 */
const ensureArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

/**
 * Ensure images field is an array
 * @param {any} images - Images value from Prisma
 * @returns {Array<string>} - Array of image URLs
 */
const ensureImagesArray = (images) => {
  return ensureArray(images);
};

/**
 * Ensure specialization field is an array
 * @param {any} specialization - Specialization value from Prisma
 * @returns {Array<string>} - Array of category IDs
 */
const ensureSpecializationArray = (specialization) => {
  return ensureArray(specialization);
};

module.exports = {
  ensureArray,
  ensureImagesArray,
  ensureSpecializationArray
};



