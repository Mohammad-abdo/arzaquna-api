const prisma = require('../../src/config/database')
const bcrypt = require('bcryptjs')

// Create test admin user
const createTestAdmin = async () => {
  const hashedPassword = await bcrypt.hash('admin123', 10)
  return await prisma.user.create({
    data: {
      fullName: 'Test Admin',
      email: 'testadmin@test.com',
      phone: '+1234567890',
      password: hashedPassword,
      role: 'ADMIN'
    }
  })
}

// Create test user
const createTestUser = async () => {
  const hashedPassword = await bcrypt.hash('user123', 10)
  return await prisma.user.create({
    data: {
      fullName: 'Test User',
      email: 'testuser@test.com',
      phone: '+1234567891',
      password: hashedPassword,
      role: 'USER'
    }
  })
}

// Create test vendor
const createTestVendor = async (userId) => {
  const category = await prisma.category.findFirst()
  if (!category) {
    throw new Error('No category found. Run seed first.')
  }

  const vendor = await prisma.vendor.create({
    data: {
      userId,
      storeName: 'Test Store',
      city: 'Test City',
      region: 'Test Region',
      whatsappNumber: '+1234567890',
      callNumber: '+1234567890',
      yearsOfExperience: 5,
      specialization: JSON.stringify(['Cows']),
      isApproved: true
    }
  })

  // Add category to vendor
  await prisma.vendorCategory.create({
    data: {
      vendorId: vendor.id,
      categoryId: category.id
    }
  })

  return vendor
}

// Clean database
const cleanDatabase = async () => {
  const deleteOrder = prisma.order.deleteMany()
  const deleteOrderItem = prisma.orderItem.deleteMany()
  const deleteFavorite = prisma.favorite.deleteMany()
  const deleteNotification = prisma.notification.deleteMany()
  const deleteMessage = prisma.message.deleteMany()
  const deleteProductSpecification = prisma.productSpecification.deleteMany()
  const deleteProduct = prisma.product.deleteMany()
  const deleteStatus = prisma.status.deleteMany()
  const deleteSlider = prisma.slider.deleteMany()
  const deleteVendorCategory = prisma.vendorCategory.deleteMany()
  const deleteVendorApplication = prisma.vendorApplication.deleteMany()
  const deleteVendor = prisma.vendor.deleteMany()
  const deleteCategory = prisma.category.deleteMany()
  const deleteAppContent = prisma.appContent.deleteMany()
  const deleteUser = prisma.user.deleteMany()

  await prisma.$transaction([
    deleteOrder,
    deleteOrderItem,
    deleteFavorite,
    deleteNotification,
    deleteMessage,
    deleteProductSpecification,
    deleteProduct,
    deleteStatus,
    deleteSlider,
    deleteVendorCategory,
    deleteVendorApplication,
    deleteVendor,
    deleteCategory,
    deleteAppContent,
    deleteUser
  ])
}

module.exports = {
  createTestAdmin,
  createTestUser,
  createTestVendor,
  cleanDatabase
}


