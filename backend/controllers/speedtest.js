const { supabase } = require('../config/supabase');
const { sendMessage } = require('../config/viber');
const speedTest = require('speedtest-net');

const speedTestService = {
  async initiateTest(userId) {
    await sendMessage(userId, 
      "🔄 Starting speed test... This may take 30-60 seconds.\n" +
      "Please wait while we measure your connection."
    );
    
    try {
      const test = speedTest({ maxTime: 5000 });
      
      test.on('data', async data => {
        const result = {
          download: (data.speeds.download / 8).toFixed(2), // Mbps to MB/s
          upload: (data.speeds.upload / 8).toFixed(2),
          ping: data.server.ping
        };
        
        await this.saveResult(userId, result);
        await this.sendResult(userId, result);
      });
      
      test.on('error', async err => {
        console.error('Speed test error:', err);
        await sendMessage(userId, 
          "❌ Speed test failed. Please check your connection and try again."
        );
      });
    } catch (err) {
      console.error('Speed test exception:', err);
      await sendMessage(userId, 
        "❌ Speed test failed. Please try again later."
      );
    }
  },

  async saveResult(userId, result) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('contact_number', userId)
      .single();
    
    if (!customer) return false;
    
    await supabase
      .from('speed_tests')
      .insert({
        customer_id: customer.id,
        download_speed: result.download,
        upload_speed: result.upload,
        ping: result.ping
      });
    
    return true;
  },

  async sendResult(userId, result) {
    await sendMessage(userId,
      `📊 Speed Test Results\n\n` +
      `Download: ${result.download} MB/s\n` +
      `Upload: ${result.upload} MB/s\n` +
      `Ping: ${result.ping} ms\n\n` +
      `Type 'history' to see past tests.`
    );
  },

  async showHistory(userId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('contact_number', userId)
      .single();
    
    if (!customer) {
      await sendMessage(userId, "You need to register first. Type 'register' to begin.");
      return false;
    }
    
    const { data: tests } = await supabase
      .from('speed_tests')
      .select('created_at, download_speed, upload_speed, ping')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!tests?.length) {
      await sendMessage(userId, "No speed test history found. Type 'speedtest' to run one.");
      return false;
    }
    
    const historyText = tests.map(t => 
      `${new Date(t.created_at).toLocaleString()}:\n` +
      `▼ ${t.download_speed} MB/s ▲ ${t.upload_speed} MB/s ⏱ ${t.ping} ms`
    ).join('\n\n');
    
    await sendMessage(userId,
      `📅 Last 5 Speed Tests:\n\n${historyText}`
    );
    return true;
  }
};

module.exports = speedTestService;
