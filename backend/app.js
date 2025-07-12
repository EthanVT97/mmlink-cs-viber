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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimiter);

// Routes
app.use('/api', apiRouter);

// Viber webhook
app.post('/viber-webhook', handleWebhook);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Supabase connected to: ${process.env.SUPABASE_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = app;
