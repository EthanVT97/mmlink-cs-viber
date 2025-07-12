const { supabase } = require('../config/supabase');
const { sendMessage } = require('../config/viber');

const paymentService = {
  methods: [
    { id: 'wave', name: 'Wave Money', instructions: 'Send to 09795544332' },
    { id: 'kbz', name: 'KBZ Pay', instructions: 'Pay to 09795544332' },
    { id: 'aya', name: 'AYA Pay', instructions: 'Transfer to 09795544332' },
    { id: 'cash', name: 'Cash Payment', instructions: 'Visit our office at No.123, Yangon' }
  ],

  async showOptions(userId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, packages(name, price)')
      .eq('contact_number', userId)
      .single();
    
    if (!customer) {
      await sendMessage(userId, "You need to register first. Type 'register' to begin.");
      return false;
    }
    
    await supabase
      .from('user_sessions')
      .upsert({
        user_id: userId,
        state: 'payment',
        data: {
          customer_id: customer.id,
          amount: customer.packages.price,
          package: customer.packages.name
        }
      });
    
    const optionsText = this.methods.map((m, i) => 
      `${i+1}. ${m.name}`
    ).join('\n');
    
    await sendMessage(userId,
      `💵 Payment for: ${customer.packages.name}\n` +
      `Amount: ${customer.packages.price} MMK\n\n` +
      `Payment Methods:\n${optionsText}\n\n` +
      `Reply with the number of your chosen method (1-${this.methods.length}):`
    );
    return true;
  },

  async handleMethod(userId, input) {
    const methodIndex = parseInt(input) - 1;
    if (isNaN(methodIndex) || methodIndex < 0 || methodIndex >= this.methods.length) {
      await sendMessage(userId, "Invalid selection. Please try again.");
      return false;
    }
    
    const method = this.methods[methodIndex];
    const { data: session } = await supabase
      .from('user_sessions')
      .select('data')
      .eq('user_id', userId)
      .single();
    
    if (method.id === 'cash') {
      await this.recordCashPayment(userId, session.data);
    } else {
      await this.initiateMobilePayment(userId, session.data, method);
    }
    return true;
  },

  async initiateMobilePayment(userId, data, method) {
    const paymentId = `pay_${Date.now()}`;
    
    await supabase
      .from('payments')
      .insert({
        id: paymentId,
        customer_id: data.customer_id,
        amount: data.amount,
        payment_method: method.id,
        status: 'pending'
      });
    
    await sendMessage(userId,
      `📱 ${method.name} Payment\n\n` +
      `Amount: ${data.amount} MMK\n` +
      `Instructions: ${method.instructions}\n\n` +
      `After payment, your transaction ID is:\n${paymentId}\n` +
      `Type 'confirm ${paymentId}' once paid.`
    );
  },

  async recordCashPayment(userId, data) {
    await supabase
      .from('payments')
      .insert({
        customer_id: data.customer_id,
        amount: data.amount,
        payment_method: 'cash',
        status: 'pending_verification'
      });
    
    await sendMessage(userId,
      `🏦 Cash Payment Instructions\n\n` +
      `Please visit our office with exact amount:\n` +
      `Amount: ${data.amount} MMK\n` +
      `Address: No.123, Downtown Yangon\n` +
      `Hours: 9AM-5PM (Mon-Fri)\n\n` +
      `Our staff will verify your payment.`
    );
    
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);
  },

  async confirmPayment(userId, paymentId) {
    const { data: payment } = await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', paymentId)
      .select()
      .single();
    
    if (!payment) {
      await sendMessage(userId, "Invalid payment ID. Please check and try again.");
      return false;
    }
    
    await sendMessage(userId,
      `✅ Payment Confirmed\n\n` +
      `Transaction ID: ${payment.id}\n` +
      `Amount: ${payment.amount} MMK\n` +
      `Date: ${new Date(payment.created_at).toLocaleDateString()}\n\n` +
      `Thank you for your payment!`
    );
    
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);
    
    return true;
  }
};

module.exports = paymentService;
