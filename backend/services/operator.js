const { supabase } = require('../config/supabase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const operatorService = {
  async register(name, email, password) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const { data, error } = await supabase
      .from('operators')
      .insert({
        name,
        email,
        password_hash: hashedPassword,
        status: 'offline'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Operator registration error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, operator: data };
  },

  async login(email, password) {
    const { data: operator, error } = await supabase
      .from('operators')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !operator) {
      return { success: false, error: 'Operator not found' };
    }
    
    const passwordMatch = await bcrypt.compare(password, operator.password_hash);
    if (!passwordMatch) {
      return { success: false, error: 'Invalid password' };
    }
    
    const token = jwt.sign(
      { id: operator.id, email: operator.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    return { success: true, token, operator };
  },

  async updateStatus(operatorId, status) {
    const validStatuses = ['online', 'offline', 'busy'];
    if (!validStatuses.includes(status)) {
      return { success: false, error: 'Invalid status' };
    }
    
    const { data, error } = await supabase
      .from('operators')
      .update({
        status,
        last_active: new Date()
      })
      .eq('id', operatorId)
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, operator: data };
  },

  async getActiveChats(operatorId) {
    const { data: chats, error } = await supabase
      .from('chat_sessions')
      .select('*, customers(full_name, contact_number)')
      .eq('operator_id', operatorId)
      .eq('status', 'active')
      .order('start_time', { ascending: false });
    
    if (error) {
      console.error('Error fetching chats:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, chats };
  },

  async sendMessage(sessionId, operatorId, message) {
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('customer_id, customers(contact_number)')
      .eq('id', sessionId)
      .eq('operator_id', operatorId)
      .single();
    
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    // Store message
    await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        sender_type: 'operator',
        content: message
      });
    
    // Send via Viber
    const { sendMessage } = require('../config/viber');
    await sendMessage(session.customers.contact_number, `Operator: ${message}`);
    
    return { success: true };
  }
};

module.exports = operatorService;
