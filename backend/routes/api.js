const express = require('express');
const router = express.Router();
const { authenticateOperator } = require('../middleware/auth');
const operatorController = require('../controllers/operator');

// Operator authentication
router.post('/operators/register', async (req, res) => {
  const { name, email, password } = req.body;
  const result = await operatorController.register(name, email, password);
  
  if (result.success) {
    res.status(201).json(result.operator);
  } else {
    res.status(400).json({ error: result.error });
  }
});

router.post('/operators/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await operatorController.login(email, password);
  
  if (result.success) {
    res.json({ token: result.token, operator: result.operator });
  } else {
    res.status(401).json({ error: result.error });
  }
});

// Operator actions (authenticated)
router.put('/operators/status', authenticateOperator, async (req, res) => {
  const { status } = req.body;
  const result = await operatorController.updateStatus(req.operator.id, status);
  
  if (result.success) {
    res.json(result.operator);
  } else {
    res.status(400).json({ error: result.error });
  }
});

router.get('/operators/chats', authenticateOperator, async (req, res) => {
  const result = await operatorController.getActiveChats(req.operator.id);
  
  if (result.success) {
    res.json(result.chats);
  } else {
    res.status(500).json({ error: result.error });
  }
});

router.post('/chats/:sessionId/messages', authenticateOperator, async (req, res) => {
  const { message } = req.body;
  const result = await operatorController.sendMessage(
    req.params.sessionId, 
    req.operator.id, 
    message
  );
  
  if (result.success) {
    res.json({ success: true });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// Customer data (authenticated)
router.get('/customers/:id', authenticateOperator, async (req, res) => {
  const { data: customer, error } = await supabase
    .from('customers')
    .select('*, packages(name, speed, price)')
    .eq('id', req.params.id)
    .single();
  
  if (error) {
    res.status(500).json({ error: error.message });
  } else {
    res.json(customer);
  }
});

module.exports = router;
