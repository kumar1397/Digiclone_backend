import dotenv from 'dotenv';
import mongoose from 'mongoose';
import File from '../models/FileUpload.js';
import CloneProfile from '../models/Clone.js';
import LinkUpload from '../models/LinkUpload.js';

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

    // ✅ Check in your files collection
    const fileDoc = await File.findOne({ fileId: fileId }); // ← IMPORTANT FIX

    if (!fileDoc) {
      return res.status(404).json({ error: 'File not found' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'pdfs',
    });

    const stream = bucket.openDownloadStream(fileId);

    res.set('Content-Type', fileDoc.mimeType || 'application/pdf');
    res.set('Content-Disposition', 'inline');
    res.set('Content-Length', fileDoc.fileSize);

    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file' });
      }
    });

    stream.on('end', () => {
      console.log('✅ File stream completed');
    });

  } catch (error) {
    console.error('❌ Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// === Get All Links by Clone ID String ===
export const getLinksByCloneIdString = async (req, res) => {
  const cloneIdString = req.params.cloneIdString;

  if (!cloneIdString || cloneIdString === 'undefined') {
    return res.status(400).json({ error: 'Missing or invalid clone ID string' });
  }

  try {
    // First find the clone by clone_id string
    const clone = await CloneProfile.findOne({ clone_id: cloneIdString });
    
    if (!clone) {
      return res.status(404).json({ error: 'Clone not found' });
    }

    // Check if clone has linkUpload reference
    if (!clone.linkUpload) {
      return res.status(200).json({
        links: {
          youtubeLinks: [],
          otherLinks: []
        },
        message: 'No links found for this clone'
      });
    }

    // Fetch the link upload document
    const linkUpload = await LinkUpload.findById(clone.linkUpload);
    
    if (!linkUpload) {
      return res.status(200).json({
        links: {
          youtubeLinks: [],
          otherLinks: []
        },
        message: 'Link upload document not found'
      });
    }

    // Format the response
    const formattedLinks = {
      _id: linkUpload._id,
      youtubeLinks: linkUpload.youtubeLinks || [],
      otherLinks: linkUpload.otherLinks || [],
      createdAt: linkUpload.createdAt,
      updatedAt: linkUpload.updatedAt
    };

    res.status(200).json({
      links: formattedLinks,
      cloneInfo: {
        cloneId: clone._id,
        cloneIdString: clone.clone_id,
        cloneName: clone.clone_name
      }
    });

  } catch (err) {
    console.error("Error fetching links:", err);
    res.status(500).json({ error: "Error fetching clone links" });
  }
};


