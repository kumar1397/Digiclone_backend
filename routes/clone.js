import express from 'express';
import {
  createClone,
  uploadForClone,
} from '../controllers/clone.js';

const router = express.Router();

// Test route to verify clone routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Clone routes are working!' });
});

// Clone CRUD routes - use multer middleware for FormData handling
router.post('/create', uploadForClone.any(), createClone);

export default router;
