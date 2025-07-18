/* eslint-disable no-underscore-dangle */
const fs = require('fs').promises;
const path = require('path');
const Promise = require('bluebird');
const KnowledgeBase = require('../models/KnowledgeBase');
const Organization = require('../models/Organization');
const AuditLog = require('../models/AuditLog');
const PermissionService = require('./permission.service');
const { NotFoundError, AuthorizationError } = require('../utils/errors');
const { AUDIT_ACTIONS, PERMISSIONS } = require('../utils/constants');
const logger = require('../config/logger');

class KnowledgeBaseService {
  /**
   * Create a new knowledge base
   */
  static async createKnowledgeBase(kbData, files, userId, organizationId, userRole) {
    try {
      // Check permissions
      if (!PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_CREATE)) {
        throw new AuthorizationError('Insufficient permissions to create knowledge bases');
      }

      // Check organization limits (if any)
      const organization = await Organization.findOne({ clerkId: organizationId });
      if (!organization) {
        throw new NotFoundError('Organization');
      }

      // Create knowledge base
      const knowledgeBase = new KnowledgeBase({
        ...kbData,
        organizationId,
        createdBy: userId,
        status: 'uploading',
      });

      // Process files if provided
      if (files && files.length > 0) {
        await this.processFiles(knowledgeBase, files);
      }

      await knowledgeBase.save();

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_CREATED, // We can add KB_CREATED later
        userId,
        organizationId,
        resourceType: 'knowledgebase',
        resourceId: knowledgeBase._id.toString(),
        details: {
          name: knowledgeBase.kb_name,
          fileCount: files?.length || 0,
        },
      });

      logger.info('Knowledge base created:', {
        kbId: knowledgeBase._id,
        name: knowledgeBase.kb_name,
        createdBy: userId,
      });

      // Start background processing
      if (files && files.length > 0) {
        this.startBackgroundProcessing(knowledgeBase._id);
      }

      return knowledgeBase;
    } catch (error) {
      logger.error('Failed to create knowledge base:', error);
      throw error;
    }
  }

  /**
   * Process uploaded files
   */
  static async processFiles(knowledgeBase, files) {
    try {
      // Process files in parallel with concurrency control
      const processedFiles = await Promise.map(
        files,
        async (file) => {
          // Store file information
          const fileInfo = {
            filename: file.filename || `${Date.now()}-${file.originalname}`,
            originalName: file.originalname,
            path: file.path || this.generateFilePath(file),
            mimetype: file.mimetype,
            size: file.size,
            uploadedAt: new Date(),
            processed: false,
          };

          // Save file to storage (in production, this would be S3)
          if (file.buffer) {
            await this.saveFileToStorage(fileInfo, file.buffer);
          }

          return fileInfo;
        },
        { concurrency: 5 }
      ); // Process up to 5 files in parallel

      // Add all processed files to knowledge base
      knowledgeBase.kb_files.push(...processedFiles);
      knowledgeBase.totalSize = processedFiles.reduce((sum, file) => sum + file.size, 0);

      knowledgeBase.totalFiles = knowledgeBase.kb_files.length;
      knowledgeBase.status = 'processing';
    } catch (error) {
      logger.error('Failed to process files:', error);
      throw error;
    }
  }

  /**
   * Generate file path
   */
  static generateFilePath(file) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    return `uploads/kb/${timestamp}-${file.originalname}`;
  }

  /**
   * Save file to storage
   */
  static async saveFileToStorage(fileInfo, buffer) {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(fileInfo.path);
      await fs.mkdir(dir, { recursive: true });

      // Save file
      await fs.writeFile(fileInfo.path, buffer);

      logger.info('File saved to storage:', {
        filename: fileInfo.filename,
        path: fileInfo.path,
        size: fileInfo.size,
      });
    } catch (error) {
      logger.error('Failed to save file to storage:', error);
      throw error;
    }
  }

  /**
   * Start background processing
   */
  static async startBackgroundProcessing(kbId) {
    try {
      // This would typically be handled by a background job queue
      // For now, we'll simulate processing
      setTimeout(async () => {
        await this.processKnowledgeBaseFiles(kbId);
      }, 1000);
    } catch (error) {
      logger.error('Failed to start background processing:', error);
    }
  }

  /**
   * Process knowledge base files (extract text, create embeddings)
   */
  static async processKnowledgeBaseFiles(kbId) {
    try {
      const knowledgeBase = await KnowledgeBase.findById(kbId);
      if (!knowledgeBase) return;

      // Filter out already processed files
      const filesToProcess = knowledgeBase.kb_files.filter((file) => !file.processed);

      // Process files in parallel with concurrency control
      await Promise.map(
        filesToProcess,
        async (file) => {
          try {
            // Extract text from file
            const extractedText = await this.extractTextFromFile(file);

            // Create chunks for better AI processing
            const chunks = this.createTextChunks(extractedText);

            // Mark file as processed
            await knowledgeBase.markAsProcessed(file._id, extractedText, chunks);

            logger.info('File processed:', {
              kbId,
              filename: file.originalName,
              textLength: extractedText.length,
              chunks: chunks.length,
            });

            return { success: true, filename: file.originalName };
          } catch (error) {
            logger.error(`Error processing file ${file.originalName}:`, error);
            return {
              success: false,
              filename: file.originalName,
              error: error.message,
            };
          }
        },
        { concurrency: 3 } // Process 3 files at a time
      );

      // Update knowledge base status
      knowledgeBase.status = 'ready';
      await knowledgeBase.save();

      logger.info('Knowledge base processing completed:', { kbId });
    } catch (error) {
      logger.error('Failed to process knowledge base files:', error);

      // Mark as error
      const knowledgeBase = await KnowledgeBase.findById(kbId);
      if (knowledgeBase) {
        knowledgeBase.status = 'error';
        knowledgeBase.processingError = error.message;
        await knowledgeBase.save();
      }
    }
  }

  /**
   * Extract text from file
   */
  static async extractTextFromFile(file) {
    try {
      if (file.mimetype === 'text/plain') {
        return await fs.readFile(file.path, 'utf-8');
      }

      if (file.mimetype === 'application/pdf') {
        // In production, use pdf-parse or similar
        return `[PDF content from ${file.originalName}]`;
      }

      if (file.mimetype.includes('word')) {
        // In production, use mammoth or similar
        return `[Word document content from ${file.originalName}]`;
      }

      return `[Content from ${file.originalName}]`;
    } catch (error) {
      logger.error('Failed to extract text from file:', error);
      return `[Unable to extract text from ${file.originalName}]`;
    }
  }

  /**
   * Create text chunks
   */
  static createTextChunks(text, chunkSize = 1000) {
    const chunks = [];
    const words = text.split(' ');

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push({
        content: chunk,
        embedding: [], // Would be populated by AI service
        metadata: {
          chunkIndex: Math.floor(i / chunkSize),
          wordCount: chunk.split(' ').length,
        },
      });
    }

    return chunks;
  }

  /**
   * Get knowledge bases
   */
  static async getKnowledgeBases(query, userId, organizationId, userRole) {
    try {
      if (!PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_READ)) {
        throw new AuthorizationError('Insufficient permissions to read knowledge bases');
      }

      const { page = 1, limit = 20, search, status, tags } = query;

      // Build filter
      const filter = { organizationId, isActive: true, deletedAt: null };

      if (search) {
        filter.$or = [
          { kb_name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      if (status) filter.status = status;
      if (tags && tags.length) filter.tags = { $in: tags };

      // Apply role-based filtering
      if (!PermissionService.hasMinimumRole(userRole, 'team_lead')) {
        filter.createdBy = userId;
      }

      const skip = (page - 1) * limit;
      const [knowledgeBases, total] = await Promise.all([
        KnowledgeBase.find(filter)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit, 10))
          .skip(skip)
          .lean(),
        KnowledgeBase.countDocuments(filter),
      ]);

      return {
        knowledgeBases,
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to get knowledge bases:', error);
      throw error;
    }
  }

  /**
   * Get knowledge base by ID
   */
  static async getKnowledgeBaseById(kbId, userId, organizationId, userRole) {
    try {
      const knowledgeBase = await KnowledgeBase.findOne({
        _id: kbId,
        organizationId,
        isActive: true,
        deletedAt: null,
      });

      if (!knowledgeBase) {
        throw new NotFoundError('Knowledge Base');
      }

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_READ, {
        resourceOwnerId: knowledgeBase.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to access this knowledge base');
      }

      return knowledgeBase;
    } catch (error) {
      logger.error('Failed to get knowledge base:', error);
      throw error;
    }
  }

  /**
   * Update knowledge base
   */
  static async updateKnowledgeBase(kbId, updateData, userId, organizationId, userRole) {
    try {
      const knowledgeBase = await this.getKnowledgeBaseById(kbId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_UPDATE, {
        resourceOwnerId: knowledgeBase.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to update this knowledge base');
      }

      // Update knowledge base
      Object.assign(knowledgeBase, updateData);
      await knowledgeBase.save();

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_UPDATED,
        userId,
        organizationId,
        resourceType: 'knowledgebase',
        resourceId: knowledgeBase._id.toString(),
        details: {
          changes: Object.keys(updateData),
          name: knowledgeBase.kb_name,
        },
      });

      return knowledgeBase;
    } catch (error) {
      logger.error('Failed to update knowledge base:', error);
      throw error;
    }
  }

  /**
   * Delete knowledge base
   */
  static async deleteKnowledgeBase(kbId, userId, organizationId, userRole) {
    try {
      const knowledgeBase = await this.getKnowledgeBaseById(kbId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_DELETE, {
        resourceOwnerId: knowledgeBase.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to delete this knowledge base');
      }

      // Soft delete
      knowledgeBase.deletedAt = new Date();
      knowledgeBase.isActive = false;
      await knowledgeBase.save();

      // Create audit log
      await AuditLog.createLog({
        action: AUDIT_ACTIONS.AGENT_DELETED,
        userId,
        organizationId,
        resourceType: 'knowledgebase',
        resourceId: knowledgeBase._id.toString(),
        details: {
          name: knowledgeBase.kb_name,
          fileCount: knowledgeBase.totalFiles,
        },
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete knowledge base:', error);
      throw error;
    }
  }

  /**
   * Add files to existing knowledge base
   */
  static async addFiles(kbId, files, userId, organizationId, userRole) {
    try {
      const knowledgeBase = await this.getKnowledgeBaseById(kbId, userId, organizationId, userRole);

      // Check permissions
      const hasPermission = PermissionService.hasPermission(userRole, PERMISSIONS.AGENT_UPDATE, {
        resourceOwnerId: knowledgeBase.createdBy,
        userId,
      });

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions to update this knowledge base');
      }

      // Process and add files
      await this.processFiles(knowledgeBase, files);
      await knowledgeBase.save();

      // Start background processing
      this.startBackgroundProcessing(knowledgeBase._id);

      logger.info('Files added to knowledge base:', {
        kbId: knowledgeBase._id,
        fileCount: files.length,
        addedBy: userId,
      });

      return knowledgeBase;
    } catch (error) {
      logger.error('Failed to add files to knowledge base:', error);
      throw error;
    }
  }

  /**
   * Search knowledge base
   */
  static async searchKnowledgeBase(kbId, query, limit, userId, organizationId, userRole) {
    try {
      const knowledgeBase = await this.getKnowledgeBaseById(kbId, userId, organizationId, userRole);

      // Increment usage
      await knowledgeBase.incrementUsage();

      // Perform search
      const results = knowledgeBase.search(query, limit);

      logger.info('Knowledge base searched:', {
        kbId,
        query,
        results: results.length,
        searchedBy: userId,
      });

      return results;
    } catch (error) {
      logger.error('Failed to search knowledge base:', error);
      throw error;
    }
  }
}

module.exports = KnowledgeBaseService;
