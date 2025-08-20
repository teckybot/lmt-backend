import express from 'express';
import { assignLeadController, bulkAssignController, requestReassignController } from '../controllers/assignController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/:leadId/assign', authenticateToken, authorizeRole('admin'), assignLeadController);
router.post('/bulk-assign', authenticateToken, authorizeRole('super admin'), bulkAssignController);
router.post('/:leadId/reassign-request', authenticateToken, authorizeRole('admin'), requestReassignController);

export default router;
