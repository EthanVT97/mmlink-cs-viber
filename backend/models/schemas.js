const Joi = require('joi');

const customerSchema = Joi.object({
  full_name: Joi.string().min(3).max(100).required(),
  nrc_passport: Joi.string().pattern(/^[0-9]+\/[A-Za-z]+\([A-Za-z]\)[0-9]+$/).required(),
  contact_number: Joi.string().pattern(/^09[0-9]{9}$/).required(),
  address: Joi.string().min(10).max(500).required(),
  package_id: Joi.string().uuid().required(),
  installation_date: Joi.date().greater('now').required()
});

const operatorSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/).required()
});

const paymentSchema = Joi.object({
  customer_id: Joi.string().uuid().required(),
  amount: Joi.number().positive().precision(2).required(),
  payment_method: Joi.string().valid('wave', 'kbz', 'aya', 'cash').required()
});

const chatMessageSchema = Joi.object({
  session_id: Joi.string().uuid().required(),
  sender_type: Joi.string().valid('customer', 'operator').required(),
  content: Joi.string().min(1).max(1000).required()
});

module.exports = {
  customerSchema,
  operatorSchema,
  paymentSchema,
  chatMessageSchema
};
