/**
 * Cloudinary Upload Utility
 * Handles secure file uploads to Cloudinary with progress tracking and error handling
 */

class CloudinaryUploader {
    constructor() {
        this.cloudName = 'your-cloud-name'; // Replace with your Cloudinary cloud name
        this.uploadPreset = 'your-upload-preset'; // Replace with your upload preset
        this.apiKey = 'your-api-key'; // Replace with your API key (keep secure in production)
        this.maxFileSize = 2 * 1024 * 1024; // 2MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    }

    /**
     * Initialize Cloudinary uploader with configuration
     * @param {Object} config - Configuration object
     */
    init(config = {}) {
        if (config.cloudName) this.cloudName = config.cloudName;
        if (config.uploadPreset) this.uploadPreset = config.uploadPreset;
        if (config.apiKey) this.apiKey = config.apiKey;
        if (config.maxFileSize) this.maxFileSize = config.maxFileSize;
        if (config.allowedTypes) this.allowedTypes = config.allowedTypes;

        console.log('Cloudinary uploader initialized');
    }

    /**
     * Validate file before upload
     * @param {File} file - File to validate
     * @returns {Object} Validation result
     */
    validateFile(file) {
        const errors = [];

        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            errors.push(`File type ${file.type} is not allowed. Allowed types: ${this.allowedTypes.join(', ')}`);
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(this.maxFileSize / 1024 / 1024).toFixed(2)}MB`);
        }

        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            errors.push('Only image files are allowed');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Upload file to Cloudinary
     * @param {File} file - File to upload
     * @param {Object} options - Upload options
     * @returns {Promise} Upload promise
     */
    async uploadFile(file, options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                // Validate file first
                const validation = this.validateFile(file);
                if (!validation.isValid) {
                    reject(new Error(validation.errors.join(', ')));
                    return;
                }

                // Create form data
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', this.uploadPreset);
                formData.append('cloud_name', this.cloudName);
                formData.append('api_key', this.apiKey);

                // Add optional parameters
                if (options.folder) formData.append('folder', options.folder);
                if (options.public_id) formData.append('public_id', options.public_id);
                if (options.tags) formData.append('tags', options.tags);
                if (options.transformation) formData.append('transformation', options.transformation);

                // Create XMLHttpRequest for progress tracking
                const xhr = new XMLHttpRequest();

                // Progress tracking
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        this.onProgress?.(percentComplete, file);
                    }
                });

                // Load completion
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);
                        this.onSuccess?.(response, file);
                        resolve(response);
                    } else {
                        const error = new Error(`Upload failed with status ${xhr.status}`);
                        this.onError?.(error, file);
                        reject(error);
                    }
                });

                // Error handling
                xhr.addEventListener('error', () => {
                    const error = new Error('Upload failed due to network error');
                    this.onError?.(error, file);
                    reject(error);
                });

                // Abort handling
                xhr.addEventListener('abort', () => {
                    const error = new Error('Upload was aborted');
                    this.onError?.(error, file);
                    reject(error);
                });

                // Start upload
                xhr.open('POST', `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`);
                xhr.send(formData);

                // Store xhr for potential cancellation
                this.currentXhr = xhr;

            } catch (error) {
                this.onError?.(error, file);
                reject(error);
            }
        });
    }

    /**
     * Upload multiple files
     * @param {FileList} files - Files to upload
     * @param {Object} options - Upload options
     * @returns {Promise} Array of upload results
     */
    async uploadMultiple(files, options = {}) {
        const uploadPromises = Array.from(files).map(file => 
            this.uploadFile(file, options)
        );
        
        return Promise.all(uploadPromises);
    }

    /**
     * Cancel current upload
     */
    cancelUpload() {
        if (this.currentXhr) {
            this.currentXhr.abort();
            this.currentXhr = null;
        }
    }

    /**
     * Generate Cloudinary URL with transformations
     * @param {string} publicId - Cloudinary public ID
     * @param {Object} transformations - Transformation options
     * @returns {string} Transformed image URL
     */
    generateUrl(publicId, transformations = {}) {
        const baseUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload`;
        
        const transformParams = [];
        
        if (transformations.width) transformParams.push(`w_${transformations.width}`);
        if (transformations.height) transformParams.push(`h_${transformations.height}`);
        if (transformations.crop) transformParams.push(`c_${transformations.crop}`);
        if (transformations.quality) transformParams.push(`q_${transformations.quality}`);
        if (transformations.format) transformParams.push(`f_${transformations.format}`);
        if (transformations.gravity) transformParams.push(`g_${transformations.gravity}`);
        
        const transformationString = transformParams.length > 0 ? transformParams.join(',') + '/' : '';
        
        return `${baseUrl}/${transformationString}${publicId}`;
    }

    /**
     * Delete image from Cloudinary
     * @param {string} publicId - Public ID of image to delete
     * @returns {Promise} Delete operation promise
     */
    async deleteImage(publicId) {
        try {
            const timestamp = Math.round((new Date()).getTime() / 1000);
            const signature = await this.generateSignature(publicId, timestamp);
            
            const formData = new FormData();
            formData.append('public_id', publicId);
            formData.append('signature', signature);
            formData.append('api_key', this.apiKey);
            formData.append('timestamp', timestamp);
            
            const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Delete failed with status ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }

    /**
     * Generate signature for secure API calls (for server-side use)
     * @param {string} publicId - Public ID
     * @param {number} timestamp - Timestamp
     * @returns {Promise<string>} Generated signature
     */
    async generateSignature(publicId, timestamp) {
        // In a real application, this should be done server-side
        // This is a placeholder that would call your backend
        try {
            const response = await fetch('/api/cloudinary/signature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ publicId, timestamp })
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate signature');
            }
            
            const data = await response.json();
            return data.signature;
            
        } catch (error) {
            console.error('Error generating signature:', error);
            throw new Error('Signature generation failed');
        }
    }

    /**
     * Event handlers
     */
    onProgress = null; // function(percentComplete, file)
    onSuccess = null; // function(response, file)
    onError = null; // function(error, file)
}

// Utility functions
const CloudinaryUtils = {
    /**
     * Create image preview from file
     * @param {File} file - Image file
     * @returns {Promise<string>} Data URL
     */
    createPreview: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsDataURL(file);
        });
    },

    /**
     * Compress image before upload
     * @param {File} file - Image file
     * @param {Object} options - Compression options
     * @returns {Promise<File>} Compressed file
     */
    compressImage: function(file, options = {}) {
        return new Promise((resolve, reject) => {
            const { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = options;
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
                
                // Set canvas dimensions
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress image
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now()
                    });
                    
                    resolve(compressedFile);
                }, file.type, quality);
            };
            
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    },

    /**
     * Get file information
     * @param {File} file - File to analyze
     * @returns {Object} File information
     */
    getFileInfo: function(file) {
        return {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            sizeReadable: this.formatFileSize(file.size)
        };
    },

    /**
     * Format file size to human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// Create global instance
const cloudinaryUploader = new CloudinaryUploader();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CloudinaryUploader, CloudinaryUtils, cloudinaryUploader };
} else {
    window.CloudinaryUploader = CloudinaryUploader;
    window.CloudinaryUtils = CloudinaryUtils;
    window.cloudinaryUploader = cloudinaryUploader;
}

// Auto-initialize with environment variables if available
document.addEventListener('DOMContentLoaded', function() {
    if (window.CLOUDINARY_CLOUD_NAME) {
        cloudinaryUploader.init({
            cloudName: window.CLOUDINARY_CLOUD_NAME,
            uploadPreset: window.CLOUDINARY_UPLOAD_PRESET,
            apiKey: window.CLOUDINARY_API_KEY
        });
    }
});