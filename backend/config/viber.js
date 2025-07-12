const { Api } = require('viber-bot');
const BotConfiguration = require('viber-bot').BotConfiguration;

const botConfig = new BotConfiguration({
  name: "Myanmar Link ISP",
  avatar: "https://example.com/isp-logo.jpg",
  authToken: process.env.VIBER_TOKEN
});

const viber = new Api(botConfig);

// Error handling wrapper
const sendMessage = async (userId, message) => {
  try {
    await viber.sendMessage(userId, new (require('viber-bot').Message.Text)(message));
    return true;
  } catch (err) {
    console.error('Viber message failed:', err);
    return false;
  }
};

// Webhook handler setup
const handleWebhook = (req, res) => {
  viber.middleware()(req, res, () => {
    const message = req.body.message;
    if (message.text) {
      require('../controllers/router').routeMessage(req.body.sender.id, message.text);
    }
  });
};

module.exports = { viber, sendMessage, handleWebhook };
