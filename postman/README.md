# Postman Collection for Arzaquna Mobile API

## Import Instructions

1. Open Postman
2. Click **Import** button
3. Select **File** tab
4. Choose `Arzaquna_Mobile_API.postman_collection.json`
5. Click **Import**

## Environment Setup

Create a new environment in Postman with these variables:

### Variables

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `base_url` | `http://localhost:3000` | `http://localhost:3000` |
| `token` | (empty) | (will be set after login) |

### Setting Variables

1. After importing, go to **Environments**
2. Create new environment: "Arzaquna Local"
3. Add variables as shown above
4. Select the environment before making requests

## Usage

### 1. Get Authentication Token

1. Use **Register** or **Login** endpoint
2. Copy the `token` from response
3. Set `token` variable in environment:
   - Go to environment
   - Update `token` value
   - Save

### 2. Using the Collection

All authenticated endpoints will automatically use the `{{token}}` variable.

### 3. Testing Endpoints

1. Start with **Authentication** folder
2. Register/Login to get token
3. Update environment variable
4. Test other endpoints

## Collection Structure

- **Authentication** - Register, Login, OAuth, Guest mode
- **Home Screen** - Sliders, Categories, Featured Vendors, Latest Offers
- **Categories** - Get categories, Get vendors in category
- **Vendors** - Vendor profile, products by category, statuses, contact info
- **Products** - Product details, specifications, gallery
- **Statuses & Offers** - Latest, by vendor, create, delete
- **Favorites** - Add, get, remove
- **Orders** - List, details, create, update status
- **Notifications** - Get, settings, mark as read
- **Messages & Support** - Chats, messages, support tickets
- **User Profile** - Get, update, change password
- **App Content** - About, Privacy, Terms

## Notes

- Replace `:categoryId`, `:vendorId`, `:productId`, etc. with actual IDs
- For file uploads (status creation), use form-data in Postman
- All endpoints return data in `{success: true, data: {...}}` format
- Error responses include `success: false` and `message`

## Base URL

Default: `http://localhost:3000`

For production, update `base_url` variable to your production URL.



