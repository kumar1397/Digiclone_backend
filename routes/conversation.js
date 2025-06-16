import express from 'express';
import { saveMessage, getUserConversations, getSessionsByClone } from '../controllers/conversation.js';


const router = express.Router();

// Conversation routes
router.post('/conversation/save', saveMessage);
router.get('/conversations', getUserConversations);
router.get('/conversations/:cloneId', getSessionsByClone);

export default router;
