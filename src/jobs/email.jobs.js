const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../config/logger');
const User = require('../models/User');
const Organization = require('../models/Organization');

// Create email transporter
const transporter = nodemailer.createTransporter({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: config.email.auth,
});

// Email job processor
const processEmailJob = async (job) => {
  const { type, data } = job.data;

  try {
    switch (type) {
      case 'welcome':
        await sendWelcomeEmail(data);
        break;
      case 'invitation':
        await sendInvitationEmail(data);
        break;
      case 'agent_published':
        await sendAgentPublishedEmail(data);
        break;
      case 'usage_limit_warning':
        await sendUsageLimitWarning(data);
        break;
      case 'payment_failed':
        await sendPaymentFailedEmail(data);
        break;
      case 'subscription_cancelled':
        await sendSubscriptionCancelledEmail(data);
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    logger.info('Email sent successfully:', { type, recipient: data.email });
  } catch (error) {
    logger.error('Failed to send email:', { type, error: error.message });
    throw error;
  }
};

// Email templates
const sendWelcomeEmail = async (data) => {
  const { email, firstName, organizationName } = data;

  await transporter.sendMail({
    from: config.email.from,
    to: email,
    subject: `Welcome to ${organizationName} - AI Agents Platform`,
    html: `
      <h1>Welcome ${firstName}!</h1>
      <p>You've been invited to join <strong>${organizationName}</strong> on our AI Agents Platform.</p>
      <p>Get started by creating your first AI agent:</p>
      <a href="${config.app.frontendUrl}/agents/create" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Create Your First Agent</a>
      <br><br>
      <p>Need help? Check out our <a href="${config.app.frontendUrl}/docs">documentation</a> or contact support.</p>
    `,
  });
};

const sendInvitationEmail = async (data) => {
  const { email, inviterName, organizationName, invitationUrl } = data;

  await transporter.sendMail({
    from: config.email.from,
    to: email,
    subject: `You're invited to join ${organizationName}`,
    html: `
      <h1>You're Invited!</h1>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on our AI Agents Platform.</p>
      <p>Click the link below to accept the invitation:</p>
      <a href="${invitationUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Accept Invitation</a>
      <br><br>
      <p><small>This invitation will expire in 7 days.</small></p>
    `,
  });
};

const sendAgentPublishedEmail = async (data) => {
  const { email, agentName, agentUrl, organizationName } = data;

  await transporter.sendMail({
    from: config.email.from,
    to: email,
    subject: `Your AI Agent "${agentName}" is now live!`,
    html: `
      <h1>🎉 Your Agent is Live!</h1>
      <p>Congratulations! Your AI agent <strong>"${agentName}"</strong> has been published and is now available in ${organizationName}.</p>
      <p>View your live agent:</p>
      <a href="${agentUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Agent</a>
      <br><br>
      <p>Start sharing it with your team and monitor its performance in the dashboard.</p>
    `,
  });
};

const sendUsageLimitWarning = async (data) => {
  const { email, organizationName, usageType, currentUsage, limit, upgradeUrl } = data;

  await transporter.sendMail({
    from: config.email.from,
    to: email,
    subject: `⚠️ Usage Limit Warning - ${organizationName}`,
    html: `
      <h1>Usage Limit Warning</h1>
      <p>Your organization <strong>${organizationName}</strong> is approaching its ${usageType} limit.</p>
      <p><strong>Current Usage:</strong> ${currentUsage} / ${limit}</p>
      <p>To avoid service interruption, consider upgrading your plan:</p>
      <a href="${upgradeUrl}" style="background: #ffc107; color: black; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Upgrade Plan</a>
      <br><br>
      <p>Questions? Contact our support team.</p>
    `,
  });
};

const sendPaymentFailedEmail = async (data) => {
  const { email, organizationName, amount, updatePaymentUrl } = data;

  await transporter.sendMail({
    from: config.email.from,
    to: email,
    subject: `❌ Payment Failed - ${organizationName}`,
    html: `
      <h1>Payment Failed</h1>
      <p>We were unable to process the payment of $${amount} for ${organizationName}.</p>
      <p>Please update your payment method to continue using our services:</p>
      <a href="${updatePaymentUrl}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Update Payment Method</a>
      <br><br>
      <p>Your account will be suspended if payment is not received within 3 days.</p>
    `,
  });
};

const sendSubscriptionCancelledEmail = async (data) => {
  const { email, organizationName, endDate } = data;

  await transporter.sendMail({
    from: config.email.from,
    to: email,
    subject: `Subscription Cancelled - ${organizationName}`,
    html: `
      <h1>Subscription Cancelled</h1>
      <p>Your subscription for <strong>${organizationName}</strong> has been cancelled.</p>
      <p><strong>Service End Date:</strong> ${new Date(endDate).toLocaleDateString()}</p>
      <p>You'll continue to have access until the end of your billing period.</p>
      <p>Changed your mind? You can reactivate anytime:</p>
      <a href="${config.app.frontendUrl}/billing" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reactivate Subscription</a>
    `,
  });
};

// Queue email jobs
const queueWelcomeEmail = (userData) => {
  const { emailQueue } = require('./index');
  return emailQueue.add(
    'email',
    {
      type: 'welcome',
      data: userData,
    },
    {
      attempts: 3,
      backoff: 'exponential',
      delay: 2000,
    }
  );
};

const queueInvitationEmail = (invitationData) => {
  const { emailQueue } = require('./index');
  return emailQueue.add(
    'email',
    {
      type: 'invitation',
      data: invitationData,
    },
    {
      attempts: 3,
      backoff: 'exponential',
    }
  );
};

const queueAgentPublishedEmail = (agentData) => {
  const { emailQueue } = require('./index');
  return emailQueue.add(
    'email',
    {
      type: 'agent_published',
      data: agentData,
    },
    {
      attempts: 2,
      delay: 5000,
    }
  );
};

const queueUsageLimitWarning = (usageData) => {
  const { emailQueue } = require('./index');
  return emailQueue.add(
    'email',
    {
      type: 'usage_limit_warning',
      data: usageData,
    },
    {
      attempts: 2,
    }
  );
};

module.exports = {
  processEmailJob,
  queueWelcomeEmail,
  queueInvitationEmail,
  queueAgentPublishedEmail,
  queueUsageLimitWarning,
};
