import express from 'express';
import { signin, signup, logout } from '../controllers/Auth.js';


const router = express.Router();

// Auth routes
router.post('/signup', signup);
router.post('/signin', signin);
router.get('/logout', logout);

export default router;
