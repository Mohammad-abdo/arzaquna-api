const request = require('supertest')
const app = require('../../src/server')
const prisma = require('../../src/config/database')
const { createTestAdmin, createTestUser, cleanDatabase } = require('../helpers/testHelpers')

describe('Vendors Routes', () => {
  let adminToken, userId

  beforeAll(async () => {
    await cleanDatabase()
    
    const admin = await createTestAdmin()
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'admin123' })
    adminToken = adminLogin.body.data.token

    const user = await createTestUser()
    userId = user.id
  })

  afterAll(async () => {
    await cleanDatabase()
    await prisma.$disconnect()
  })

  describe('GET /api/vendors', () => {
    it('should get all vendors', async () => {
      const response = await request(app)
        .get('/api/vendors')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('POST /api/vendors/applications', () => {
    it('should create vendor application', async () => {
      const category = await prisma.category.create({
        data: {
          nameAr: 'فئة',
          nameEn: 'Category',
          isActive: true
        }
      })

      const response = await request(app)
        .post('/api/vendors/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          storeName: 'Test Store Application',
          city: 'Test City',
          region: 'Test Region',
          whatsappNumber: '+1234567890',
          callNumber: '+1234567890',
          yearsOfExperience: 5,
          specialization: JSON.stringify(['Cows']),
          categoryIds: [category.id]
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })
  })

  describe('PUT /api/vendors/:id/status', () => {
    let vendorId

    beforeAll(async () => {
      const category = await prisma.category.create({
        data: {
          nameAr: 'فئة',
          nameEn: 'Category',
          isActive: true
        }
      })

      const vendor = await prisma.vendor.create({
        data: {
          userId,
          storeName: 'Status Test Store',
          city: 'City',
          region: 'Region',
          whatsappNumber: '+1234567890',
          callNumber: '+1234567890',
          yearsOfExperience: 5,
          specialization: JSON.stringify(['Cows']),
          isApproved: false
        }
      })

      await prisma.vendorCategory.create({
        data: {
          vendorId: vendor.id,
          categoryId: category.id
        }
      })

      vendorId = vendor.id
    })

    it('should update vendor status', async () => {
      const response = await request(app)
        .put(`/api/vendors/${vendorId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isApproved: true })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })
})


