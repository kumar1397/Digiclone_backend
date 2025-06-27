import express from 'express';
import {
  createClone,
} from '../controllers/clone.js';
import { uploadForClone } from '../controllers/clone.js';

const router = express.Router();

// Clone CRUD routes
router.post('/create', uploadForClone.fields([
  { name: 'cloneImage', maxCount: 1 },
  { name: 'files', maxCount: 10 }
]), createClone);

export default router;
