import { GridFsStorage } from 'multer-gridfs-storage';
import multer from 'multer';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LinkUpload from '../models/LinkUpload.js';
import File from '../models/FileUpload.js';

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

// === Upload PDFs ===
const uploadPDFs = async (req, res) => {
  const userId = req.query.userId;

  console.log('=== uploadPDFs Debug ===');
  console.log('Received userId:', userId);
  console.log('Files:', req.files);
  console.log('=========================');

  if (!userId || userId === 'undefined') {
    return res.status(401).json({ error: 'Missing or invalid user ID in query parameters' });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No PDFs uploaded' });
  }

  try {
    const savedFiles = await Promise.all(req.files.map(async file => {
      console.log("Uploading file with id:", file.id); // ✅ Debug check

      const metadata = new File({
        userId: new mongoose.Types.ObjectId(userId),
        fileId: file.id, // ✅ Save the correct GridFS file id
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadDate: file.uploadDate || new Date(),
      });

      await metadata.save();

      return {
        fileId: file.id,
        originalName: file.originalname,
        link: `${process.env.BACKEND_URL}/file/${file.id}`, // ✅ Link corrected to use BACKEND
      };
    }));

    return res.status(200).json({
      message: 'PDFs uploaded successfully',
      files: savedFiles,
    });
  } catch (error) {
    console.error('Error in uploadPDFs:', error);
    return res.status(500).json({ error: 'Error saving file metadata' });
  }
};

// === Get All Files Uploaded By User ===
export const getUserFiles = async (req, res) => {
  const userId = req.params.userId;

  if (!userId || userId === 'undefined') {
    return res.status(400).json({ error: 'Missing or invalid user ID' });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format' });
  }

  try {
    const files = await File.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ uploadDate: -1 });
    const formatted = files.map(file => ({
      _id: file._id,
      fileId: file.fileId,
      originalName: file.originalName,
      size: file.fileSize,
      uploadedAt: file.uploadDate,
      link: `${process.env.BACKEND_URL}/file/${file.fileId}`, // ✅ fixed from file.id
    }));
    res.status(200).json(formatted);
  } catch (err) {
    console.error("Error fetching files:", err);
    res.status(500).json({ error: "Error fetching user files" });
  }
};

// === Stream File by ID (PDF View/Download) ===
export const streamFileById = async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'pdfs',
    });

    const stream = bucket.openDownloadStream(fileId);

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'inline');

    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(404).json({ error: 'File not found' });
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// === Save External Links (YouTube + Others) ===
export const LinksUpload = async (req, res) => {
  try {
    const linksData = req.body.links || req.body;
    const youtubeLinks = [];
    const otherLinks = [];

    const processLink = (linkUrl) => {
      if (linkUrl.toLowerCase().includes('youtube')) {
        youtubeLinks.push(linkUrl);
      } else {
        otherLinks.push(linkUrl);
      }
    };

    if (Array.isArray(linksData)) {
      linksData.forEach(linkItem => {
        if (typeof linkItem === 'string') processLink(linkItem);
        else if (linkItem?.value) processLink(linkItem.value);
      });
    } else if (typeof linksData === 'string') {
      processLink(linksData);
    } else if (linksData?.value) {
      processLink(linksData.value);
    } else {
      throw new Error('Invalid link format');
    }

    const savedLinks = new LinkUpload({ youtubeLinks, otherLinks });
    await savedLinks.save();

    return res.status(201).json({
      message: 'Links processed and saved successfully',
      data: savedLinks
    });
  } catch (error) {
    console.error("Error saving links:", error);
    return res.status(500).json({
      error: 'Error processing or saving links',
      message: error.message
    });
  }
};

export {
  upload,
  uploadPDFs,
};
