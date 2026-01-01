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

/**
 * Get full image URL from relative path
 * @param {string|null|undefined} imagePath - Relative image path (e.g., /uploads/products/image.png)
 * @returns {string|null} Full image URL or null if no path
 */
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Get backend URL from environment or use production URL
  const backendUrl = process.env.BACKEND_URL || process.env.API_URL || 'https://arzaquna.developteam.site';
  
  // Ensure path starts with /
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  // Return full URL
  return `${backendUrl}${cleanPath}`;
};

/**
 * Convert array of image paths to full URLs
 * @param {Array<string>|string|null} images - Array of image paths or JSON string
 * @returns {Array<string>} Array of full image URLs
 */
const getImageUrls = (images) => {
  const imageArray = ensureImagesArray(images);
  return imageArray.map(img => getImageUrl(img)).filter(Boolean);
};

module.exports = {
  ensureArray,
  ensureImagesArray,
  ensureSpecializationArray,
  getImageUrl,
  getImageUrls
};



