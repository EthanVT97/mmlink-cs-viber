-- Customers Table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  nrc_passport TEXT NOT NULL UNIQUE,
  contact_number TEXT NOT NULL,
  address TEXT NOT NULL,
  package_id UUID REFERENCES packages(id),
  installation_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Packages Table
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  speed TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Speed Tests Table
CREATE TABLE speed_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  download_speed NUMERIC(10,2) NOT NULL,
  upload_speed NUMERIC(10,2) NOT NULL,
  test_date TIMESTAMPTZ DEFAULT NOW(),
  server_location TEXT
);

-- Payments Table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  amount NUMERIC(10,2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  payment_method TEXT NOT NULL,
  transaction_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending'
);

-- Operators Table
CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT DEFAULT 'offline',
  last_active TIMESTAMPTZ
);

-- Chat Sessions Table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  operator_id UUID REFERENCES operators(id),
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'pending'
);

-- Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id),
  sender_type TEXT NOT NULL, -- 'customer' or 'operator'
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_customer_contact ON customers(contact_number);
CREATE INDEX idx_speed_test_customer ON speed_tests(customer_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
