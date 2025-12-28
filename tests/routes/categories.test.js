const request = require('supertest')
const app = require('../../src/server')
const prisma = require('../../src/config/database')
const { createTestAdmin, cleanDatabase } = require('../helpers/testHelpers')

describe('Categories Routes', () => {
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

  describe('GET /api/categories', () => {
    it('should get all categories', async () => {
      const response = await request(app)
        .get('/api/categories')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
    })
  })

  describe('POST /api/categories', () => {
    it('should create category', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('nameAr', 'فئة جديدة')
        .field('nameEn', 'New Category')
        .field('icon', 'icon-name')

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.nameEn).toBe('New Category')
    })
  })

  describe('PUT /api/categories/:id', () => {
    let categoryId

    beforeAll(async () => {
      const category = await prisma.category.create({
        data: {
          nameAr: 'فئة للتعديل',
          nameEn: 'Category to Edit',
          isActive: true
        }
      })
      categoryId = category.id
    })

    it('should update category', async () => {
      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('nameEn', 'Updated Category Name')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('DELETE /api/categories/:id', () => {
    let categoryId

    beforeAll(async () => {
      const category = await prisma.category.create({
        data: {
          nameAr: 'فئة للحذف',
          nameEn: 'Category to Delete',
          isActive: true
        }
      })
      categoryId = category.id
    })

    it('should delete category', async () => {
      const response = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })
})


