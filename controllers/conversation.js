import Conversation from '../models/Conversation.js';
import mongoose from 'mongoose';

export const saveMessage = async (req, res) => {
  try {
    const { chatHistory, folder } = req.body;
    const userId = new mongoose.Types.ObjectId("123456789012345678901234");
    console.log('Received chat history save request:', { 
      messageCount: chatHistory?.length,
      folder, 
      userId
    });

    if (!chatHistory || !folder) {
      console.log('Missing fields in request:', { 
        chatHistory: !!chatHistory, 
        folder: !!folder 
      });
      return res.status(400).json({ error: 'Missing fields' });
    }

    const now = new Date();

    // Convert chat history to message format
    const messages = chatHistory.flatMap(chat => {
      console.log('Processing message:', {
        userContent: chat.user,
        botContent: chat.bot.content,
        botContentLength: chat.bot.content?.length
      });
      
      return [
        {
          role: 'user',
          content: chat.user,
          timestamp: now,
        },
        {
          role: 'clone',
          content: chat.bot.content,
          timestamp: now,
        }
      ];
    });

    // Check if conversation exists between user and clone
    let conversation = await Conversation.findOne({ 
      userId: userId,
      cloneId: folder 
    });

    if (conversation) {
      // If conversation exists, append new messages
      conversation.messages.push(...messages);
      await conversation.save();
      return res.status(200).json({ 
        message: 'Messages added to existing conversation',
        messageCount: conversation.messages.length
      });
    } else {
      // If no conversation exists, create new one
      conversation = new Conversation({
        userId,
        cloneId: folder,
        messages: messages,
      });
      await conversation.save();
      return res.status(200).json({ 
        message: 'New conversation created successfully',
        messageCount: conversation.messages.length
      });
    }
  } catch (err) {
    console.error('Error saving conversation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all conversations (sessions) for a user
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(conversations);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
};

// Get all sessions for a cloneId
export const getSessionsByClone = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cloneId } = req.params;
    const sessions = await Conversation.find({ userId, cloneId }).sort({ createdAt: -1 });

    if (!sessions.length) {
      return res.status(404).json({ message: 'No sessions found for this clone' });
    }

    res.status(200).json(sessions);
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
