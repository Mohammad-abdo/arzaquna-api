const request = require('supertest')
const app = require('../../src/server')
const prisma = require('../../src/config/database')
const { createTestAdmin, createTestUser, createTestVendor, cleanDatabase } = require('../helpers/testHelpers')

describe('Products Routes', () => {
  let adminToken, vendorToken, categoryId, vendorId

  beforeAll(async () => {
    await cleanDatabase()
    
    // Create admin and get token
    const admin = await createTestAdmin()
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'admin123' })
    adminToken = adminLogin.body.data.token

    // Create category
    const category = await prisma.category.create({
      data: {
        nameAr: 'فئة اختبار',
        nameEn: 'Test Category',
        isActive: true
      }
    })
    categoryId = category.id

    // Create vendor and get token
    const user = await createTestUser()
    const vendor = await createTestVendor(user.id)
    vendorId = vendor.id

    const vendorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'user123' })
    vendorToken = vendorLogin.body.data.token
  })

  afterAll(async () => {
    await cleanDatabase()
    await prisma.$disconnect()
  })

  describe('GET /api/products', () => {
    it('should get all products', async () => {
      const response = await request(app)
        .get('/api/products')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('POST /api/admin/products', () => {
    it('should create product as admin', async () => {
      const response = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('nameAr', 'منتج اختبار')
        .field('nameEn', 'Test Product')
        .field('categoryId', categoryId)
        .field('vendorId', vendorId)
        .field('price', '100.50')
        .field('descriptionAr', 'وصف بالعربية')
        .field('descriptionEn', 'Description in English')

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.nameEn).toBe('Test Product')
    })
  })

  describe('GET /api/products/:id', () => {
    let productId

    beforeAll(async () => {
      const product = await prisma.product.create({
        data: {
          vendorId,
          categoryId,
          nameAr: 'منتج للعرض',
          nameEn: 'Product for View',
          price: 150.00,
          isApproved: true
        }
      })
      productId = product.id
    })

    it('should get product by id', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(productId)
    })
  })

  describe('PUT /api/admin/products/:id', () => {
    let productId

    beforeAll(async () => {
      const product = await prisma.product.create({
        data: {
          vendorId,
          categoryId,
          nameAr: 'منتج للتعديل',
          nameEn: 'Product to Edit',
          price: 200.00
        }
      })
      productId = product.id
    })

    it('should update product as admin', async () => {
      const response = await request(app)
        .put(`/api/admin/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('nameEn', 'Updated Product Name')
        .field('price', '250.00')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('PUT /api/products/:id/approve', () => {
    let productId

    beforeAll(async () => {
      const product = await prisma.product.create({
        data: {
          vendorId,
          categoryId,
          nameAr: 'منتج للموافقة',
          nameEn: 'Product to Approve',
          price: 300.00,
          isApproved: false
        }
      })
      productId = product.id
    })

    it('should approve product', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isApproved: true })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('DELETE /api/products/:id', () => {
    let productId

    beforeAll(async () => {
      const product = await prisma.product.create({
        data: {
          vendorId,
          categoryId,
          nameAr: 'منتج للحذف',
          nameEn: 'Product to Delete',
          price: 400.00
        }
      })
      productId = product.id
    })

    it('should delete product', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })
})


