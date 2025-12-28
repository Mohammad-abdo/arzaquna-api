const request = require('supertest')
const app = require('../../src/server')
const prisma = require('../../src/config/database')
const { createTestAdmin, cleanDatabase } = require('../helpers/testHelpers')

describe('Admin Routes', () => {
  let adminToken

  beforeAll(async () => {
    await cleanDatabase()
    
    const admin = await createTestAdmin()
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'admin123' })
    adminToken = adminLogin.body.data.token
  })

  afterAll(async () => {
    await cleanDatabase()
    await prisma.$disconnect()
  })

  describe('GET /api/admin/dashboard/stats', () => {
    it('should get dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('totalUsers')
      expect(response.body.data).toHaveProperty('totalVendors')
      expect(response.body.data).toHaveProperty('totalProducts')
    })
  })

  describe('GET /api/admin/reports', () => {
    it('should get reports data', async () => {
      const response = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('should filter reports by type', async () => {
      const response = await request(app)
        .get('/api/admin/reports?type=users')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('POST /api/admin/products', () => {
    let categoryId, vendorId

    beforeAll(async () => {
      const category = await prisma.category.create({
        data: {
          nameAr: 'فئة',
          nameEn: 'Category',
          isActive: true
        }
      })
      categoryId = category.id

      const user = await prisma.user.create({
        data: {
          fullName: 'Vendor User',
          email: 'vendor@test.com',
          phone: '+1234567890',
          password: 'hashed',
          role: 'VENDOR'
        }
      })

      const vendor = await prisma.vendor.create({
        data: {
          userId: user.id,
          storeName: 'Test Store',
          city: 'City',
          region: 'Region',
          whatsappNumber: '+1234567890',
          callNumber: '+1234567890',
          yearsOfExperience: 5,
          specialization: JSON.stringify(['Cows']),
          isApproved: true
        }
      })
      vendorId = vendor.id
    })

    it('should create product as admin', async () => {
      const response = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('nameAr', 'منتج إداري')
        .field('nameEn', 'Admin Product')
        .field('categoryId', categoryId)
        .field('vendorId', vendorId)
        .field('price', '99.99')

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })
  })
})


