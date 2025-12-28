# Prisma Schema Fixes for MySQL

## Issues Fixed

MySQL doesn't support arrays of primitive types. The following fields were converted from arrays to JSON:

### 1. Vendor.specialization
- **Before**: `String[]`
- **After**: `Json`
- **Usage**: Store array of category IDs as JSON

### 2. VendorApplication.specialization
- **Before**: `String[]`
- **After**: `Json`
- **Usage**: Store array of category IDs as JSON

### 3. Product.images
- **Before**: `String[]`
- **After**: `Json`
- **Usage**: Store array of image URLs as JSON

### 4. Vendor.messages Relation
- **Removed**: Invalid relation field (Message model doesn't have vendor relation)
- Messages are between Users, not Vendors directly

## Code Updates

### JSON Helper Utility
Created `backend/src/utils/jsonHelper.js` with helper functions:
- `ensureArray()` - Ensures value is an array (handles JSON parsing)
- `ensureImagesArray()` - Specifically for product images
- `ensureSpecializationArray()` - Specifically for vendor specialization

### Updated Files
- `backend/src/routes/vendors.js` - Handles specialization as JSON
- `backend/src/routes/products.js` - Handles images as JSON
- `backend/src/routes/mobile/products.js` - Uses `ensureImagesArray()`
- `backend/src/routes/mobile/vendors.js` - Uses `ensureImagesArray()`
- `backend/src/routes/mobile/favorites.js` - Uses `ensureImagesArray()`
- `backend/src/routes/mobile/orders.js` - Uses `ensureImagesArray()`

## How It Works

### Writing Data
Prisma automatically converts JavaScript arrays to JSON when saving:
```javascript
// This works automatically
await prisma.product.create({
  data: {
    images: ['/uploads/img1.jpg', '/uploads/img2.jpg'] // Array
  }
});
// Stored as JSON in database
```

### Reading Data
Prisma automatically parses JSON back to JavaScript objects:
```javascript
const product = await prisma.product.findUnique({ where: { id } });
// product.images is already parsed (could be array or object)

// Use helper to ensure it's always an array
const images = ensureImagesArray(product.images);
```

## Migration Notes

If you have existing data:
1. Run migration: `npx prisma migrate dev`
2. Existing array data will need to be converted to JSON format
3. The helper functions handle both formats for backward compatibility

## Testing

After fixing the schema:
1. ✅ Run `npx prisma generate` - Should succeed
2. ✅ Run `npx prisma migrate dev` - Create/apply migrations
3. ✅ Test creating vendors with specialization
4. ✅ Test creating products with images
5. ✅ Verify JSON fields are stored and retrieved correctly



