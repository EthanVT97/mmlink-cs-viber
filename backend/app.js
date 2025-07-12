require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { supabase } = require('./config/supabase');
const { handleWebhook } = require('./config/viber');
const apiRouter = require('./routes/api');
const { rateLimiter } = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate limiting
if (process.env.NODE_ENV === 'production') {
  app.use('/api', rateLimiter);
}

// Routes
app.use('/api', apiRouter);

// Viber webhook - add input validation
app.post('/viber-webhook', 
  express.raw({ type: 'application/json' }), 
  handleWebhook
);

// Enhanced health check
app.get('/health', async (req, res) => {
  const healthcheck = {
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: 'unknown',
    memoryUsage: process.memoryUsage()
  };

  try {
    // Test database connection
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .limit(1);
    
    healthcheck.database = error ? 'unhealthy' : 'connected';
  } catch (err) {
    healthcheck.database = 'error';
    healthcheck.dbError = err.message;
  }

  res.status(healthcheck.database === 'connected' ? 200 : 503)
     .json(healthcheck);
});

// Error handling
app.use(errorHandler);

// Start server with proper error handling
const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Supabase connected to: ${process.env.SUPABASE_URL}`);

  // Verify database connection on startup
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Database connection verified');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1); // Exit if DB connection fails
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

module.exports = { app, server };
