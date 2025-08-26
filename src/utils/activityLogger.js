import prisma from '../config/db.js';

export const logActivity = async (client, { // Add a new 'client' parameter
  userId,
  leadId,
  leadIdentifier,
  action,
  details,
  skipLogging = false,
}) => {
  if (skipLogging) return;

  try {
    await client.userActivity.create({ // Use the 'client' parameter instead of the global 'prisma'
      data: {
        userId,
        leadId,
        leadTitle: leadIdentifier,
        action,
        details,
      },
    });
  } catch (err) {
    console.error('Activity Logging Error:', err);
  }
};
