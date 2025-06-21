const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org:admin',
  TEAM_LEAD: 'team_lead',
  AGENT_CREATOR: 'agent_creator',
  ORG_MEMBER: 'org:member',
  GUEST: 'guest'
};

const PERMISSIONS = {
  // Agent permissions
  AGENT_CREATE: 'agent:create',
  AGENT_READ: 'agent:read',
  AGENT_UPDATE: 'agent:update',
  AGENT_DELETE: 'agent:delete',
  AGENT_PUBLISH: 'agent:publish',
  AGENT_CLONE: 'agent:clone',
  
  // Organization permissions
  ORG_INVITE: 'org:invite',
  ORG_REMOVE_MEMBER: 'org:remove_member',
  ORG_UPDATE_SETTINGS: 'org:update_settings',
  ORG_BILLING: 'org:billing',
  ORG_ANALYTICS: 'org:analytics',
  
  // System permissions
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_AUDIT: 'system:audit',
  SYSTEM_SUPPORT: 'system:support'
};

const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ORG_ADMIN]: [
    PERMISSIONS.AGENT_CREATE,
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.AGENT_UPDATE,
    PERMISSIONS.AGENT_DELETE,
    PERMISSIONS.AGENT_PUBLISH,
    PERMISSIONS.AGENT_CLONE,
    PERMISSIONS.ORG_INVITE,
    PERMISSIONS.ORG_REMOVE_MEMBER,
    PERMISSIONS.ORG_UPDATE_SETTINGS,
    PERMISSIONS.ORG_BILLING,
    PERMISSIONS.ORG_ANALYTICS
  ],
  [ROLES.TEAM_LEAD]: [
    PERMISSIONS.AGENT_CREATE,
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.AGENT_UPDATE,
    PERMISSIONS.AGENT_DELETE,
    PERMISSIONS.AGENT_PUBLISH,
    PERMISSIONS.AGENT_CLONE,
    PERMISSIONS.ORG_INVITE,
    PERMISSIONS.ORG_ANALYTICS
  ],
  [ROLES.AGENT_CREATOR]: [
    PERMISSIONS.AGENT_CREATE,
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.AGENT_UPDATE,
    PERMISSIONS.AGENT_CLONE
  ],
  [ROLES.ORG_MEMBER]: [
    PERMISSIONS.AGENT_READ
  ],
  [ROLES.GUEST]: []
};

const ROLE_HIERARCHY = {
  [ROLES.GUEST]: 0,
  [ROLES.ORG_MEMBER]: 10,
  [ROLES.AGENT_CREATOR]: 20,
  [ROLES.TEAM_LEAD]: 40,
  [ROLES.ORG_ADMIN]: 80,
  [ROLES.SUPER_ADMIN]: 100
};

const AGENT_TYPES = {
  CHATBOT: 'chatbot',
  ASSISTANT: 'assistant',
  ANALYZER: 'analyzer',
  GENERATOR: 'generator',
  CLASSIFIER: 'classifier',
  CUSTOM: 'custom'
};

const AGENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  SUSPENDED: 'suspended'
};

const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
};

const AUDIT_ACTIONS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  ORG_CREATED: 'organization.created',
  ORG_UPDATED: 'organization.updated',
  ORG_MEMBER_ADDED: 'organization.member.added',
  ORG_MEMBER_REMOVED: 'organization.member.removed',
  ORG_MEMBER_ROLE_CHANGED: 'organization.member.role_changed',
  AGENT_CREATED: 'agent.created',
  AGENT_UPDATED: 'agent.updated',
  AGENT_DELETED: 'agent.deleted',
  AGENT_PUBLISHED: 'agent.published',
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled'
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  AGENT_TYPES,
  AGENT_STATUS,
  SUBSCRIPTION_PLANS,
  AUDIT_ACTIONS,
  HTTP_STATUS
};
