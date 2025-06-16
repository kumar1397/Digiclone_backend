import express from 'express';
const router = express.Router();
import { upload, uploadPDFs } from '../controllers/fileupload.js';

router.post('/upload', upload.array('files',10), uploadPDFs);

export default router;