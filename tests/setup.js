// Test setup file
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'mysql://root@localhost:3306/arzaquna_test'


