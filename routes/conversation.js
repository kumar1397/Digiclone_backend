import express from 'express';
import {
  saveMessage,
  getUserConversations,
} from '../controllers/conversation.js';


const router = express.Router();

router.post('/save', saveMessage);
router.get('/', getUserConversations);


export default router;
