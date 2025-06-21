const mongoose = require('mongoose');
const config = require('../../config');
const logger = require('../../config/logger');

const migration = {
  version: '001',
  description: 'Initial database setup with indexes',
  
  async up() {
    try {
      const db = mongoose.connection.db;
      
      // Create indexes for Users collection
      await db.collection('users').createIndex({ clerkId: 1 }, { unique: true });
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('users').createIndex({ isActive: 1, deletedAt: 1 });
      await db.collection('users').createIndex({ createdAt: -1 });
      
      // Create indexes for Organizations collection
      await db.collection('organizations').createIndex({ clerkId: 1 }, { unique: true });
      await db.collection('organizations').createIndex({ slug: 1 }, { unique: true });
      await db.collection('organizations').createIndex({ plan: 1 });
      await db.collection('organizations').createIndex({ isActive: 1, deletedAt: 1 });
      
      // Create indexes for Agents collection
      await db.collection('agents').createIndex({ organizationId: 1, isActive: 1 });
      await db.collection('agents').createIndex({ createdBy: 1, isActive: 1 });
      await db.collection('agents').createIndex({ status: 1, visibility: 1 });
      await db.collection('agents').createIndex({ tags: 1 });
      await db.collection('agents').createIndex({ type: 1, category: 1 });
      await db.collection('agents').createIndex({ isPublic: 1, status: 1 });
      
      // Create text index for search
      await db.collection('agents').createIndex({ 
        name: 'text', 
        description: 'text',
        tags: 'text'
      });
      
      // Create indexes for AuditLogs collection
      await db.collection('auditlogs').createIndex({ organizationId: 1, timestamp: -1 });
      await db.collection('auditlogs').createIndex({ userId: 1, timestamp: -1 });
      await db.collection('auditlogs').createIndex({ action: 1, timestamp: -1 });
      await db.collection('auditlogs').createIndex({ resourceType: 1, resourceId: 1 });
      
      // TTL index for audit logs (2 years)
      await db.collection('auditlogs').createIndex(
        { timestamp: 1 }, 
        { expireAfterSeconds: 63072000 }
      );
      
      logger.info('Migration 001: Initial setup completed successfully');
    } catch (error) {
      logger.error('Migration 001 failed:', error);
      throw error;
    }
  },
  
  async down() {
    try {
      const db = mongoose.connection.db;
      
      // Drop all indexes except _id
      await db.collection('users').dropIndexes();
      await db.collection('organizations').dropIndexes();
      await db.collection('agents').dropIndexes();
      await db.collection('auditlogs').dropIndexes();
      
      logger.info('Migration 001: Rollback completed successfully');
    } catch (error) {
      logger.error('Migration 001 rollback failed:', error);
      throw error;
    }
  }
};

module.exports = migration;
