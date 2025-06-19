import express from 'express';
const router = express.Router();
import { upload, uploadPDFs, LinksUpload } from '../controllers/fileupload.js';

router.post('/files', upload.array('files',10), uploadPDFs);
router.post('/links', LinksUpload);
export default router;