import express from 'express';
import { assignLeadController, bulkAssignController, requestReassignController, unassignController, listLeadAssignmentsController, listAllAssignmentsController } from '../controllers/assignController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/:leadId/assign', authenticateToken, authorizeRole('admin'), assignLeadController);
router.post('/bulk-assign', authenticateToken, authorizeRole('super admin'), bulkAssignController);
router.post('/:leadId/reassign-request', authenticateToken, authorizeRole('admin'), requestReassignController);
router.delete('/:leadId/assignees/:userId', authenticateToken, authorizeRole('admin'), unassignController);
router.get('/:leadId/assignments', authenticateToken, authorizeRole('admin'), listLeadAssignmentsController);
router.get('/', authenticateToken, authorizeRole('admin'), listAllAssignmentsController);

export default router;
