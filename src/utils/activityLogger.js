import prisma from '../config/db.js';

/**
 * Logs user activity related to leads.
 *
 * @param {Object} params
 * @param {number} params.userId - ID of the user performing the action
 * @param {number} params.leadId - ID of the lead
 * @param {string} params.leadIdentifier - Short identifier for the lead (e.g., "Service - Customer Name")
 * @param {string} params.action - Action type ("CREATED", "UPDATED", "CLOSED", "DELETED")
 * @param {string} params.details - Detailed description of the activity
 * @param {boolean} [params.skipLogging=false] - Whether to skip logging
 */

export const logActivity = async ({
  userId,
  leadId,
  leadIdentifier,
  action,
  details,
  skipLogging = false,
}) => {
  if (skipLogging) return;

  try {
    await prisma.userActivity.create({
      data: {
        userId,
        leadId,
        leadTitle: leadIdentifier, // repurposed as identifier for logging
        action,
        details,
      },
    });
  } catch (err) {
    console.error('Activity Logging Error:', err);
    // Optional: fail silently or rethrow depending on your logging policy
  }
};
