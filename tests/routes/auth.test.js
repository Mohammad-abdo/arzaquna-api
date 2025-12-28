const request = require('supertest')
const app = require('../../src/server')
const prisma = require('../../src/config/database')
const { createTestAdmin, createTestUser, cleanDatabase } = require('../helpers/testHelpers')

describe('Auth Routes', () => {
  let adminUser, regularUser

  beforeAll(async () => {
    await cleanDatabase()
    adminUser = await createTestAdmin()
    regularUser = await createTestUser()
  })

  afterAll(async () => {
    await cleanDatabase()
    await prisma.$disconnect()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'New User',
          email: 'newuser@test.com',
          phone: '+1234567892',
          password: 'password123'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe('newuser@test.com')
    })

    it('should not register with existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Duplicate User',
          email: adminUser.email,
          phone: '+1234567893',
          password: 'password123'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: adminUser.email,
          password: 'admin123'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.token).toBeDefined()
      expect(response.body.data.user.email).toBe(adminUser.email)
    })

    it('should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: adminUser.email,
          password: 'wrongpassword'
        })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/auth/me', () => {
    let token

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: adminUser.email,
          password: 'admin123'
        })
      token = loginResponse.body.data.token
    })

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.email).toBe(adminUser.email)
    })

    it('should not get user without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')

      expect(response.status).toBe(401)
    })
  })
})


