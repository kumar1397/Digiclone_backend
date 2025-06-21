import express from 'express';
const router = express.Router();
import { upload, uploadPDFs, LinksUpload, getUserFiles } from '../controllers/fileupload.js';
import { streamFileById } from '../controllers/fileupload.js';
// Add middleware to log request details
router.use('/files', (req, res, next) => {
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Query parameters:', req.query);
  console.log('Headers:', req.headers);
  next();
});

router.post('/files', upload.array('files',10), uploadPDFs);
router.post('/links', LinksUpload);
router.get('/files/:userId', getUserFiles);
router.get('/file/:id', streamFileById);
export default router;