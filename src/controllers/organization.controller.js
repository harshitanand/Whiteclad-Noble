const OrganizationService = require('../services/organization.service');
const { catchAsync } = require('../middleware/error.middleware');
const { HTTP_STATUS } = require('../utils/constants');
const logger = require('../config/logger');

class OrganizationController {
  /**
   * Get current organization
   */
  static getOrganization = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    
    const organization = await OrganizationService.getOrganization(orgId, userId, userRole);
    
    res.json({
      success: true,
      data: { organization }
    });
  });
  
  /**
   * Update organization
   */
  static updateOrganization = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    
    const organization = await OrganizationService.updateOrganization(
      orgId, 
      req.body, 
      userId, 
      userRole
    );
    
    logger.info('Organization updated:', { 
      organizationId: orgId, 
      updatedBy: userId 
    });
    
    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: { organization }
    });
  });
  
  /**
   * Get organization members
   */
  static getMembers = catchAsync(async (req, res) => {
    const { orgId } = req.auth;
    const { role: userRole } = req.membership;
    
    const members = await OrganizationService.getMembers(orgId, req.query, userRole);
    
    res.json({
      success: true,
      data: members
    });
  });
  
  /**
   * Invite user to organization
   */
  static inviteUser = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    
    const invitation = await OrganizationService.inviteUser(
      orgId, 
      req.body, 
      userId, 
      userRole
    );
    
    logger.info('User invited:', { 
      organizationId: orgId, 
      invitedEmail: req.body.email,
      invitedBy: userId 
    });
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'User invited successfully',
      data: { invitation }
    });
  });
  
  /**
   * Update member role
   */
  static updateMemberRole = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { memberId } = req.params;
    
    const member = await OrganizationService.updateMemberRole(
      orgId, 
      memberId, 
      req.body.role, 
      userId, 
      userRole
    );
    
    logger.info('Member role updated:', { 
      organizationId: orgId, 
      memberId, 
      newRole: req.body.role,
      updatedBy: userId 
    });
    
    res.json({
      success: true,
      message: 'Member role updated successfully',
      data: { member }
    });
  });
  
  /**
   * Remove member from organization
   */
  static removeMember = catchAsync(async (req, res) => {
    const { userId, orgId } = req.auth;
    const { role: userRole } = req.membership;
    const { memberId } = req.params;
    
    await OrganizationService.removeMember(orgId, memberId, userId, userRole);
    
    logger.info('Member removed:', { 
      organizationId: orgId, 
      removedMemberId: memberId,
      removedBy: userId 
    });
    
    res.status(HTTP_STATUS.NO_CONTENT).json({
      success: true,
      message: 'Member removed successfully'
    });
  });
  
  /**
   * Get organization usage statistics
   */
  static getUsageStats = catchAsync(async (req, res) => {
    const { orgId } = req.auth;
    const { role: userRole } = req.membership;
    
    const stats = await OrganizationService.getUsageStats(orgId, userRole);
    
    res.json({
      success: true,
      data: { stats }
    });
  });
  
  /**
   * Get organization audit logs
   */
  static getAuditLogs = catchAsync(async (req, res) => {
    const { orgId } = req.auth;
    const { role: userRole } = req.membership;
    
    const logs = await OrganizationService.getAuditLogs(orgId, req.query, userRole);
    
    res.json({
      success: true,
      data: logs
    });
  });
}

module.exports = OrganizationController;
