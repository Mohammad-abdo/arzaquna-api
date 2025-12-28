const request = require('supertest')
const app = require('../../src/server')
const prisma = require('../../src/config/database')
const { createTestAdmin, cleanDatabase } = require('../helpers/testHelpers')

describe('Users Routes', () => {
  let adminToken

  beforeAll(async () => {
    await cleanDatabase()
    const admin = await createTestAdmin()
    
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: admin.email,
        password: 'admin123'
      })
    adminToken = loginResponse.body.data.token
  })

  afterAll(async () => {
    await cleanDatabase()
    await prisma.$disconnect()
  })

  describe('GET /api/users', () => {
    it('should get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.users)).toBe(true)
    })

    it('should paginate users', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.pagination).toBeDefined()
    })
  })

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'New Test User',
          email: 'newtest@test.com',
          phone: '+1234567894',
          password: 'password123',
          role: 'USER'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.email).toBe('newtest@test.com')
    })
  })

  describe('GET /api/users/:id', () => {
    let userId

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          fullName: 'Test User Detail',
          email: 'detail@test.com',
          phone: '+1234567895',
          password: 'hashed',
          role: 'USER'
        }
      })
      userId = user.id
    })

    it('should get user by id', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(userId)
    })
  })

  describe('PUT /api/users/:id/status', () => {
    let userId

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          fullName: 'Status Test User',
          email: 'status@test.com',
          phone: '+1234567896',
          password: 'hashed',
          role: 'USER',
          isActive: true
        }
      })
      userId = user.id
    })

    it('should toggle user status', async () => {
      const response = await request(app)
        .put(`/api/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('DELETE /api/users/:id', () => {
    let userId

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          fullName: 'Delete Test User',
          email: 'delete@test.com',
          phone: '+1234567897',
          password: 'hashed',
          role: 'USER'
        }
      })
      userId = user.id
    })

    it('should delete user', async () => {
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })
})


