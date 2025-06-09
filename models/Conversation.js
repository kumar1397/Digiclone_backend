// models/Conversation.js
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'clone'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cloneId: { type: String, required: true },
  sessionId: { type: String, required: true, default: () => uuidv4() },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  lastMessageAt: { type: Date, default: Date.now },
});

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
