// controllers/leadCommentController.js
import prisma from '../config/db.js';

/**
 * GET /api/leads/:leadId/comments
 * Auth: required
 */
export const getLeadComments = async (req, res) => {
  const leadId = Number(req.params.leadId);

  if (!Number.isInteger(leadId)) {
    return res.status(400).json({ error: 'Invalid leadId' });
  }

  try {
    const comments = await prisma.leadComment.findMany({
      where: { leadId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // normalize avatar URLs to absolute
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const formatted = comments.map((c) => ({
      ...c,
      user: {
        ...c.user,
        avatar: c.user?.avatar ? `${baseUrl}${c.user.avatar}` : null,
      },
    }));

    return res.json(formatted);
  } catch (err) {
    console.error('Get Lead Comments Error:', err);
    return res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

/**
 * POST /api/leads/:leadId/comments
 * Auth: required
 * Body: { content: string }
 */
export const addLeadComment = async (req, res) => {
  const leadId = Number(req.params.leadId);
  const userId = req.user?.id;
  const { content } = req.body || {};

  if (!Number.isInteger(leadId)) {
    return res.status(400).json({ error: 'Invalid leadId' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment cannot be empty' });
  }

  try {
    // Optional: ensure lead exists
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Permission: only currently assigned users can comment
    const isAssigned = await prisma.leadAssignment.findFirst({
      where: { leadId, userId, active: true },
      select: { id: true },
    });
    if (!isAssigned) {
      return res.status(403).json({ error: 'Only assigned users can comment on this lead' });
    }

    const created = await prisma.leadComment.create({
      data: { leadId, userId, content: content.trim() },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const formatted = {
      ...created,
      user: {
        ...created.user,
        avatar: created.user?.avatar ? `${baseUrl}${created.user.avatar}` : null,
      },
    };

    // Emit to the room for this lead
    const io = req.app?.get && req.app.get('io');
    if (io) io.to(`lead_${leadId}`).emit('leadCommentAdded', formatted);

    return res.status(201).json(formatted);
  } catch (err) {
    console.error('Add Lead Comment Error:', err);
    return res.status(500).json({ error: 'Failed to add comment' });
  }
};

/**
 * PATCH /api/leads/:leadId/comments/:commentId
 * Auth: required
 * Only comment author OR admin can edit
 * Body: { content: string }
 */
export const editLeadComment = async (req, res) => {
  const leadId = Number(req.params.leadId);
  const commentId = Number(req.params.commentId);
  const userId = req.user?.id;
  const role = req.user?.role;
  const { content } = req.body || {};

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment cannot be empty' });
  }

  try {
    const existing = await prisma.leadComment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, leadId: true },
    });
    if (!existing || existing.leadId !== leadId) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isOwner = existing.userId === userId;
    if (!isOwner) {
      return res.status(403).json({ error: 'Not allowed to edit this comment' });
    }

    const updated = await prisma.leadComment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const formatted = {
      ...updated,
      user: {
        ...updated.user,
        avatar: updated.user?.avatar ? `${baseUrl}${updated.user.avatar}` : null,
      },
    };

    const io = req.app?.get && req.app.get('io');
    if (io) io.to(`lead_${leadId}`).emit('leadCommentEdited', formatted);
    return res.json(formatted);
  } catch (err) {
    console.error('Edit Lead Comment Error:', err);
    return res.status(500).json({ error: 'Failed to edit comment' });
  }
};

/**
 * DELETE /api/leads/:leadId/comments/:commentId
 * Auth: required
 * Only comment author OR admin can delete
 */
export const deleteLeadComment = async (req, res) => {
  const leadId = Number(req.params.leadId);
  const commentId = Number(req.params.commentId);
  const userId = req.user?.id;
  const role = req.user?.role;

  try {
    const existing = await prisma.leadComment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, leadId: true },
    });
    if (!existing || existing.leadId !== leadId) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isOwner = existing.userId === userId;
    if (!isOwner) {
      return res.status(403).json({ error: 'Not allowed to delete this comment' });
    }

    await prisma.leadComment.delete({ where: { id: commentId } });

    const io = req.app?.get && req.app.get('io');
    if (io) io.to(`lead_${leadId}`).emit('leadCommentDeleted', { id: commentId, leadId });
    return res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Delete Lead Comment Error:', err);
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
};
