import express from 'express';
import {
  createClone,
} from '../controllers/clone.js';
import { upload } from '../controllers/clone.js';

const router = express.Router();

// Clone CRUD routes
router.post('/create', upload.fields([
  { name: 'cloneImage', maxCount: 1 },
  { name: 'files', maxCount: 10 }
]), createClone);

export default router;
