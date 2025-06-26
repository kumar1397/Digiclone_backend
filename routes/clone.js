import express from 'express';
import { 
  createCloneWithUploads,
  uploadFilesForClone,
  uploadLinksForClone,
  getAllClones,
  getCloneById,
  updateClone,
  deleteClone,
  addFilesToClone,
  removeFilesFromClone,
  setLinkUploadForClone,
  removeLinkUploadFromClone
} from '../controllers/clone.js';

const router = express.Router();

// Clone CRUD routes
router.post('/create', createCloneWithUploads);           // Create clone with file/link uploads
router.get('/', getAllClones);                            // Get all clones
router.get('/:id', getCloneById);                         // Get clone by ID
router.put('/:id', updateClone);                          // Update clone
router.delete('/:id', deleteClone);                       // Delete clone

// File upload routes for clones
router.post('/:cloneId/upload-files', uploadFilesForClone);           // Upload files for specific clone
router.post('/:cloneId/files', addFilesToClone);                      // Add existing files to clone
router.delete('/:cloneId/files', removeFilesFromClone);               // Remove files from clone

// Link upload routes for clones
router.post('/:cloneId/upload-links', uploadLinksForClone);           // Upload links for specific clone
router.post('/:cloneId/link', setLinkUploadForClone);                 // Set link upload for clone
router.delete('/:cloneId/link', removeLinkUploadFromClone);           // Remove link upload from clone

export default router;
