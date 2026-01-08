# خطوات نشر Migration - Migration Deployment Steps

## على السيرفر - On Server

### 1. رفع الملفات
قم برفع مجلد `prisma/migrations/20260108160014_add_product_rating_and_best_product` إلى السيرفر

### 2. تشغيل Migration
```bash
cd /var/www/arzaquna.developteam.site
npx prisma migrate deploy
```

هذا الأمر سيقوم بـ:
- قراءة جميع migrations غير المطبقة
- تطبيقها على قاعدة البيانات
- **لن يحذف البيانات الموجودة**

### 3. إعادة توليد Prisma Client
```bash
npx prisma generate
```

### 4. إعادة تشغيل السيرفر
```bash
pm2 restart arzaquna
```

## ملاحظات مهمة - Important Notes

- ✅ `prisma migrate deploy` آمن - لن يحذف البيانات
- ✅ يمكن تشغيله عدة مرات بأمان
- ✅ يطبق فقط migrations الجديدة
- ❌ لا تستخدم `prisma migrate dev` على السيرفر (لأنه قد يحذف البيانات)

## التحقق من نجاح Migration

بعد تشغيل `prisma migrate deploy`، يجب أن ترى:
```
✅ Applied migration `20260108160014_add_product_rating_and_best_product`
```

## إذا حدث خطأ

إذا حدث خطأ مثل "column already exists"، يمكنك تخطي هذا migration:
```bash
npx prisma migrate resolve --applied 20260108160014_add_product_rating_and_best_product
```

ثم:
```bash
npx prisma generate
pm2 restart arzaquna
```

