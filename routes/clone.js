import express from 'express';
import {
  createClone,
  getAllClones,
  getCloneById,
  uploadForClone,
} from '../controllers/clone.js';

const router = express.Router();

// Test route to verify clone routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Clone routes are working!' });
});

// Clone CRUD routes - use multer middleware for FormData handling
router.post('/create', uploadForClone.any(), createClone);
router.get('/all', getAllClones);
router.get('/:clone_id', getCloneById);

export default router;
