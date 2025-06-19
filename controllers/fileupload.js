import { GridFsStorage } from 'multer-gridfs-storage';
import multer from 'multer';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LinkUpload from '../models/LinkUpload.js';

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

export const LinksUpload = async (req, res) => {
  try {
    // Extract links from the request body structure
    const linksData = req.body.links || req.body;

    const youtubeLinks = [];
    const otherLinks = [];

    if (Array.isArray(linksData)) {
      linksData.forEach((linkItem, index) => {
        // Handle both string links and object links with value property
        let linkUrl;
        if (typeof linkItem === 'string') {
          linkUrl = linkItem;
        } else if (linkItem && typeof linkItem === 'object' && linkItem.value) {
          linkUrl = linkItem.value;
        } else {
          return;
        }
        
        if (linkUrl.toLowerCase().includes('youtube')) {
          youtubeLinks.push(linkUrl);
        } else {
          otherLinks.push(linkUrl);
        }
      });
    } else {
      let linkUrl;
      if (typeof linksData === 'string') {
        linkUrl = linksData;
      } else if (linksData && typeof linksData === 'object' && linksData.value) {
        linkUrl = linksData.value;
      } else {
        throw new Error('Invalid link format');
      }
      
      if (linkUrl.toLowerCase().includes('youtube')) {
        youtubeLinks.push(linkUrl);
      } else {
        otherLinks.push(linkUrl);
      }
    }

    const savedLinks = new LinkUpload({
      youtubeLinks,
      otherLinks
    });

    await savedLinks.save();

    return res.status(201).json({
      message: 'Links processed and saved successfully',
      data: savedLinks
    });

  } catch (error) {
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
