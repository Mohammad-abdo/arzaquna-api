# Database Setup Guide

## Step 1: Create MySQL Database

Open MySQL command line or MySQL Workbench and run:

```sql
CREATE DATABASE arzaquna;
```

Or using MySQL command line:
```bash
mysql -u root -p
CREATE DATABASE arzaquna;
EXIT;
```

## Step 2: Configure .env File

The `.env` file has been created in the `backend/` folder. Update it with your MySQL credentials:

```env
DATABASE_URL="mysql://username:password@localhost:3306/arzaquna"
```

**Examples:**
- Default MySQL: `mysql://root:password@localhost:3306/arzaquna`
- XAMPP: `mysql://root:@localhost:3306/arzaquna`
- WAMP: `mysql://root:@localhost:3306/arzaquna`
- Custom: `mysql://your_username:your_password@localhost:3306/arzaquna`

## Step 3: Run Migrations

```bash
cd backend
npx prisma migrate dev
```

This will:
- Create all database tables
- Apply the schema to your database
- Create migration files

## Step 4: Seed Database

```bash
npm run prisma:seed
```

Or:
```bash
npx prisma db seed
```

This will create:
- ✅ 1 Admin user
- ✅ 5 Regular users
- ✅ 3 Approved vendors
- ✅ 2 Pending vendor applications
- ✅ 7 Categories
- ✅ Multiple products with specifications
- ✅ Statuses/Offers
- ✅ Sliders
- ✅ Orders
- ✅ Favorites
- ✅ Notifications
- ✅ Messages
- ✅ App content

## Step 5: Verify Setup

### Check Database
```bash
npx prisma studio
```

This opens Prisma Studio where you can view all tables and data.

### Test API
```bash
npm run dev
```

Then test:
- Health check: `http://localhost:3000/api/health`
- Login: `POST http://localhost:3000/api/mobile/auth/login`

## Default Login Credentials

### Admin
- Email: `admin@arzaquna.com`
- Password: `admin123`

### Regular User
- Email: `user1@example.com`
- Password: `user123`

### Vendor
- Email: `vendor1@example.com`
- Password: `vendor123`

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check username/password in DATABASE_URL
- Ensure database `arzaquna` exists
- Test connection: `mysql -u username -p -h localhost arzaquna`

### Migration Errors
- Make sure database is empty or use `prisma migrate reset` (WARNING: deletes all data)
- Check DATABASE_URL format
- Verify MySQL user has CREATE/DROP permissions

### Seed Errors
- Run migrations first: `npx prisma migrate dev`
- Check database connection
- Verify all tables exist

## Quick Setup (All-in-One)

```bash
cd backend

# 1. Update .env with your DATABASE_URL
# 2. Create database in MySQL: CREATE DATABASE arzaquna;

# 3. Run complete setup
npm run setup
```

This runs:
- `npm install` - Install dependencies
- `prisma generate` - Generate Prisma client
- `prisma migrate dev` - Create tables
- `prisma seed` - Seed test data

## Next Steps

After seeding:
1. ✅ Start backend: `npm run dev`
2. ✅ Start admin dashboard: `cd ../admin-dashboard && npm run dev`
3. ✅ Login to admin dashboard
4. ✅ Test all features
5. ✅ Review seed data in Prisma Studio



