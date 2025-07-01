import dotenv from 'dotenv';
import mongoose from 'mongoose';
import File from '../models/FileUpload.js';
import CloneProfile from '../models/Clone.js';

dotenv.config();

// === Get All Files by Clone ID String ===
export const getFilesByCloneIdString = async (req, res) => {
  const cloneIdString = req.params.cloneIdString;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!cloneIdString || cloneIdString === 'undefined') {
    return res.status(400).json({ error: 'Missing or invalid clone ID string' });
  }

  if (page < 1 || limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'Invalid pagination parameters' });
  }

  try {
    // First find the clone by clone_id string
    const clone = await CloneProfile.findOne({ clone_id: cloneIdString });
    
    if (!clone) {
      return res.status(404).json({ error: 'Clone not found' });
    }

    // Then find all files associated with this clone with pagination
    const files = await File.find({ cloneId: clone._id })
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination info
    const totalFiles = await File.countDocuments({ cloneId: clone._id });
    
    const formatted = files.map(file => ({
      _id: file._id,
      fileId: file.fileId,
      originalName: file.originalName,
      size: file.fileSize,
      mimeType: file.mimeType,
      uploadedAt: file.uploadDate,
      link: `${process.env.BACKEND_URL}/file/${file.fileId}`,
    }));
    
    res.status(200).json({
      files: formatted,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalFiles / limit),
        totalFiles,
        hasNextPage: page * limit < totalFiles,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error("Error fetching files:", err);
    res.status(500).json({ error: "Error fetching clone files" });
  }
};

// === Stream File by ID (PDF View/Download) ===
export const streamFileById = async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    
    // First check if file exists in our database
    const fileDoc = await File.findById(fileId);
    if (!fileDoc) {
      return res.status(404).json({ error: 'File not found' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'pdfs',
    });

    // Check if file exists in GridFS
    const files = await bucket.find({ _id: fileId }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found in storage' });
    }

    const stream = bucket.openDownloadStream(fileId);

    // Use the mime type from the database or default to application/pdf
    const contentType = fileDoc.mimeType || 'application/pdf';
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', 'inline');
    res.set('Content-Length', fileDoc.fileSize);

    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      // Only send error if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file' });
      }
    });

    stream.on('end', () => {
      console.log('File stream completed successfully');
    });

  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

