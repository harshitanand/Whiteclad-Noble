const Redis = require('ioredis');
const config = require('./index');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    try {
      this.client = new Redis(config.redis.url, {
        ...config.redis.options,
        lazyConnect: true
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        logger.error('Redis connection error:', err);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      return this.client;
    } catch (error) {
      logger.error('Failed to create Redis client:', error);
      throw error;
    }
  }

  getClient() {
    if (!this.client) {
      this.connect();
    }
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }

  isHealthy() {
    return this.isConnected && this.client && this.client.status === 'ready';
  }
}

module.exports = new RedisClient();
