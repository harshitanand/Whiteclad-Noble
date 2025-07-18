# 🤖 AI Agents SaaS Platform

A comprehensive, production-ready SaaS platform for creating and managing AI agents with voice/video calling capabilities.

## ✨ Features

### 🎯 **Core Features**

- **Multi-tenant Architecture** - Complete organization isolation
- **AI Agent Creation** - Build custom AI agents with different personalities
- **Voice/Video Calls** - LiveKit integration for real-time communication
- **Campaign Management** - Orchestrate outbound/inbound call campaigns
- **Knowledge Base** - Upload and manage agent training materials
- **Test Number Management** - Manage test phone numbers and call testing

### 🔐 **Authentication & Security**

- **Clerk Integration** - Complete user management and authentication
- **Role-based Access Control** - Granular permissions system
- **Multi-factor Authentication** - Enhanced security
- **API Key Management** - Secure API access

### 💳 **Billing & Subscriptions**

- **Stripe Integration** - Complete payment processing
- **Usage Tracking** - Monitor API calls, storage, and features
- **Plan Management** - Free, Pro, and Enterprise tiers
- **Billing Portal** - Self-service billing management

### 📊 **Analytics & Monitoring**

- **Comprehensive Audit Logs** - Track all user actions
- **Real-time Analytics** - Agent performance and usage metrics
- **Health Monitoring** - System health and performance tracking
- **Background Jobs** - Automated tasks and processing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 5.0+
- Redis 6.0+
- Clerk account
- Stripe account (for billing)
- LiveKit server (for voice/video)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/ai-agents-saas-platform.git
cd ai-agents-saas-platform
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start the development server**

```bash
npm run dev
```

## 📁 Project Structure

```
src/
├── app.js                 # Express app configuration
├── server.js              # Server startup and configuration
├── config/                # Configuration files
│   ├── index.js          # Main configuration
│   ├── database.js       # Database connection
│   ├── redis.js          # Redis connection
│   ├── clerk.js          # Clerk authentication setup
│   └── logger.js         # Winston logging configuration
├── models/               # Mongoose models
│   ├── User.js
│   ├── Organization.js
│   ├── Agent.js
│   ├── Campaign.js
│   ├── KnowledgeBase.js
│   ├── TestNumber.js
│   └── AuditLog.js
├── controllers/          # Route controllers
├── services/             # Business logic services
├── middleware/           # Express middleware
├── routes/               # API routes
├── jobs/                 # Background job processing
├── utils/                # Utility functions
└── database/             # Database utilities and migrations
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server with nodemon
npm run debug           # Run debug version

# Production
npm start               # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues

# Testing
npm test                # Run tests
npm run test:watch      # Run tests in watch mode

# Database
npm run migrate         # Run database migrations
npm run seed            # Seed database with sample data
```

### Environment Variables

| Variable                | Required | Description                          |
| ----------------------- | -------- | ------------------------------------ |
| `NODE_ENV`              | Yes      | Environment (development/production) |
| `PORT`                  | No       | Server port (default: 3000)          |
| `MONGODB_URI`           | Yes      | MongoDB connection string            |
| `REDIS_URL`             | Yes      | Redis connection string              |
| `CLERK_SECRET_KEY`      | Yes      | Clerk authentication secret          |
| `CLERK_PUBLISHABLE_KEY` | Yes      | Clerk publishable key                |
| `CLERK_WEBHOOK_SECRET`  | Yes      | Clerk webhook secret                 |
| `OPENAI_API_KEY`        | Yes      | OpenAI API key                       |
| `ANTHROPIC_API_KEY`     | Yes      | Anthropic API key                    |
| `STRIPE_SECRET_KEY`     | Yes      | Stripe secret key                    |
| `STRIPE_WEBHOOK_SECRET` | Yes      | Stripe webhook secret                |
| `LIVEKIT_API_KEY`       | Yes      | LiveKit API key                      |
| `LIVEKIT_API_SECRET`    | Yes      | LiveKit API secret                   |
| `LIVEKIT_SERVER_URL`    | Yes      | LiveKit server URL                   |

## 🏗️ Architecture

### Multi-tenant Design

- **Organization Isolation** - Complete data separation per organization
- **Role-based Access** - Fine-grained permissions system
- **Scalable Infrastructure** - Designed for thousands of organizations

### API Design

- **RESTful APIs** - Standard HTTP methods and status codes
- **Comprehensive Validation** - Input validation with Joi
- **Error Handling** - Consistent error responses
- **Rate Limiting** - Protect against abuse

### Database Schema

```
Organizations (1) ──── (N) Users
     │
     ├── (N) Agents
     ├── (N) Campaigns
     ├── (N) KnowledgeBases
     ├── (N) TestNumbers
     └── (N) AuditLogs
```

## 🔌 API Endpoints

### Authentication

- `POST /api/v1/auth/webhook` - Handle Clerk webhooks
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update user profile

### Organizations

- `GET /api/v1/organizations` - Get organization details
- `PUT /api/v1/organizations` - Update organization
- `GET /api/v1/organizations/members` - List members
- `POST /api/v1/organizations/members` - Invite member

### Agents

- `GET /api/v1/agents` - List agents
- `POST /api/v1/agents` - Create agent
- `GET /api/v1/agents/:id` - Get agent details
- `PUT /api/v1/agents/:id` - Update agent
- `DELETE /api/v1/agents/:id` - Delete agent
- `POST /api/v1/agents/:id/chat` - Chat with agent

### Campaigns

- `GET /api/v1/campaigns` - List campaigns
- `POST /api/v1/campaigns` - Create campaign
- `PUT /api/v1/campaigns/:id` - Update campaign
- `POST /api/v1/campaigns/:id/start` - Start campaign

### Calls (LiveKit Integration)

- `POST /api/v1/calls/web` - Create web call
- `POST /api/v1/calls/sip` - Create SIP call
- `GET /api/v1/calls/active` - List active calls
- `DELETE /api/v1/calls/:roomName` - End call

### Knowledge Base

- `GET /api/v1/knowledgebase` - List knowledge bases
- `POST /api/v1/knowledgebase` - Create knowledge base
- `POST /api/v1/knowledgebase/:id/files` - Upload files
- `POST /api/v1/knowledgebase/:id/search` - Search knowledge base

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "Agent"

# Run with coverage
npm test -- --coverage
```

### Test Structure

```
tests/
├── unit/                # Unit tests
├── integration/         # Integration tests
├── fixtures/            # Test data
└── helpers/             # Test utilities
```

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**

```bash
# Set production environment variables
export NODE_ENV=production
export PORT=3000
# ... other environment variables
```

2. **Database Setup**

```bash
# Run migrations
npm run migrate

# Optional: Seed initial data
npm run seed
```

3. **Start Production Server**

```bash
npm start
```

### Docker Deployment

```dockerfile
# Build image
docker build -t ai-agents-platform .

# Run container
docker run -p 3000:3000 --env-file .env ai-agents-platform
```

### Docker Compose

```bash
docker-compose up -d
```

## 📊 Monitoring

### Health Checks

- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/detailed` - Detailed system health

### Logging

- **Winston** - Structured logging
- **Daily Rotation** - Automatic log rotation
- **Different Levels** - Debug, Info, Warn, Error

### Error Tracking

- **Sentry Integration** - Real-time error monitoring
- **Audit Logs** - Complete action tracking
- **Performance Metrics** - Response time monitoring

## 🔐 Security

### Authentication

- **Clerk Integration** - Industry-standard authentication
- **JWT Tokens** - Secure API access
- **Session Management** - Automatic session handling

### Data Protection

- **Encryption at Rest** - Sensitive data encryption
- **Encryption in Transit** - HTTPS/TLS
- **Input Validation** - Prevent injection attacks
- **Rate Limiting** - Protect against abuse

### Access Control

- **Role-based Permissions** - Fine-grained access control
- **Organization Isolation** - Complete data separation
- **API Key Management** - Secure API access

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Style

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Conventional Commits** - Commit message format

### Pull Request Process

1. Update documentation
2. Add tests for new features
3. Ensure CI passes
4. Get code review approval

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation

- **API Documentation** - Available at `/api-docs`
- **Database Schema** - See `/docs/database.md`
- **Architecture Guide** - See `/docs/architecture.md`

### Getting Help

- **GitHub Issues** - Bug reports and feature requests
- **Discord Community** - Real-time support
- **Email Support** - contact@yourdomain.com

### Troubleshooting

**Common Issues:**

1. **Database Connection Failed**

   - Check MongoDB is running
   - Verify connection string
   - Check network connectivity

2. **Redis Connection Failed**

   - Ensure Redis is running
   - Check Redis URL
   - Verify authentication

3. **LiveKit Integration Issues**

   - Verify API keys
   - Check server URL
   - Ensure proper SDK version

4. **Clerk Authentication Issues**
   - Check API keys
   - Verify webhook configuration
   - Ensure proper domain setup

## 🔄 Changelog

### v1.0.0 (Current)

- Initial release
- Multi-tenant architecture
- Clerk authentication
- LiveKit integration
- Stripe billing
- Complete API set

---

**Built with ❤️ for the AI community**
