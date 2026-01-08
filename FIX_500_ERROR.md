# إصلاح خطأ 500 - Fix 500 Error

## المشكلة - Problem
خطأ 500 يحدث في:
- `/api/admin/products/pending`
- `/api/products?page=1&limit=10&isApproved=true`

## السبب - Cause
الكود يحاول قراءة الأعمدة الجديدة `rating` و `isBestProduct` من قاعدة البيانات، لكن هذه الأعمدة غير موجودة بعد في قاعدة البيانات على السيرفر.

## الحل - Solution

### 1. إضافة الأعمدة في قاعدة البيانات
قم بتشغيل هذا SQL على قاعدة البيانات:

```sql
ALTER TABLE `Product` 
ADD COLUMN `rating` DOUBLE NULL DEFAULT 0,
ADD COLUMN `isBestProduct` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `Product_isBestProduct_idx` ON `Product`(`isBestProduct`);
```

أو استخدم الملف: `ADD_PRODUCT_COLUMNS.sql`

### 2. إعادة توليد Prisma Client
```bash
cd /var/www/arzaquna.developteam.site
npx prisma generate
```

### 3. إعادة تشغيل السيرفر
```bash
pm2 restart arzaquna
```

## الحل المؤقت - Temporary Fix
تم إضافة معالجة أخطاء في الكود بحيث يعمل حتى لو لم تكن الأعمدة موجودة (سيعيد `rating: null` و `isBestProduct: false`). لكن الحل الصحيح هو إضافة الأعمدة في قاعدة البيانات.

## ملاحظة - Note
بعد إضافة الأعمدة، الكود سيعمل بشكل كامل مع جميع الميزات الجديدة.

