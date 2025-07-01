import express from 'express';
import { getFilesByCloneIdString, streamFileById } from '../controllers/fileupload.js';

const router = express.Router();

// Get all files for a specific clone (by clone_id string)
router.get('/clone-id/:cloneIdString/files', getFilesByCloneIdString);

// Stream/download a specific file by ID
router.get('/file/:id', streamFileById);

export default router; 