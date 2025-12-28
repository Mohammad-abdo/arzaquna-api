# Project Reorganization Guide

This guide will help you reorganize the project into a cleaner structure with separate `backend/` and `admin-dashboard/` folders.

## Current Structure
```
arzaquna/
├── src/              # Backend files (to be moved)
├── prisma/           # Prisma schema (to be moved)
├── admin-dashboard/  # Frontend (stays)
└── ...
```

## Target Structure
```
arzaquna/
├── backend/          # All backend files
│   ├── src/
│   ├── prisma/
│   ├── uploads/
│   └── package.json
├── admin-dashboard/  # Frontend (unchanged)
└── ...
```

## Steps to Reorganize

### Option 1: Manual (Recommended)

1. **Create backend folder structure:**
   ```bash
   mkdir backend
   mkdir backend\src
   mkdir backend\src\config
   mkdir backend\src\middleware
   mkdir backend\src\routes
   mkdir backend\src\utils
   mkdir backend\prisma
   mkdir backend\uploads
   ```

2. **Move files:**
   - Move `src/` → `backend/src/`
   - Move `prisma/` → `backend/prisma/`
   - Move `package.json` → `backend/package.json` (update paths)
   - Create `backend/.env` from `.env.example`
   - Create `backend/.gitignore`

3. **Update paths in backend files:**
   - `backend/src/server.js`: Update uploads path to `../uploads`
   - `backend/package.json`: Update prisma paths

4. **Update Prisma paths:**
   - In `backend/prisma/schema.prisma`, paths are relative to prisma folder (no change needed)

### Option 2: Using PowerShell Script

Run this in the project root:

```powershell
# Create backend structure
New-Item -ItemType Directory -Force -Path "backend\src\config"
New-Item -ItemType Directory -Force -Path "backend\src\middleware"
New-Item -ItemType Directory -Force -Path "backend\src\routes"
New-Item -ItemType Directory -Force -Path "backend\src\utils"
New-Item -ItemType Directory -Force -Path "backend\prisma"
New-Item -ItemType Directory -Force -Path "backend\uploads"

# Copy files
Copy-Item -Path "src\*" -Destination "backend\src\" -Recurse
Copy-Item -Path "prisma\*" -Destination "backend\prisma\" -Recurse
Copy-Item -Path "package.json" -Destination "backend\package.json"
Copy-Item -Path ".env.example" -Destination "backend\.env.example"
Copy-Item -Path ".gitignore" -Destination "backend\.gitignore"
```

Then manually update paths in `backend/src/server.js` and `backend/package.json`.

## After Reorganization

1. **Backend setup:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database URL
   npx prisma generate
   npx prisma migrate dev
   npm run dev
   ```

2. **Admin Dashboard setup:**
   ```bash
   cd admin-dashboard
   npm install
   npm run dev
   ```

3. **Update .gitignore** in root to ignore:
   - `backend/node_modules/`
   - `backend/uploads/`
   - `backend/.env`
   - `admin-dashboard/node_modules/`
   - `admin-dashboard/dist/`

## Important Notes

- The `uploads/` folder should be in `backend/uploads/` (not root)
- Prisma migrations will be in `backend/prisma/migrations/`
- Update any deployment scripts to use new paths
- Update CI/CD pipelines if applicable

