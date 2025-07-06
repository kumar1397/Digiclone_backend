import express from 'express';
import { signin, signup, logout } from '../controllers/Auth.js';
import { getUser, updateUser, deleteUser } from '../controllers/user.js';

const router = express.Router();

// Auth routes
router.post('/signup', signup);
router.post('/signin', signin);
router.get('/logout', logout);

// User routes
router.get('/user/:id', getUser);
router.put('/user/:id', updateUser);
router.delete('/user/:id', deleteUser);

export default router;
