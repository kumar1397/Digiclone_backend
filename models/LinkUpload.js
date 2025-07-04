import mongoose from 'mongoose';

const linkUploadSchema = new mongoose.Schema({
  cloneId: {
    type: String,
    required: true,
  },
  youtubeLinks: {
    type: [String],
    default: []
  },
  otherLinks: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

const LinkUpload = mongoose.model('LinkUpload', linkUploadSchema);

export default LinkUpload;
