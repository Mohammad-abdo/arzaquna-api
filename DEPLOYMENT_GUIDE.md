# دليل النشر - Deployment Guide

## متطلبات النشر - Deployment Requirements

### 1. تحديث قاعدة البيانات - Database Update

عند النشر لأول مرة أو عند وجود تغييرات في قاعدة البيانات:

```bash
# على السيرفر - On Server
cd /var/www/arzaquna.developteam.site

# تطبيق الهجرات - Apply Migrations
npx prisma migrate deploy

# إعادة توليد Prisma Client - Regenerate Prisma Client
npx prisma generate
```

### 2. إضافة عمود profileImage يدوياً (إذا لزم الأمر)

إذا كانت قاعدة البيانات موجودة مسبقاً ولا تحتوي على عمود `profileImage`:

```bash
# الاتصال بقاعدة البيانات - Connect to Database
mysql -u root -p arzaquna

# إضافة العمود - Add Column
ALTER TABLE `User` ADD COLUMN `profileImage` VARCHAR(191) NULL;

# الخروج - Exit
exit;
```

### 3. إعادة تشغيل السيرفر - Restart Server

```bash
# باستخدام PM2
pm2 restart arzaquna

# أو باستخدام systemd
systemctl restart arzaquna
```

## خطوات النشر الكاملة - Complete Deployment Steps

### الخطوة 1: رفع الملفات - Upload Files
```bash
# رفع جميع الملفات إلى السيرفر
# Upload all files to server
```

### الخطوة 2: تثبيت المكتبات - Install Dependencies
```bash
cd /var/www/arzaquna.developteam.site
npm install
```

### الخطوة 3: تحديث قاعدة البيانات - Update Database
```bash
# تطبيق الهجرات - Apply migrations
npx prisma migrate deploy

# إعادة توليد Prisma Client
npx prisma generate
```

### الخطوة 4: تشغيل Seed (اختياري) - Run Seed (Optional)
```bash
node prisma/seed.js
```

### الخطوة 5: إعادة التشغيل - Restart
```bash
pm2 restart arzaquna
```

## هيكل الهجرات - Migration Structure

الهجرة الأساسية (`20251224172436_`) تحتوي على:
- جدول User مع عمود `profileImage` ✅
- جميع الجداول الأخرى ✅

**ملاحظة مهمة:** لا توجد هجرات مكررة. الهجرة الأساسية تحتوي على كل شيء.

## التحقق من النشر - Verify Deployment

### 1. التحقق من قاعدة البيانات
```bash
mysql -u root -p arzaquna -e "DESCRIBE User;"
# يجب أن ترى عمود profileImage
```

### 2. التحقق من Prisma Client
```bash
npx prisma generate
# يجب أن يتم بدون أخطاء
```

### 3. اختبار API
```bash
# اختبار التسجيل
curl -X POST http://localhost:3000/api/mobile/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test","phone":"+1234567890","email":"test@test.com","password":"password123"}'
```

## حل المشاكل - Troubleshooting

### خطأ: Unknown field `profileImage`
**الحل:**
1. تأكد من تطبيق الهجرات: `npx prisma migrate deploy`
2. أعد توليد Prisma Client: `npx prisma generate`
3. أعد تشغيل السيرفر

### خطأ: Column does not exist
**الحل:**
```sql
ALTER TABLE `User` ADD COLUMN `profileImage` VARCHAR(191) NULL;
```

### خطأ: Migration already applied
**الحل:**
الهجرة الأساسية تحتوي على `profileImage` بالفعل. فقط أعد توليد Prisma Client:
```bash
npx prisma generate
```

## ملاحظات مهمة - Important Notes

1. ✅ الهجرة الأساسية تحتوي على `profileImage`
2. ✅ لا توجد هجرات مكررة
3. ✅ الكود منظم وجاهز للنشر
4. ✅ جميع endpoints تدعم `profileImage`

## الملفات المحدثة - Updated Files

- ✅ `prisma/schema.prisma` - يحتوي على `profileImage`
- ✅ `prisma/migrations/20251224172436_/migration.sql` - يحتوي على `profileImage`
- ✅ جميع routes تدعم `profileImage`
- ✅ Postman collection محدث


