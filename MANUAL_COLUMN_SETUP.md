# إعداد عمود profileImage يدوياً - Manual profileImage Column Setup

## ✅ Prisma Schema
الـ schema يحتوي على `profileImage`:
```prisma
model User {
  ...
  profileImage String?
  ...
}
```

## ⚠️ Migration Files
**لا يحتوي أي migration file على `profileImage`** - يجب إضافته يدوياً

## 📋 خطوات الإعداد - Setup Steps

### 1. على السيرفر الإنتاجي - On Production Server

```bash
# الاتصال بقاعدة البيانات
mysql -u root -p arzaquna

# إضافة العمود
ALTER TABLE `User` ADD COLUMN `profileImage` VARCHAR(191) NULL;

# الخروج
exit;
```

### 2. إعادة توليد Prisma Client

```bash
cd /var/www/arzaquna.developteam.site
npx prisma generate
pm2 restart arzaquna
```

### 3. التحقق

```bash
# التحقق من وجود العمود
mysql -u root -p arzaquna -e "DESCRIBE User;" | grep profileImage
```

## 🔄 عند النشر على سيرفر جديد - New Server Deployment

### الخطوة 1: تطبيق الهجرات
```bash
npx prisma migrate deploy
```

### الخطوة 2: إضافة عمود profileImage يدوياً
```bash
mysql -u root -p arzaquna -e "ALTER TABLE \`User\` ADD COLUMN \`profileImage\` VARCHAR(191) NULL;"
```

### الخطوة 3: إعادة توليد Prisma Client
```bash
npx prisma generate
pm2 restart arzaquna
```

## 📝 ملاحظات - Notes

- ✅ Schema يحتوي على `profileImage`
- ❌ Migration files لا تحتوي على `profileImage`
- ✅ يجب إضافة العمود يدوياً في قاعدة البيانات
- ✅ Prisma Client سيتعرف على العمود بعد `prisma generate`

## ⚠️ مهم - Important

**يجب إضافة العمود يدوياً في كل قاعدة بيانات جديدة أو موجودة**

```sql
ALTER TABLE `User` ADD COLUMN `profileImage` VARCHAR(191) NULL;
```


