const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary utility functions
const cloudinaryUtils = {
  // Upload file to Cloudinary
  uploadToCloudinary: async (filePath, folder = 'star-media-tech') => {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: 'auto', // Automatically detect image, video, raw
        quality: 'auto',
        fetch_format: 'auto',
      });

      return {
        public_id: result.public_id,
        url: result.secure_url,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload file to cloud storage');
    }
  },

  // Upload file from buffer (without saving locally first)
  uploadFromBuffer: async (buffer, folder = 'star-media-tech', resourceType = 'auto') => {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            resource_type: resourceType,
            quality: 'auto',
            fetch_format: 'auto',
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                public_id: result.public_id,
                url: result.secure_url,
                format: result.format,
                resource_type: result.resource_type,
                bytes: result.bytes,
                width: result.width,
                height: result.height,
              });
            }
          }
        );

        uploadStream.end(buffer);
      });
    } catch (error) {
      console.error('Cloudinary buffer upload error:', error);
      throw new Error('Failed to upload file from buffer');
    }
  },

  // Delete file from Cloudinary
  deleteFromCloudinary: async (publicId, resourceType = 'image') => {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      if (result.result !== 'ok') {
        throw new Error(`Failed to delete file: ${result.result}`);
      }

      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error('Failed to delete file from cloud storage');
    }
  },

  // Delete multiple files
  deleteMultipleFromCloudinary: async (publicIds, resourceType = 'image') => {
    try {
      const result = await cloudinary.api.delete_resources(publicIds, {
        resource_type: resourceType,
      });

      return result;
    } catch (error) {
      console.error('Cloudinary delete multiple error:', error);
      throw new Error('Failed to delete multiple files from cloud storage');
    }
  },

  // Generate image URL with transformations
  generateImageUrl: (publicId, transformations = {}) => {
    return cloudinary.url(publicId, {
      ...transformations,
      secure: true,
    });
  },

  // Get resource information
  getResourceInfo: async (publicId, resourceType = 'image') => {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });

      return result;
    } catch (error) {
      console.error('Cloudinary get resource error:', error);
      throw new Error('Failed to get resource information');
    }
  },

  // Upload video with specific settings
  uploadVideo: async (filePath, folder = 'star-media-tech/videos') => {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: 'video',
        chunk_size: 6000000, // 6MB chunks
        eager: [
          { width: 300, height: 300, crop: 'pad', audio_codec: 'none' },
          { width: 160, height: 100, crop: 'crop', gravity: 'south', audio_codec: 'none' },
        ],
        eager_async: true,
      });

      return {
        public_id: result.public_id,
        url: result.secure_url,
        format: result.format,
        bytes: result.bytes,
        duration: result.duration,
        width: result.width,
        height: result.height,
        eager: result.eager, // Different quality versions
      };
    } catch (error) {
      console.error('Cloudinary video upload error:', error);
      throw new Error('Failed to upload video to cloud storage');
    }
  },

  // Create folder in Cloudinary
  createFolder: async (folderPath) => {
    try {
      const result = await cloudinary.api.create_folder(folderPath);
      return result;
    } catch (error) {
      console.error('Cloudinary create folder error:', error);
      throw new Error('Failed to create folder in cloud storage');
    }
  },

  // List resources in a folder
  listFolderResources: async (folderPath, maxResults = 30) => {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folderPath,
        max_results: maxResults,
      });

      return result;
    } catch (error) {
      console.error('Cloudinary list resources error:', error);
      throw new Error('Failed to list folder resources');
    }
  },
};

// Multer storage configuration for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'star-media-tech/uploads',
    format: async (req, file) => {
      // Extract format from original filename or use default
      const ext = path.extname(file.originalname).toLowerCase();
      return ext.replace('.', '') || 'jpg';
    },
    public_id: (req, file) => {
      // Generate unique public ID
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      return `file-${timestamp}-${randomString}`;
    },
    resource_type: (req, file) => {
      // Determine resource type based on mimetype
      if (file.mimetype.startsWith('image/')) {
        return 'image';
      } else if (file.mimetype.startsWith('video/')) {
        return 'video';
      } else if (file.mimetype.startsWith('audio/')) {
        return 'video'; // Cloudinary treats audio as video
      } else {
        return 'raw';
      }
    },
    transformation: [
      { quality: 'auto', fetch_format: 'auto' }
    ],
  },
});

// File filter for multer
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimeTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'image/svg+xml': true,
    'video/mp4': true,
    'video/mpeg': true,
    'video/quicktime': true,
    'video/webm': true,
    'audio/mpeg': true,
    'audio/wav': true,
    'application/pdf': true,
    'text/plain': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  };

  if (allowedMimeTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer with Cloudinary storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: fileFilter,
});

// Middleware for different upload scenarios
const uploadMiddleware = {
  // Single file upload
  single: (fieldName) => upload.single(fieldName),

  // Multiple files upload
  array: (fieldName, maxCount) => upload.array(fieldName, maxCount),

  // Multiple fields with different files
  fields: (fields) => upload.fields(fields),

  // Any file (less restrictive)
  any: () => upload.any(),
};

// Export configuration and utilities
module.exports = {
  cloudinary,
  uploadMiddleware,
  ...cloudinaryUtils,
};

// Optional: Add event listeners for Cloudinary
cloudinary.api
  .ping()
  .then((result) => {
    console.log('✅ Cloudinary connected successfully');
  })
  .catch((error) => {
    console.error('❌ Cloudinary connection failed:', error.message);
  });