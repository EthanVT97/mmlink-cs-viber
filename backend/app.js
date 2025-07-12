const express = require('express');
const viber = require('./config/viber');
const apiRoutes = require('./routes/api');
const { supabase } = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', apiRoutes);

// Viber webhook
app.post('/viber-webhook', (req, res) => {
  viber.handleWebhook(req, res);
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
