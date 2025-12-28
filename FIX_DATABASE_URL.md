# Fix Database URL for No Password

## Current Setup

The `.env` file has been updated to connect without password:

```env
DATABASE_URL="mysql://root@localhost:3306/arzaquna"
```

## Alternative Formats

If the above doesn't work, try these formats:

### Option 1: Empty Password (with colon)
```env
DATABASE_URL="mysql://root:@localhost:3306/arzaquna"
```

### Option 2: No Password (no colon)
```env
DATABASE_URL="mysql://root@localhost:3306/arzaquna"
```

### Option 3: If using different user
```env
DATABASE_URL="mysql://username@localhost:3306/arzaquna"
```

## Verify Database Connection

Before running migrations, test the connection:

```bash
mysql -u root -h localhost arzaquna
```

If this works, your DATABASE_URL should work too.

## Common Issues

### Issue: "Authentication failed"
**Solution**: 
- Verify MySQL is running
- Check if root user exists: `SELECT user FROM mysql.user;`
- Try: `mysql -u root` (without password)

### Issue: "Database doesn't exist"
**Solution**: Create it first:
```sql
CREATE DATABASE arzaquna;
```

### Issue: "Access denied"
**Solution**: Grant permissions:
```sql
GRANT ALL PRIVILEGES ON arzaquna.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

## Test Connection

After updating `.env`, test:
```bash
npx prisma db pull --print
```

Or directly:
```bash
npx prisma migrate dev
```



