const { supabase } = require('../config/supabase');
const { sendMessage } = require('../config/viber');

const registrationFlow = {
  steps: [
    {
      prompt: "Please enter your full name:",
      field: "full_name",
      validate: (input) => input.length >= 3
    },
    {
      prompt: "Please enter your NRC/Passport number (e.g., 12/ABC(N)123456):",
      field: "nrc_passport",
      validate: (input) => /^[0-9]+\/[A-Za-z]+\([A-Za-z]\)[0-9]+$/.test(input)
    },
    {
      prompt: "Please enter your contact number (09XXXXXXXX):",
      field: "contact_number",
      validate: (input) => /^09[0-9]{9}$/.test(input)
    },
    {
      prompt: "Please enter your installation address:",
      field: "address",
      validate: (input) => input.length >= 10
    },
    {
      prompt: async () => {
        const { data, error } = await supabase
          .from('packages')
          .select('id,name,speed,price')
          .eq('is_active', true);
        
        if (error) throw error;
        return `Available packages:\n${data.map(p => `- ${p.name} (${p.speed}, ${p.price} MMK)`).join('\n')}\n\nPlease type the package name you want:`;
      },
      field: "package_id",
      validate: async (input) => {
        const { data } = await supabase
          .from('packages')
          .select('id')
          .eq('name', input)
          .single();
        return data?.id || false;
      }
    },
    {
      prompt: "Enter preferred installation date (DD-MM-YYYY):",
      field: "installation_date",
      validate: (input) => {
        const date = new Date(input.split('-').reverse().join('-'));
        return !isNaN(date.getTime()) && date > new Date();
      }
    }
  ],

  async start(userId) {
    await supabase
      .from('user_sessions')
      .upsert({
        user_id: userId,
        state: 'registration',
        step: 0,
        data: {}
      });
    
    await this.sendStep(userId, 0);
  },

  async sendStep(userId, stepIndex) {
    const step = this.steps[stepIndex];
    const prompt = typeof step.prompt === 'function' ? await step.prompt() : step.prompt;
    await sendMessage(userId, prompt);
  },

  async handleResponse(userId, input) {
    const { data: session } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!session) return false;

    const currentStep = this.steps[session.step];
    let value = input;
    
    if (currentStep.validate) {
      value = await currentStep.validate(input);
      if (!value) {
        await sendMessage(userId, "Invalid input. Please try again.");
        return false;
      }
    }
    
    const updatedData = { ...session.data, [currentStep.field]: value };
    const nextStep = session.step + 1;
    
    await supabase
      .from('user_sessions')
      .update({
        data: updatedData,
        step: nextStep
      })
      .eq('user_id', userId);
    
    if (nextStep < this.steps.length) {
      await this.sendStep(userId, nextStep);
    } else {
      await this.complete(userId, updatedData);
    }
    return true;
  },

  async complete(userId, data) {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          full_name: data.full_name,
          nrc_passport: data.nrc_passport,
          contact_number: data.contact_number,
          address: data.address,
          package_id: data.package_id,
          installation_date: new Date(data.installation_date.split('-').reverse().join('-'))
        })
        .select()
        .single();
      
      if (error) throw error;
      
      await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);
      
      await sendMessage(userId,
        `✅ Registration complete!\n\n` +
        `Customer ID: ${customer.id}\n` +
        `Package: ${data.package_id}\n` +
        `Installation Date: ${data.installation_date}\n\n` +
        `We'll contact you for confirmation.`
      );
      return true;
    } catch (err) {
      console.error('Registration error:', err);
      await sendMessage(userId, 
        "❌ Registration failed. Please contact our support team."
      );
      return false;
    }
  }
};

module.exports = registrationFlow;
