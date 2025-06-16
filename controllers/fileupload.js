import { GridFsStorage } from 'multer-gridfs-storage';
import multer from 'multer';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const storage = new GridFsStorage({
  url: process.env.DATABASE_URL,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    if (file.mimetype !== 'application/pdf') {
      return null;
    }
    return {
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: 'pdfs',
    };
  },
});

const upload = multer({ storage });

// Multiple file upload handler
const uploadPDFs = (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No PDFs uploaded' });
  }

  const filesMetadata = req.files.map(file => ({
    id: file.id,
    filename: file.filename,
    contentType: file.contentType,
    uploadDate: file.uploadDate,
  }));

  return res.status(200).json({
    message: 'PDFs uploaded successfully',
    files: filesMetadata,
  });
};

export {
  upload,
  uploadPDFs,
};
