/* eslint-disable global-require */
const path = require('path');

console.log('🔍 Starting debug process...');
console.log('📁 Current directory:', process.cwd());
console.log('📄 Node version:', process.version);

// Check if essential files exist
const requiredFiles = [
  './config/index.js',
  './config/logger.js',
  './config/database.js',
  './config/redis.js',
  './utils/constants.js',
  './utils/errors.js',
  './app.js',
];

console.log('\n📋 Checking required files:');
requiredFiles.forEach((file) => {
  try {
    require.resolve(file);
    console.log(`✅ ${file} - exists`);
  } catch (error) {
    console.log(`❌ ${file} - MISSING`);
    console.log(`   Error: ${error.message}`);
  }
});

// Try to load config first
console.log('\n🔧 Loading configuration...');
try {
  const config = require('./config');
  console.log('✅ Configuration loaded successfully');
  console.log('📊 Environment:', config.env);
  console.log('🔌 Port:', config.port);

  // Check environment variables
  const requiredEnvVars = ['MONGODB_URI', 'REDIS_URL', 'CLERK_SECRET_KEY', 'JWT_SECRET'];

  console.log('\n🔐 Checking environment variables:');
  requiredEnvVars.forEach((envVar) => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} - set`);
    } else {
      console.log(`❌ ${envVar} - MISSING`);
    }
  });
} catch (error) {
  console.error('❌ Configuration failed to load:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}

// Try to load logger
console.log('\n📝 Loading logger...');
try {
  const logger = require('./config/logger');
  console.log('✅ Logger loaded successfully');
  logger.info('Logger test message');
} catch (error) {
  console.error('❌ Logger failed to load:');
  console.error(error.message);
  process.exit(1);
}

// Try to load app
console.log('\n🚀 Loading Express app...');
try {
  const app = require('./app');
  console.log('✅ Express app loaded successfully');
} catch (error) {
  console.error('❌ Express app failed to load:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}

console.log('\n🎉 All components loaded successfully!');
console.log('💡 If you see this message, the issue might be with database/redis connection');
