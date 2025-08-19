
import prisma from '../config/db.js';

export const logActivity = async ({ userId, leadId, leadTitle, action, details, skipLogging }) => {
  if (skipLogging) return; 

  await prisma.userActivity.create({
    data: {
      userId,
      leadId,
      leadTitle,
      action,
      details,
    },
  });
};
