# Seed Data Documentation

## Overview

The seed script (`prisma/seed.js`) creates comprehensive test data for all tables in the database.

## Default Credentials

### Admin
- **Email**: `admin@arzaquna.com`
- **Password**: `admin123`
- **Role**: ADMIN

### Regular Users (5 users)
- **Email**: `user1@example.com` to `user5@example.com`
- **Password**: `user123`
- **Role**: USER

### Vendors (3 vendors)
- **Email**: `vendor1@example.com` to `vendor3@example.com`
- **Password**: `vendor123`
- **Role**: VENDOR
- **Status**: Approved

### Vendor Applicants (2 pending)
- **Email**: `applicant1@example.com`, `applicant2@example.com`
- **Password**: `applicant123`
- **Status**: PENDING (awaiting admin approval)

## Seed Data Created

### 1. Users
- 1 Admin user
- 5 Regular users
- 3 Vendor users (approved)
- 2 Applicant users (pending)

### 2. Categories (7 categories)
- Cows (الأبقار)
- Camels (الإبل)
- Birds (الطيور)
- Sheep (الأغنام)
- Fish (الأسماك)
- Slaughterhouse (المسلخ)
- Livestock Trading (تجارة الماشية)

### 3. Vendors
- 3 approved vendors
- Each vendor assigned to 2-4 categories
- Complete vendor profiles with contact info

### 4. Products
- Multiple products per vendor
- Products distributed across categories
- Each product includes:
  - Bilingual names and descriptions
  - Age and weight
  - Price
  - Image gallery (2 images per product)
  - Category-specific specifications

### 5. Statuses/Offers
- 3 offers per vendor (9 total)
- Linked to products where applicable
- Bilingual titles and descriptions

### 6. Sliders
- 5 home screen sliders
- Ordered 1-5
- Bilingual content

### 7. Orders
- 5 orders (one per user)
- Various statuses (PENDING, CONFIRMED, IN_PROGRESS, COMPLETED)
- Multiple items per order

### 8. Favorites
- Users have favorited products
- One favorite per user (from available products)

### 9. Notifications
- 5 notifications (one per user)
- Mix of ORDER, OFFER, MESSAGE types
- Some marked as read, some unread

### 10. Notification Settings
- Settings created for all users
- All notification types enabled by default

### 11. Messages
- Messages between users and vendors
- Mix of INQUIRY and GENERAL types

### 12. App Content
- About App (bilingual)
- Privacy Policy (bilingual)
- Terms & Conditions (bilingual)

### 13. Vendor Applications
- 2 pending applications
- Ready for admin review

## Running the Seed

### Option 1: Using npm script
```bash
cd backend
npm run prisma:seed
```

### Option 2: Direct command
```bash
cd backend
npx prisma db seed
```

### Option 3: Complete setup (install + migrate + seed)
```bash
cd backend
npm run setup
```

## Important Notes

1. **Database Required**: Make sure MySQL is running and database `arzaquna` exists
2. **Environment**: `.env` file must have correct `DATABASE_URL`
3. **Data Clearing**: The seed script clears all existing data first
4. **Passwords**: All passwords are hashed using bcrypt
5. **JSON Fields**: Specialization and images are stored as JSON (arrays)

## Testing After Seed

1. **Login as Admin**:
   - Email: `admin@arzaquna.com`
   - Password: `admin123`

2. **Login as Vendor**:
   - Email: `vendor1@example.com`
   - Password: `vendor123`

3. **Login as User**:
   - Email: `user1@example.com`
   - Password: `user123`

4. **Test Features**:
   - View categories and vendors
   - Browse products
   - View orders
   - Check notifications
   - Review pending vendor applications

## Customizing Seed Data

Edit `backend/prisma/seed.js` to:
- Change number of users/vendors/products
- Modify test data values
- Add more categories
- Create additional relationships



