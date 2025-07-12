const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const ISP_KNOWLEDGE = `
Myanmar Link ISP Information:
- Packages: Home 10Mbps (15,000 MMK), Business 50Mbps (50,000 MMK), Premium 100Mbps (80,000 MMK)
- Coverage Areas: Yangon, Mandalay, Naypyidaw
- Support Hours: 8AM-8PM daily
- Payment Methods: Wave Money, KBZ Pay, AYA Pay, Cash
- Installation: Within 3-5 business days after registration
- Common Issues: Slow speed (try restarting router), No connection (check cables)
`;

async function getResponse(prompt) {
  try {
    const fullPrompt = `
      You are a customer support assistant for Myanmar Link ISP. 
      Use this knowledge base: ${ISP_KNOWLEDGE}
      
      Respond to the customer's query in a helpful, professional manner.
      If unsure or for complex issues, suggest connecting to a human operator.
      
      Customer query: ${prompt}
      
      Respond in English or Myanmar language as appropriate.
      Keep responses concise (1-2 paragraphs max).
    `;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    return text || "I couldn't generate a response. Please try again or ask for a human operator.";
  } catch (err) {
    console.error('Gemini API error:', err);
    return "I'm having trouble answering that. Would you like to speak with a human operator?";
  }
}

module.exports = { getResponse };
