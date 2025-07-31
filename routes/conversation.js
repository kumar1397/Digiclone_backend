import express from 'express';
import { saveMessage, getUserConversations, getUserClonesWithDetails } from '../controllers/conversation.js';


const router = express.Router();

// Conversation routes
router.post('/conversation/save', saveMessage);
router.get('/conversations/:userId/:cloneId', getUserConversations);
router.get('/conversation/:userId', getUserClonesWithDetails)

export default router;
