
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';


import {
  getLeadComments,
  addLeadComment,
  editLeadComment,
  deleteLeadComment,
} from '../controllers/commentsController.js';

const router = express.Router();

router.get('/:leadId', authenticateToken, getLeadComments);
router.post('/:leadId', authenticateToken, addLeadComment);
router.patch('/:leadId/:commentId', authenticateToken, editLeadComment);
router.delete('/:leadId/:commentId', authenticateToken, deleteLeadComment);

export default router;
