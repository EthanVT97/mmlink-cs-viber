const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authenticateOperator = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: operator, error } = await supabase
      .from('operators')
      .select('*')
      .eq('id', decoded.id)
      .single();
    
    if (error || !operator) {
      return res.status(401).json({ error: 'Operator not found' });
    }
    
    req.operator = operator;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticateOperator };
