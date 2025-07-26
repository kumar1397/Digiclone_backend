import express from 'express';
import {
  createClone,
  getAllClones,
  getClonebyId,
  uploadForClone,
  uploadOtherLinks,
  uploadFilesperId,
  uploadYoutubeLinks,
  getFilesByCloneId,
  getPDFById,
  updateClone
} from '../controllers/clone.js';

const router = express.Router();
// Clone CRUD routes - use multer middleware for FormData handling
router.post('/create', uploadForClone.any(), createClone);
router.put('/:clone_id',  updateClone);
router.get('/all', getAllClones);
router.get('/:clone_id', getClonebyId);
router.post('/upload/pdf/:clone_id', uploadForClone.array('uploadedFiles'),uploadFilesperId);
router.post('/upload/youtube/:clone_id', uploadYoutubeLinks);
router.post('/upload/other/:clone_id', uploadOtherLinks);
router.get('/files/:clone_id', getFilesByCloneId);
router.get('/file/:fileId', getPDFById);

export default router;
