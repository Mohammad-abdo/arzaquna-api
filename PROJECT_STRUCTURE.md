# Project Structure

```
arzaquna/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── utils/         # Utility functions
│   │   └── server.js      # Main server file
│   ├── prisma/            # Prisma schema and migrations
│   │   └── schema.prisma
│   ├── uploads/           # Uploaded files (images)
│   ├── package.json
│   └── .env
│
├── admin-dashboard/        # React Admin Dashboard
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   └── utils/         # Utility functions
│   ├── package.json
│   └── vite.config.js
│
├── README.md              # Main documentation
├── SETUP.md               # Setup instructions
└── PROJECT_STRUCTURE.md   # This file
```

## Moving Files

To reorganize the project:

1. **Backend files** → `backend/` folder
2. **Prisma** → `backend/prisma/`
3. **Admin Dashboard** → stays in `admin-dashboard/`

