const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection on startup
(async () => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Supabase connected successfully');
  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
  }
})();

module.exports = { supabase };
