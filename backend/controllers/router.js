import { registrationFlow } from './registration.js';
import { paymentService } from './payment.js';
import { speedTestService } from './speedtest.js';
import { chatService } from './chat.js';
import { getResponse } from '../services/gemini.js';
import { logger } from '../config/logger.js';

// User session states
const USER_STATES = {
  REGISTRATION: 'registration',
  PAYMENT: 'payment',
  CHAT: 'chat'
};

// Command mappings
const COMMANDS = {
  REGISTER: ['register', 'signup', 'အကောင့်ဖွင့်မယ်'],
  SPEEDTEST: ['speedtest', 'speed test', 'အမြန်နှုန်းစစ်မယ်'],
  PAYMENT: ['pay', 'payment', 'bill', 'ငွေပေးချေမယ်'],
  SUPPORT: ['help', 'support', 'chat', 'အကူညီလိုချင်တယ်'],
  HISTORY: ['history', 'record', 'မှတ်တမ်း']
};

export function routeMessage(userId, messageText) {
  const normalizedMessage = messageText.toLowerCase().trim();

  try {
    // Check for command matches
    if (COMMANDS.REGISTER.some(cmd => normalizedMessage.includes(cmd))) {
      logger.info(`Starting registration for user: ${userId}`);
      return registrationFlow.start(userId);
    }

    if (COMMANDS.SPEEDTEST.some(cmd => normalizedMessage.includes(cmd))) {
      logger.info(`Starting speed test for user: ${userId}`);
      return speedTestService.initiateTest(userId);
    }

    if (COMMANDS.PAYMENT.some(cmd => normalizedMessage.includes(cmd))) {
      logger.info(`Starting payment process for user: ${userId}`);
      return paymentService.showOptions(userId);
    }

    if (COMMANDS.SUPPORT.some(cmd => normalizedMessage.includes(cmd))) {
      logger.info(`Connecting user to support: ${userId}`);
      return chatService.startChat(userId, normalizedMessage);
    }

    if (COMMANDS.HISTORY.some(cmd => normalizedMessage.includes(cmd))) {
      logger.info(`Fetching history for user: ${userId}`);
      return speedTestService.showHistory(userId);
    }

    // Handle confirmation messages (e.g., payment confirmations)
    if (normalizedMessage.startsWith('confirm ')) {
      const paymentId = normalizedMessage.split(' ')[1];
      logger.info(`Confirming payment for user: ${userId}, payment: ${paymentId}`);
      return paymentService.confirmPayment(userId, paymentId);
    }

    // Check for existing session state
    checkUserSession(userId, normalizedMessage);

  } catch (error) {
    logger.error(`Error routing message: ${error.message}`, { userId, message: normalizedMessage });
    return sendFallbackResponse(userId);
  }
}

async function checkUserSession(userId, message) {
  const { data: session } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!session) {
    logger.debug(`No active session for user: ${userId}, using Gemini`);
    const aiResponse = await getResponse(message);
    return bot.sendMessage(userId, aiResponse);
  }

  switch (session.state) {
    case USER_STATES.REGISTRATION:
      return registrationFlow.handleResponse(userId, message);
    case USER_STATES.PAYMENT:
      return paymentService.handleMethod(userId, message);
    case USER_STATES.CHAT:
      return chatService.handleOperatorResponse(userId, message);
    default:
      return sendFallbackResponse(userId);
  }
}

async function sendFallbackResponse(userId) {
  const fallbackMessage = `Sorry, I didn't understand that. Here are available commands:
  
• Register - Create new account
• Speedtest - Test your internet speed
• Pay - Pay your bill
• Support - Chat with our team
• History - View your speed test history`;

  return bot.sendMessage(userId, fallbackMessage);
}
