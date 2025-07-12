const { supabase } = require('../config/supabase');
const { viber } = require('../config/viber');

const registrationSteps = [
  { prompt: "Please enter your full name:", field: "full_name" },
  { prompt: "Please enter your NRC/Passport number:", field: "nrc_passport" },
  { prompt: "Please enter your contact number:", field: "contact_number" },
  { prompt: "Please enter your installation address:", field: "address" },
  { 
    prompt: async () => {
      const { data: packages } = await supabase.from('packages').select('*').eq('is_active', true);
      const packageList = packages.map(p => `${p.name} - ${p.speed} (${p.price} MMK)`).join('\n');
      return `Available packages:\n${packageList}\n\nPlease enter the package name you want:`;
    },
    field: "package_id",
    validate: async (input) => {
      const { data } = await supabase
        .from('packages')
        .select('id')
        .eq('name', input)
        .eq('is_active', true)
        .single();
      return data ? data.id : null;
    }
  },
  { 
    prompt: "Please enter your preferred installation date (DD-MM-YYYY):",
    field: "installation_date",
    validate: (input) => {
      const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
      if (!dateRegex.test(input)) return false;
      const date = new Date(input.split('-').reverse().join('-'));
      return !isNaN(date.getTime()) ? date.toISOString() : false;
    }
  }
];

async function startRegistration(userId) {
  await supabase
    .from('user_sessions')
    .upsert({
      user_id: userId,
      state: 'registration',
      step: 0,
      data: {}
    });
  
  await sendStepPrompt(userId, 0);
}

async function sendStepPrompt(userId, stepIndex) {
  const step = registrationSteps[stepIndex];
  const prompt = typeof step.prompt === 'function' ? await step.prompt() : step.prompt;
  
  await viber.sendMessage(userId, prompt);
}

async function handleRegistrationResponse(userId, input) {
  const { data: session } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (!session) return;
  
  const currentStep = registrationSteps[session.step];
  let value = input;
  
  if (currentStep.validate) {
    value = await currentStep.validate(input);
    if (!value) {
      await viber.sendMessage(userId, "Invalid input. Please try again:");
      return;
    }
  }
  
  // Update session data
  const updatedData = { ...session.data, [currentStep.field]: value };
  const nextStep = session.step + 1;
  
  await supabase
    .from('user_sessions')
    .update({
      data: updatedData,
      step: nextStep
    })
    .eq('user_id', userId);
  
  if (nextStep < registrationSteps.length) {
    await sendStepPrompt(userId, nextStep);
  } else {
    await completeRegistration(userId, updatedData);
  }
}

async function completeRegistration(userId, data) {
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        full_name: data.full_name,
        nrc_passport: data.nrc_passport,
        contact_number: data.contact_number,
        address: data.address,
        package_id: data.package_id,
        installation_date: data.installation_date
      })
      .select()
      .single();
    
    if (error) throw error;
    
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);
    
    await viber.sendMessage(userId, 
      `Registration complete! Your customer ID is ${customer.id}. ` +
      `We'll contact you soon about installation.`
    );
  } catch (err) {
    console.error('Registration error:', err);
    await viber.sendMessage(userId, 
      "Registration failed. Please contact our support team."
    );
  }
}

module.exports = {
  startRegistration,
  handleRegistrationResponse
};
