const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed...\n');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🗑️  Clearing existing data...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.productSpecification.deleteMany();
  await prisma.status.deleteMany();
  await prisma.product.deleteMany();
  await prisma.vendorCategory.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.vendorApplication.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationSettings.deleteMany();
  await prisma.message.deleteMany();
  await prisma.slider.deleteMany();
  await prisma.category.deleteMany();
  await prisma.appContent.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Existing data cleared\n');

  // 1. Create Admin User
  console.log('👤 Creating admin user...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      fullName: 'Admin User',
      email: 'admin@arzaquna.com',
      phone: '+201234567890',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log(`✅ Admin created: ${admin.email} (Password: admin123)\n`);

  // 2. Create Regular Users
  console.log('👥 Creating regular users...');
  const userPassword = await bcrypt.hash('user123', 10);
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const user = await prisma.user.create({
      data: {
        fullName: `User ${i}`,
        email: `user${i}@example.com`,
        phone: `+20123456789${i}`,
        password: userPassword,
        role: 'USER',
        isActive: true
      }
    });
    users.push(user);
    console.log(`✅ User ${i} created: ${user.email}`);
  }
  console.log('');

  // 3. Create Categories
  console.log('📁 Creating categories...');
  const categories = [
    { nameAr: 'الأبقار', nameEn: 'Cows', icon: '🐄' },
    { nameAr: 'الإبل', nameEn: 'Camels', icon: '🐪' },
    { nameAr: 'الطيور', nameEn: 'Birds', icon: '🐦' },
    { nameAr: 'الأغنام', nameEn: 'Sheep', icon: '🐑' },
    { nameAr: 'الأسماك', nameEn: 'Fish', icon: '🐟' },
    { nameAr: 'المسلخ', nameEn: 'Slaughterhouse', icon: '🔪' },
    { nameAr: 'تجارة الماشية', nameEn: 'Livestock Trading', icon: '🏪' }
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const category = await prisma.category.create({
      data: {
        nameAr: cat.nameAr,
        nameEn: cat.nameEn,
        icon: cat.icon,
        isActive: true
      }
    });
    createdCategories.push(category);
    console.log(`✅ Category created: ${category.nameEn}`);
  }
  console.log('');

  // 4. Create Vendors
  console.log('🏪 Creating vendors...');
  const vendorPassword = await bcrypt.hash('vendor123', 10);
  const vendors = [];
  
  for (let i = 1; i <= 3; i++) {
    const vendorUser = await prisma.user.create({
      data: {
        fullName: `Vendor Owner ${i}`,
        email: `vendor${i}@example.com`,
        phone: `+20198765432${i}`,
        password: vendorPassword,
        role: 'VENDOR',
        isActive: true
      }
    });

    // Assign vendor to multiple categories
    const vendorCategories = createdCategories.slice(0, 2 + i).map(c => c.id);
    
    const vendor = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        storeName: `Farm Store ${i}`,
        specialization: vendorCategories, // JSON array
        city: ['Cairo', 'Alexandria', 'Giza'][i - 1],
        region: ['Nasr City', 'Maadi', 'Zamalek'][i - 1],
        yearsOfExperience: 5 + i,
        whatsappNumber: `+20198765432${i}`,
        callNumber: `+20198765432${i}`,
        isApproved: true,
        approvedAt: new Date()
      }
    });

    // Create vendor-category relationships
    for (const categoryId of vendorCategories) {
      await prisma.vendorCategory.create({
        data: {
          vendorId: vendor.id,
          categoryId: categoryId
        }
      });
    }

    vendors.push({ vendor, user: vendorUser });
    console.log(`✅ Vendor ${i} created: ${vendor.storeName} (${vendorUser.email})`);
  }
  console.log('');

  // 5. Create Products
  console.log('📦 Creating products...');
  const products = [];
  for (let i = 0; i < vendors.length; i++) {
    const vendor = vendors[i].vendor;
    const vendorCategories = await prisma.vendorCategory.findMany({
      where: { vendorId: vendor.id },
      include: { category: true }
    });

    for (let j = 0; j < vendorCategories.length; j++) {
      const category = vendorCategories[j].category;
      const productNum = i * vendorCategories.length + j + 1;

      const product = await prisma.product.create({
        data: {
          vendorId: vendor.id,
          categoryId: category.id,
          nameAr: `منتج ${productNum}`,
          nameEn: `Product ${productNum}`,
          age: `${2 + j} years`,
          weight: `${100 + (productNum * 10)} kg`,
          descriptionAr: `وصف المنتج ${productNum} بالعربية`,
          descriptionEn: `Description for Product ${productNum} in English`,
          price: 1000 + (productNum * 100),
          images: [
            `/uploads/products/product${productNum}_1.jpg`,
            `/uploads/products/product${productNum}_2.jpg`
          ], // JSON array
          isActive: true,
          isApproved: true,
          approvedAt: new Date()
        }
      });

      // Add specifications based on category
      const specifications = [];
      if (category.nameEn === 'Cows' || category.nameEn === 'Camels' || category.nameEn === 'Sheep') {
        specifications.push(
          { key: 'healthStatus', valueAr: 'صحي', valueEn: 'Healthy' },
          { key: 'vaccinations', valueAr: 'مكتمل', valueEn: 'Complete' },
          { key: 'guarantee', valueAr: '30 يوم', valueEn: '30 days' }
        );
      } else if (category.nameEn === 'Birds') {
        specifications.push(
          { key: 'healthStatus', valueAr: 'صحي', valueEn: 'Healthy' },
          { key: 'vaccinations', valueAr: 'مكتمل', valueEn: 'Complete' }
        );
      } else if (category.nameEn === 'Fish') {
        specifications.push(
          { key: 'healthStatus', valueAr: 'طازج', valueEn: 'Fresh' },
          { key: 'source', valueAr: 'مزارع', valueEn: 'Farm' }
        );
      }

      for (const spec of specifications) {
        await prisma.productSpecification.create({
          data: {
            productId: product.id,
            key: spec.key,
            valueAr: spec.valueAr,
            valueEn: spec.valueEn
          }
        });
      }

      products.push(product);
      console.log(`✅ Product ${productNum} created: ${product.nameEn} (${category.nameEn})`);
    }
  }
  console.log('');

  // 6. Create Statuses/Offers
  console.log('🎯 Creating statuses/offers...');
  for (let i = 0; i < vendors.length; i++) {
    const vendor = vendors[i].vendor;
    const vendorProducts = products.filter(p => p.vendorId === vendor.id);

    for (let j = 0; j < 3; j++) {
      const product = vendorProducts[j] || null;
      await prisma.status.create({
        data: {
          vendorId: vendor.id,
          productId: product?.id || null,
          image: `/uploads/statuses/offer_${i}_${j}.jpg`,
          price: 500 + (j * 50),
          icon: '🔥',
          titleAr: `عرض خاص ${j + 1}`,
          titleEn: `Special Offer ${j + 1}`,
          descriptionAr: `وصف العرض ${j + 1}`,
          descriptionEn: `Offer description ${j + 1}`,
          isActive: true
        }
      });
    }
    console.log(`✅ Created 3 offers for ${vendor.storeName}`);
  }
  console.log('');

  // 7. Create Sliders
  console.log('🖼️  Creating sliders...');
  for (let i = 1; i <= 5; i++) {
    await prisma.slider.create({
      data: {
        image: `/uploads/sliders/slider${i}.jpg`,
        titleAr: `عنوان السلايدر ${i}`,
        titleEn: `Slider Title ${i}`,
        descriptionAr: `وصف السلايدر ${i}`,
        descriptionEn: `Slider description ${i}`,
        icon: '⭐',
        link: i === 1 ? '/categories' : null,
        order: i,
        isActive: true
      }
    });
    console.log(`✅ Slider ${i} created`);
  }
  console.log('');

  // 8. Create Orders
  console.log('🛒 Creating orders...');
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const vendor = vendors[i % vendors.length].vendor;
    const vendorProducts = products.filter(p => p.vendorId === vendor.id);

    if (vendorProducts.length > 0) {
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          vendorId: vendor.id,
          status: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'][i % 4],
          notes: `Order notes for user ${i + 1}`,
          items: {
            create: [
              {
                productId: vendorProducts[0].id,
                quantity: 1,
                price: vendorProducts[0].price
              },
              ...(vendorProducts[1] ? [{
                productId: vendorProducts[1].id,
                quantity: 2,
                price: vendorProducts[1].price
              }] : [])
            ]
          }
        }
      });
      console.log(`✅ Order created for ${user.fullName} (${order.status})`);
    }
  }
  console.log('');

  // 9. Create Favorites
  console.log('❤️  Creating favorites...');
  for (let i = 0; i < users.length && i < products.length; i++) {
    await prisma.favorite.create({
      data: {
        userId: users[i].id,
        productId: products[i].id
      }
    });
  }
  console.log(`✅ Created ${Math.min(users.length, products.length)} favorites\n`);

  // 10. Create Notifications
  console.log('🔔 Creating notifications...');
  for (let i = 0; i < users.length; i++) {
    await prisma.notification.create({
      data: {
        userId: users[i].id,
        type: ['ORDER', 'OFFER', 'MESSAGE'][i % 3],
        titleAr: `إشعار ${i + 1}`,
        titleEn: `Notification ${i + 1}`,
        messageAr: `رسالة الإشعار ${i + 1}`,
        messageEn: `Notification message ${i + 1}`,
        isRead: i % 2 === 0
      }
    });
  }
  console.log(`✅ Created ${users.length} notifications\n`);

  // 11. Create Notification Settings
  console.log('⚙️  Creating notification settings...');
  for (const user of [...users, admin]) {
    await prisma.notificationSettings.create({
      data: {
        userId: user.id,
        orderEnabled: true,
        offerEnabled: true,
        messageEnabled: true
      }
    });
  }
  console.log(`✅ Created notification settings for ${users.length + 1} users\n`);

  // 12. Create Messages
  console.log('💬 Creating messages...');
  // User to Vendor messages
  for (let i = 0; i < users.length && i < vendors.length; i++) {
    await prisma.message.create({
      data: {
        senderId: users[i].id,
        receiverId: vendors[i].user.id,
        subject: `Inquiry from ${users[i].fullName}`,
        contentAr: `رسالة استفسار من ${users[i].fullName}`,
        contentEn: `Inquiry message from ${users[i].fullName}`,
        type: 'INQUIRY'
      }
    });
  }
  // Vendor to User messages
  for (let i = 0; i < vendors.length && i < users.length; i++) {
    await prisma.message.create({
      data: {
        senderId: vendors[i].user.id,
        receiverId: users[i].id,
        subject: `Response from ${vendors[i].vendor.storeName}`,
        contentAr: `رد من ${vendors[i].vendor.storeName}`,
        contentEn: `Response from ${vendors[i].vendor.storeName}`,
        type: 'GENERAL'
      }
    });
  }
  console.log(`✅ Created messages between users and vendors\n`);

  // 13. Create App Content
  console.log('📄 Creating app content...');
  await prisma.appContent.createMany({
    data: [
      {
        type: 'ABOUT',
        contentAr: 'تطبيق أرزقنا هو منصة متخصصة في تجارة الماشية والمنتجات الحيوانية. نوفر لك أفضل المزارعين والتجار المعتمدين.',
        contentEn: 'Arzaquna app is a specialized platform for livestock and animal products trading. We provide you with the best approved farmers and traders.',
        updatedBy: admin.id
      },
      {
        type: 'PRIVACY_POLICY',
        contentAr: 'سياسة الخصوصية: نحن نحترم خصوصيتك ونحمي بياناتك الشخصية وفقاً لأعلى المعايير الأمنية.',
        contentEn: 'Privacy Policy: We respect your privacy and protect your personal data according to the highest security standards.',
        updatedBy: admin.id
      },
      {
        type: 'TERMS_CONDITIONS',
        contentAr: 'الشروط والأحكام: باستخدامك للتطبيق، فإنك توافق على الشروط والأحكام المذكورة.',
        contentEn: 'Terms & Conditions: By using the app, you agree to the mentioned terms and conditions.',
        updatedBy: admin.id
      }
    ]
  });
  console.log('✅ App content created (About, Privacy, Terms)\n');

  // 14. Create Vendor Applications (Pending)
  console.log('📝 Creating pending vendor applications...');
  const applicantPassword = await bcrypt.hash('applicant123', 10);
  for (let i = 1; i <= 2; i++) {
    const applicant = await prisma.user.create({
      data: {
        fullName: `Applicant ${i}`,
        email: `applicant${i}@example.com`,
        phone: `+20111111111${i}`,
        password: applicantPassword,
        role: 'USER',
        isActive: true
      }
    });

    await prisma.vendorApplication.create({
      data: {
        userId: applicant.id,
        fullName: applicant.fullName,
        phone: applicant.phone,
        email: applicant.email,
        storeName: `New Farm ${i}`,
        specialization: [createdCategories[0].id, createdCategories[1].id], // JSON array
        city: 'Cairo',
        region: 'Downtown',
        yearsOfExperience: 3 + i,
        status: 'PENDING'
      }
    });
    console.log(`✅ Pending application ${i} created`);
  }
  console.log('');

  console.log('🎉 Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Admin: 1 (admin@arzaquna.com / admin123)`);
  console.log(`   - Users: ${users.length} (user1@example.com / user123)`);
  console.log(`   - Vendors: ${vendors.length} (vendor1@example.com / vendor123)`);
  console.log(`   - Categories: ${createdCategories.length}`);
  console.log(`   - Products: ${products.length}`);
  console.log(`   - Statuses/Offers: ${vendors.length * 3}`);
  console.log(`   - Sliders: 5`);
  console.log(`   - Orders: ${users.length}`);
  console.log(`   - Favorites: ${Math.min(users.length, products.length)}`);
  console.log(`   - Notifications: ${users.length}`);
  console.log(`   - Messages: ${users.length + vendors.length}`);
  console.log(`   - Pending Applications: 2\n`);
  console.log('⚠️  Remember to change default passwords after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
