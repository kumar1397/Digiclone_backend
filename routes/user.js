import express from 'express';
import { signin, signup, logout, createuser } from '../controllers/Auth.js';
import { getUser, updateUser, deleteUser, getUserById } from '../controllers/user.js';

import multer from 'multer';
const upload = multer();
const router = express.Router();

// Auth routes
router.post('/signup', signup);
router.post('/signin', signin);
router.get('/logout', logout);
router.post('/create', createuser)

// User routes
router.post('/user', getUser);
router.get('/user/:id', getUserById);
router.put('/user/:id', upload.single('profilePicture'), updateUser);
router.delete('/user/:id', deleteUser);

export default router;
