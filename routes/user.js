import express from 'express';
import { signin, signup } from '../controllers/Auth.js';
import { saveMessage, getUserConversations, getSessionsByClone, getConversationBySession } from '../controllers/conversation.js';

const router = express.Router();

// Auth routes
router.post('/signup', signup);
router.post('/signin', signin);

// Conversation routes
router.post('/conversation/save', saveMessage);
router.get('/conversations', getUserConversations);
router.get('/conversations/:cloneId', getSessionsByClone);
router.get('/conversation/:sessionId', getConversationBySession);

export default router;
