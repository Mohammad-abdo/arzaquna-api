const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sliders', require('./routes/sliders'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/app-content', require('./routes/appContent'));
app.use('/api/statuses', require('./routes/statuses'));
app.use('/api/admin', require('./routes/admin'));

// Mobile API Routes (Granular endpoints)
app.use('/api/mobile/auth', require('./routes/mobile/auth'));
app.use('/api/mobile/home', require('./routes/mobile/home'));
app.use('/api/mobile/categories', require('./routes/mobile/categories'));
app.use('/api/mobile/vendors', require('./routes/mobile/vendors'));
app.use('/api/mobile/products', require('./routes/mobile/products'));
app.use('/api/mobile/statuses', require('./routes/mobile/statuses'));
app.use('/api/mobile/favorites', require('./routes/mobile/favorites'));
app.use('/api/mobile/orders', require('./routes/mobile/orders'));
app.use('/api/mobile/notifications', require('./routes/mobile/notifications'));
app.use('/api/mobile/messages', require('./routes/mobile/messages'));
app.use('/api/mobile/user', require('./routes/mobile/user'));
app.use('/api/mobile/app', require('./routes/mobile/app'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Arzaquna API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

