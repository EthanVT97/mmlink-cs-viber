import React, { useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import ChatWindow from './ChatWindow';
import CustomerInfo from './CustomerInfo';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
  const { operator, logout } = useContext(AuthContext);
  const [activeChats, setActiveChats] = useState([]);
  const [pendingChats, setPendingChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    fetchChats();
    
    const subscription = supabase
      .channel('chat_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_sessions'
      }, () => fetchChats())
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchChats = async () => {
    const { data: pending } = await supabase
      .from('chat_sessions')
      .select('*, customers(*)')
      .eq('status', 'pending');
    
    const { data: active } = await supabase
      .from('chat_sessions')
      .select('*, customers(*)')
      .eq('status', 'active')
      .eq('operator_id', operator.id);

    setPendingChats(pending);
    setActiveChats(active);
  };

  const acceptChat = async (chatId) => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({
        status: 'active',
        operator_id: operator.id,
        start_time: new Date()
      })
      .eq('id', chatId);
    
    if (!error) {
      setSelectedChat(chatId);
      fetchChats();
    }
  };

  return (
    <div className="dashboard-container">
      <header>
        <h1>Myanmar Link ISP Operator Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </header>
      
      <div className="chat-queues">
        <div className="pending-chats">
          <h2>Pending Chats ({pendingChats.length})</h2>
          {pendingChats.map(chat => (
            <div key={chat.id} className="chat-card">
              <p>{chat.customers.full_name}</p>
              <button onClick={() => acceptChat(chat.id)}>Accept</button>
            </div>
          ))}
        </div>
        
        <div className="active-chats">
          <h2>Your Active Chats</h2>
          {activeChats.map(chat => (
            <div key={chat.id} className="chat-card">
              <p>{chat.customers.full_name}</p>
              <button 
                onClick={() => setSelectedChat(chat.id)}
                className={selectedChat === chat.id ? 'active' : ''}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {selectedChat && (
        <div className="chat-window-container">
          <ChatWindow chatId={selectedChat} />
          <CustomerInfo chatId={selectedChat} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
