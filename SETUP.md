# Quick Setup Guide

## Initial Setup

### 1. Backend Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and set your DATABASE_URL
# Example: DATABASE_URL="mysql://user:password@localhost:3306/arzaquna"

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start server
npm run dev
```

### 2. Create Admin User

You need to create an admin user. You can do this by:

**Option 1: Using Prisma Studio**
```bash
npx prisma studio
```
Then manually create a user with role `ADMIN`.

**Option 2: Using MySQL directly**
```sql
INSERT INTO User (id, fullName, email, phone, password, role, isActive, createdAt, updatedAt)
VALUES (
  UUID(),
  'Admin User',
  'admin@arzaquna.com',
  '+1234567890',
  '$2a$10$...', -- Use bcrypt to hash your password
  'ADMIN',
  true,
  NOW(),
  NOW()
);
```

**Option 3: Create a seed script** (recommended)

Create `prisma/seed.js`:
```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      fullName: 'Admin User',
      email: 'admin@arzaquna.com',
      phone: '+1234567890',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true
    }
  });

  console.log('Admin user created:', admin);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Then add to `package.json`:
```json
"prisma": {
  "seed": "node prisma/seed.js"
}
```

Run: `npx prisma db seed`

### 3. Create Initial Categories

After logging into the admin dashboard, create these categories:
- Cows (الأبقار)
- Camels (الإبل)
- Birds (الطيور)
- Sheep (الأغنام)
- Fish (الأسماك)
- Slaughterhouse (المسلخ)
- Livestock Trading (تجارة الماشية)

### 4. Admin Dashboard Setup

```bash
cd admin-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Access

- Backend API: http://localhost:3000
- Admin Dashboard: http://localhost:3001
- Prisma Studio: Run `npx prisma studio` (usually http://localhost:5555)

## Default Admin Credentials

After creating the admin user:
- Email: admin@arzaquna.com (or whatever you set)
- Password: admin123 (or whatever you set)

**Important:** Change the default password after first login!

## File Uploads

Make sure the `uploads/` directory exists and has write permissions:
```bash
mkdir -p uploads/sliders uploads/products uploads/statuses uploads/categories
```

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check DATABASE_URL in .env
- Ensure database exists: `CREATE DATABASE arzaquna;`

### Port Already in Use
- Change PORT in .env (backend)
- Change port in vite.config.js (admin dashboard)

### Prisma Issues
- Run `npx prisma generate` after schema changes
- Run `npx prisma migrate reset` to reset database (WARNING: deletes all data)

### CORS Issues
- Update FRONTEND_URL and ADMIN_URL in .env
- Ensure backend allows requests from admin dashboard origin

## Next Steps

1. Create initial categories through admin dashboard
2. Test vendor application flow
3. Test product creation and approval
4. Configure OAuth (Google/Apple) if needed
5. Set up production environment variables
6. Configure file storage (consider cloud storage for production)

