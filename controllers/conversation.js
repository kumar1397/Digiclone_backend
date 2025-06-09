// controllers/conversationController.js
import Conversation from '../models/Conversation.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

// Save a message to conversation with sessionId
// controllers/conversationController.js

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

    // Add completion message
    const completionMessage = {
      role: 'clone',
      content: 'Session completed',
      timestamp: now,
    };
    messages.push(completionMessage);

    // Create new conversation with all messages
    const conversation = new Conversation({
      userId,
      cloneId: folder,
      sessionId: uuidv4(),
      messages: messages,
      lastMessageAt: now,
    });

    await conversation.save();
    console.log('Conversation saved successfully:', {
      sessionId: conversation.sessionId,
      messageCount: conversation.messages.length,
      lastMessageAt: conversation.lastMessageAt,
      firstMessageContent: conversation.messages[0]?.content,
      firstMessageLength: conversation.messages[0]?.content?.length
    });

    return res.status(200).json({ 
      message: 'Conversation saved successfully',
      sessionId: conversation.sessionId,
      messageCount: conversation.messages.length
    });
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
