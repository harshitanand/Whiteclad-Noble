// src/database/connection.js - Database connection handler (MISSING)
const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../config/logger');

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.connection = null;
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  async connect() {
    try {
      if (this.isConnected) {
        logger.warn('Database already connected');
        return this.connection;
      }

      // Set up event listeners
      this.setupEventListeners();

      // Connect to MongoDB
      this.connection = await mongoose.connect(config.database.uri, {
        ...config.database.options,
        dbName: config.database.name,
      });

      this.isConnected = true;
      this.retryCount = 0;

      logger.info('Database connected successfully', {
        host: this.connection.connection.host,
        port: this.connection.connection.port,
        name: this.connection.connection.name,
      });

      return this.connection;
    } catch (error) {
      logger.error('Database connection failed:', error);
      await this.handleConnectionError(error);
      throw error;
    }
  }

  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      logger.error('Mongoose connection error:', err);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // Handle application termination
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
  }

  async handleConnectionError(error) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = 2 ** this.retryCount * 1000; // Exponential backoff

      logger.warn(
        `Retrying database connection in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.connect();
    }
    logger.error('Max database connection retries exceeded');
    throw error;
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        this.isConnected = false;
        this.connection = null;
        logger.info('Database disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  async gracefulShutdown() {
    logger.info('Gracefully shutting down database connection...');
    await this.disconnect();
    process.exit(0);
  }

  getConnection() {
    return this.connection;
  }

  isHealthy() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  async ping() {
    try {
      if (!this.isConnected) {
        return false;
      }

      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      logger.error('Database ping failed:', error);
      return false;
    }
  }
}

module.exports = new DatabaseConnection();
