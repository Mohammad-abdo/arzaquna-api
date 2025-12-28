# Create .env File

Since `.env` files are typically gitignored, create it manually:

## Option 1: Copy from Example

```bash
cd backend
copy .env.example .env
```

## Option 2: Create Manually

Create a file named `.env` in the `backend/` folder with this content:

```env
# Database
DATABASE_URL="mysql://root:password@localhost:3306/arzaquna"

# JWT
JWT_SECRET=arzaquna-super-secret-jwt-key-change-in-production-2024
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# OAuth (Placeholders - update when implementing)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3001
ADMIN_URL=http://localhost:3001
```

## Update DATABASE_URL

**IMPORTANT**: Update the `DATABASE_URL` with your actual MySQL credentials:

```env
DATABASE_URL="mysql://YOUR_USERNAME:YOUR_PASSWORD@localhost:3306/arzaquna"
```

### Common Examples:

- **XAMPP (default)**: `mysql://root:@localhost:3306/arzaquna`
- **WAMP (default)**: `mysql://root:@localhost:3306/arzaquna`
- **MySQL with password**: `mysql://root:mypassword@localhost:3306/arzaquna`
- **Custom user**: `mysql://myuser:mypassword@localhost:3306/arzaquna`

## Verify

After creating `.env`, verify it exists:
```bash
cd backend
dir .env
```

Then proceed with database setup!



