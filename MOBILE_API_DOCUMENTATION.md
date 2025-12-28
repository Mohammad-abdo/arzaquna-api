# Mobile API Documentation

## Overview

The mobile API is designed with **extreme granularity** - each mobile screen and action has its own dedicated endpoint. This ensures:

- ✅ No heavy filtering on mobile side
- ✅ Ready-to-use data for mobile UI
- ✅ Optimal performance
- ✅ Lightweight responses

## Base URL

```
http://localhost:3000/api/mobile
```

## Authentication

Most endpoints require authentication. Include the token in the header:

```
Authorization: Bearer {token}
```

## Response Format

All endpoints return data in this format:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ] // Optional validation errors
}
```

## Data Language Format

All endpoints return both Arabic and English fields:

```json
{
  "name_ar": "الاسم بالعربية",
  "name_en": "Name in English",
  "description_ar": "الوصف بالعربية",
  "description_en": "Description in English"
}
```

---

## 1. Authentication & User Access

### POST /api/mobile/auth/register
Register a new user.

**Request:**
```json
{
  "fullName": "John Doe",
  "phone": "+1234567890",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "user@example.com",
      "phone": "+1234567890",
      "role": "USER"
    },
    "token": "jwt-token"
  }
}
```

### POST /api/mobile/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "user@example.com",
      "phone": "+1234567890",
      "role": "USER",
      "isVendor": false,
      "vendorApproved": false
    },
    "token": "jwt-token"
  }
}
```

### POST /api/mobile/auth/login/google
Login with Google OAuth (placeholder).

### POST /api/mobile/auth/login/apple
Login with Apple OAuth (placeholder).

### POST /api/mobile/auth/guest
Get guest mode token.

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "guest-token",
    "isGuest": true
  }
}
```

### POST /api/mobile/auth/logout
Logout (client-side token removal).

---

## 2. Home Screen Endpoints

### GET /api/mobile/home/sliders
Get active sliders for home screen.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "image": "/uploads/sliders/image.jpg",
      "title_ar": "عنوان",
      "title_en": "Title",
      "description_ar": "وصف",
      "description_en": "Description",
      "icon": "icon-name",
      "link": "optional-link",
      "order": 1
    }
  ]
}
```

### GET /api/mobile/home/categories
Get categories for home screen.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name_ar": "الأبقار",
      "name_en": "Cows",
      "icon": "icon",
      "image": "/uploads/categories/image.jpg",
      "vendor_count": 10
    }
  ]
}
```

### GET /api/mobile/home/featured-vendors
Get featured vendors for home screen.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "store_name": "Store Name",
      "owner_name": "Owner Name",
      "city": "City",
      "region": "Region",
      "phone": "+1234567890",
      "products_count": 15,
      "offers_count": 5
    }
  ]
}
```

### GET /api/mobile/home/latest-offers
Get latest offers for home screen.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "image": "/uploads/statuses/image.jpg",
      "price": 100.00,
      "icon": "icon",
      "title_ar": "عرض",
      "title_en": "Offer",
      "description_ar": "وصف",
      "description_en": "Description",
      "vendor": {
        "id": "uuid",
        "store_name": "Store Name",
        "owner_name": "Owner Name"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 3. Categories & Vendors

### GET /api/mobile/categories
Get all categories.

### GET /api/mobile/categories/:categoryId/vendors
Get vendors in a specific category.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "uuid",
      "name_ar": "الأبقار",
      "name_en": "Cows"
    },
    "vendors": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

---

## 4. Vendor Details

### GET /api/mobile/vendors/:vendorId/category/:categoryId/products
**CRITICAL:** Returns ONLY products in the specified category for this vendor.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "vendor": {
      "id": "uuid",
      "store_name": "Store Name"
    },
    "category_id": "uuid",
    "products": [
      {
        "id": "uuid",
        "name_ar": "منتج",
        "name_en": "Product",
        "age": "2 years",
        "weight": "500 kg",
        "price": 1000.00,
        "images": ["/uploads/products/img1.jpg"],
        "description_ar": "وصف",
        "description_en": "Description",
        "specifications": [
          {
            "key": "healthStatus",
            "value_ar": "صحي",
            "value_en": "Healthy"
          }
        ],
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### GET /api/mobile/vendors/:vendorId/profile
Get vendor profile.

### GET /api/mobile/vendors/:vendorId/statuses
Get vendor statuses/offers.

### GET /api/mobile/vendors/:vendorId/contact-info
Get vendor contact information (WhatsApp, Call, Email).

---

## 5. Product Endpoints

### GET /api/mobile/products/:productId
Get product details.

### GET /api/mobile/products/:productId/specifications
Get product specifications (category-dependent).

### GET /api/mobile/products/:productId/gallery
Get product image gallery.

---

## 6. Status / Offers

### GET /api/mobile/statuses/latest
Get latest statuses/offers.

### GET /api/mobile/statuses/by-vendor/:vendorId
Get statuses by vendor.

### POST /api/mobile/statuses/vendor/statuses
Create status (Vendor only).

**Request (multipart/form-data):**
- `image` (file, required)
- `price` (required)
- `icon` (optional)
- `titleAr`, `titleEn` (optional)
- `descriptionAr`, `descriptionEn` (optional)
- `productId` (optional)

### DELETE /api/mobile/statuses/vendor/statuses/:statusId
Delete status (Vendor only).

---

## 7. Favorites

### POST /api/mobile/favorites/add
Add product to favorites.

**Request:**
```json
{
  "productId": "uuid"
}
```

### GET /api/mobile/favorites
Get user favorites.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

### DELETE /api/mobile/favorites/:itemId
Remove from favorites.

---

## 8. Orders (Tracking Only)

### GET /api/mobile/orders
Get user orders.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (optional: PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED)

### GET /api/mobile/orders/:orderId
Get order details.

### POST /api/mobile/orders/create
Create order.

**Request:**
```json
{
  "vendorId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 1
    }
  ],
  "notes": "Optional notes"
}
```

### PATCH /api/mobile/orders/:orderId/status
Update order status.

**Request:**
```json
{
  "status": "CANCELLED"
}
```

---

## 9. Notifications

### GET /api/mobile/notifications
Get user notifications.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `type` (optional: ORDER, OFFER, MESSAGE)
- `isRead` (optional: true/false)

### POST /api/mobile/notifications/settings
Update notification settings.

**Request:**
```json
{
  "orderEnabled": true,
  "offerEnabled": true,
  "messageEnabled": true
}
```

### PATCH /api/mobile/notifications/read/:notificationId
Mark notification as read.

---

## 10. Messaging & Support

### GET /api/mobile/messages/chats
Get user chats (conversations list).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "partner": {
        "id": "uuid",
        "full_name": "Partner Name",
        "role": "VENDOR"
      },
      "last_message": {
        "id": "uuid",
        "content_ar": "رسالة",
        "content_en": "Message",
        "type": "GENERAL",
        "is_read": false,
        "created_at": "2024-01-01T00:00:00Z"
      },
      "unread_count": 2
    }
  ]
}
```

### GET /api/mobile/messages/chats/:chatId/messages
Get messages in a chat.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)

### POST /api/mobile/messages/chats/:chatId/messages
Send message in chat.

**Request:**
```json
{
  "contentAr": "رسالة",
  "contentEn": "Message",
  "subject": "Optional subject",
  "type": "GENERAL"
}
```

### POST /api/mobile/messages/support/ticket
Create support ticket.

**Request:**
```json
{
  "subject": "Support Request",
  "contentAr": "طلب دعم",
  "contentEn": "Support request",
  "type": "SUPPORT"
}
```

---

## 11. User Profile & Settings

### GET /api/mobile/user/profile
Get user profile.

### PUT /api/mobile/user/profile
Update user profile.

**Request:**
```json
{
  "fullName": "Updated Name",
  "phone": "+1234567890"
}
```

### PUT /api/mobile/user/change-password
Change password.

**Request:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## 12. Static App Content

### GET /api/mobile/app/about
Get About App content.

**Response:**
```json
{
  "success": true,
  "data": {
    "content_ar": "محتوى بالعربية",
    "content_en": "Content in English",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### GET /api/mobile/app/privacy
Get Privacy Policy.

### GET /api/mobile/app/terms
Get Terms & Conditions.

---

## Postman Collection

Import the Postman collection from:
```
backend/postman/Arzaquna_Mobile_API.postman_collection.json
```

Set environment variables:
- `base_url`: http://localhost:3000
- `token`: Your JWT token (after login)

---

## Key Design Principles

1. **One Screen = One Endpoint**: Each mobile screen has its dedicated endpoint
2. **No Client-Side Filtering**: All filtering is done on the backend
3. **Lightweight Responses**: Only necessary data is returned
4. **Pagination**: All list endpoints support pagination
5. **Bilingual**: All text fields support Arabic and English
6. **Ready-to-Use**: Data is formatted for direct use in mobile UI

---

## Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error



