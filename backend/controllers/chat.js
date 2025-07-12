const { supabase } = require('../config/supabase');
const { sendMessage } = require('../config/viber');
const { getResponse } = require('../services/gemini');

const chatService = {
  async startChat(userId, message) {
    // Check if operator is available
    const { data: availableOperator } = await supabase
      .from('operators')
      .select('id')
      .eq('status', 'online')
      .limit(1)
      .single();
    
    if (availableOperator) {
      return this.connectToOperator(userId, availableOperator.id, message);
    }
    
    // Fallback to Gemini AI
    const aiResponse = await getResponse(message);
    await sendMessage(userId, aiResponse);
    
    // Offer to queue for operator
    await sendMessage(userId,
      "Would you like to be connected to a human operator when one becomes available? (yes/no)"
    );
    
    await supabase
      .from('user_sessions')
      .upsert({
        user_id: userId,
        state: 'awaiting_operator',
        data: { initial_query: message }
      });
    
    return true;
  },

  async connectToOperator(userId, operatorId, initialMessage = null) {
    // Create chat session
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('contact_number', userId)
      .single();
    
    const customerId = customer?.id || null;
    
    const { data: session } = await supabase
      .from('chat_sessions')
      .insert({
        customer_id: customerId,
        operator_id: operatorId,
        status: 'active'
      })
      .select()
      .single();
    
    // Store initial message if exists
    if (initialMessage) {
      await supabase
        .from('messages')
        .insert({
          session_id: session.id,
          sender_type: 'customer',
          content: initialMessage
        });
    }
    
    // Notify both parties
    await sendMessage(userId,
      "You're now connected to a support operator. Please describe your issue."
    );
    
    await supabase
      .from('operator_notifications')
      .insert({
        operator_id: operatorId,
        session_id: session.id,
        message: `New chat from ${userId}`,
        is_read: false
      });
    
    return true;
  },

  async handleOperatorResponse(userId, message) {
    const { data: activeSession } = await supabase
      .from('chat_sessions')
      .select('id, operator_id')
      .eq('customer_id', userId)
      .eq('status', 'active')
      .single();
    
    if (!activeSession) {
      await sendMessage(userId, "No active chat session. Type 'support' to start one.");
      return false;
    }
    
    // Store customer message
    await supabase
      .from('messages')
      .insert({
        session_id: activeSession.id,
        sender_type: 'customer',
        content: message
      });
    
    // Notify operator
    await supabase
      .from('operator_notifications')
      .insert({
        operator_id: activeSession.operator_id,
        session_id: activeSession.id,
        message: `New message from ${userId}`,
        is_read: false
      });
    
    return true;
  },

  async endChat(userId) {
    const { data: activeSession } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('customer_id', userId)
      .eq('status', 'active')
      .single();
    
    if (!activeSession) return false;
    
    await supabase
      .from('chat_sessions')
      .update({
        status: 'ended',
        end_time: new Date()
      })
      .eq('id', activeSession.id);
    
    await sendMessage(userId, "Chat session ended. Thank you for contacting us.");
    return true;
  }
};

module.exports = chatService;
