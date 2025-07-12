import { Bot, Events, Message } from 'viber-bot-js';
import { routeMessage } from '../controllers/router.js';
import { createLogger } from '../config/logger.js';

const logger = createLogger('viber-bot');

// Initialize the bot
const bot = new Bot({
  authToken: process.env.VIBER_TOKEN,
  name: "Myanmar Link ISP",
  avatar: "https://example.com/isp-logo.jpg",
  registerOnViber: true
});

// Error handling wrapper
const sendMessage = async (userId, message) => {
  try {
    await bot.sendMessage(userId, new Message.Text(message));
    logger.info(`Message sent to ${userId}`);
    return true;
  } catch (err) {
    logger.error('Failed to send message:', { userId, error: err.message });
    return false;
  }
};

// Webhook handler setup
const handleWebhook = (req, res) => {
  bot.middleware({
    handleError: (error) => {
      logger.error('Webhook error:', error);
      res.status(500).end();
    },
    handleSuccess: () => res.status(200).end()
  })(req, res);
};

// Event listeners
bot.on(Events.MESSAGE_RECEIVED, (message, response) => {
  logger.info('Message received', { sender: response.userProfile.id });
  if (message.text) {
    routeMessage(response.userProfile.id, message.text);
  }
});

bot.on(Events.SUBSCRIBED, (response) => {
  logger.info('New subscriber', { user: response.userProfile });
  sendMessage(response.userProfile.id, 
    "Thanks for subscribing to Myanmar Link ISP! Type 'help' to see available commands."
  );
});

bot.on(Events.ERROR, (error) => {
  logger.error('Bot error:', error);
});

export { bot, sendMessage, handleWebhook };
