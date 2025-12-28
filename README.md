# Arzaquna Backend API

Complete backend system for the Arzaquna mobile application.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and set your database URL:
```
DATABASE_URL="mysql://user:password@localhost:3306/arzaquna"
JWT_SECRET=your-super-secret-jwt-key
```

### 3. Setup Database
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (creates admin user and categories)
npm run prisma:seed
```

### 4. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:3000`

## Default Admin Credentials

After running the seed:
- **Email**: admin@arzaquna.com
- **Password**: admin123

⚠️ **Important**: Change the password after first login!

## API Documentation

See the main [README.md](../README.md) for complete API documentation.

## Project Structure

```
backend/
├── src/
│   ├── config/        # Configuration files
│   ├── middleware/    # Express middleware
│   ├── routes/        # API routes
│   ├── utils/         # Utility functions
│   └── server.js      # Main server file
├── prisma/
│   ├── schema.prisma  # Database schema
│   └── seed.js        # Database seed script
├── uploads/           # Uploaded files
├── package.json
└── .env
```

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Seed database with initial data
- `npm run setup` - Complete setup (install + generate + migrate + seed)

## Environment Variables

See `.env.example` for all required environment variables.

## Database Migrations

```bash
# Create a new migration
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Deploy migrations (production)
npx prisma migrate deploy
```

## File Uploads

Uploaded files are stored in `uploads/` directory:
- `uploads/sliders/` - Slider images
- `uploads/products/` - Product images
- `uploads/statuses/` - Status/offer images
- `uploads/categories/` - Category images

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check DATABASE_URL in .env
- Ensure database exists: `CREATE DATABASE arzaquna;`

### Port Already in Use
- Change PORT in .env
- Or kill the process using the port

### Prisma Issues
- Run `npm run prisma:generate` after schema changes
- Run `npm run prisma:migrate` to apply migrations
