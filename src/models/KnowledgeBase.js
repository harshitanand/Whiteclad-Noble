// src/models/KnowledgeBase.js - New model for knowledge base management
const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema(
  {
    // Basic info (from form-new-knowledgebase)
    kb_name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    
    // Files uploaded
    kb_files: [{
      filename: {
        type: String,
        required: true,
      },
      originalName: {
        type: String,
        required: true,
      },
      path: {
        type: String,
        required: true,
      },
      mimetype: {
        type: String,
        required: true,
      },
      size: {
        type: Number,
        required: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      processed: {
        type: Boolean,
        default: false,
      },
      extractedText: String,
      chunks: [{
        content: String,
        embedding: [Number], // Vector embeddings for AI search
        metadata: mongoose.Schema.Types.Mixed,
      }],
    }],

    // Knowledge base metadata
    description: {
      type: String,
      maxlength: 500,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    
    // Processing status
    status: {
      type: String,
      enum: ['uploading', 'processing', 'ready', 'error'],
      default: 'uploading',
    },
    processingError: String,
    
    // Usage tracking
    totalFiles: {
      type: Number,
      default: 0,
    },
    totalSize: {
      type: Number,
      default: 0,
    },
    lastUsedAt: Date,
    usageCount: {
      type: Number,
      default: 0,
    },

    // Organization and ownership
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },

    // Soft delete
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
knowledgeBaseSchema.index({ organizationId: 1, isActive: 1 });
knowledgeBaseSchema.index({ createdBy: 1, isActive: 1 });
knowledgeBaseSchema.index({ status: 1 });
knowledgeBaseSchema.index({ tags: 1 });

// Virtual for formatted size
knowledgeBaseSchema.virtual('formattedSize').get(function () {
  const bytes = this.totalSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Instance methods
knowledgeBaseSchema.methods.addFiles = function(files) {
  files.forEach(file => {
    this.kb_files.push({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
    });
    this.totalSize += file.size;
  });
  
  this.totalFiles = this.kb_files.length;
  return this.save();
};

knowledgeBaseSchema.methods.markAsProcessed = function(fileId, extractedText, chunks) {
  const file = this.kb_files.id(fileId);
  if (file) {
    file.processed = true;
    file.extractedText = extractedText;
    file.chunks = chunks;
  }
  
  // Check if all files are processed
  const allProcessed = this.kb_files.every(f => f.processed);
  if (allProcessed) {
    this.status = 'ready';
  }
  
  return this.save();
};

knowledgeBaseSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

knowledgeBaseSchema.methods.search = function(query, limit = 10) {
  // This would integrate with vector search
  // For now, return text-based search
  const results = [];
  
  this.kb_files.forEach(file => {
    if (file.extractedText && file.extractedText.toLowerCase().includes(query.toLowerCase())) {
      results.push({
        filename: file.originalName,
        content: file.extractedText,
        relevance: 1.0, // Would be calculated by vector similarity
      });
    }
  });
  
  return results.slice(0, limit);
};

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
