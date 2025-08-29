// controllers/analyticsController.js
import prisma from "../config/db.js";

/**
 * GET /analytics
 * Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Returns analytics data for leads in the given date range.
 */
export const getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const startInput = startDate || req.query.from;
    const endInput = endDate || req.query.to;

    if (!startInput || !endInput) {
      return res.status(400).json({
        error: "Missing required date range. Please provide startDate and endDate.",
        example: "GET /analytics?startDate=2025-08-01&endDate=2025-08-31",
      });
    }

    const start = new Date(startInput);
    const end = new Date(endInput);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: "Invalid date format. Use YYYY-MM-DD.",
        received: { startDate: startInput, endDate: endInput },
      });
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const openStatuses = ["New", "In Progress"];

    // Combine queries to reduce connections
    const [
      total,
      statusCounts, // Combines New, In Progress, and Closed counts
      priorityCounts, // Combines High, Medium, and Low counts
      upcomingLeads,
      overdueLeads,
      recentLeads,
      recentlyClosedLeads,
    ] = await Promise.all([
      // 1. Total leads created in range
      prisma.lead.count({
        where: { createdAt: { gte: start, lte: end } },
      }),

      // 2. Combine status counts into a single query
      prisma.lead.groupBy({
        by: ['status'],
        where: { createdAt: { gte: start, lte: end } },
        _count: { status: true },
      }),

      // 3. Combine priority counts into a single query
      prisma.lead.groupBy({
        by: ['priority'],
        where: { createdAt: { gte: start, lte: end } },
        _count: { priority: true },
      }),

      // 4. Upcoming leads (due after today, open)
      prisma.lead.findMany({
        where: { status: { in: openStatuses }, dueDate: { gt: new Date() }, createdAt: { gte: start, lte: end } },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: { creator: { select: { id: true, name: true, role: true } } },
      }),

      // 5. Overdue leads
      prisma.lead.findMany({
        where: { status: { in: openStatuses }, dueDate: { lt: new Date() }, createdAt: { gte: start, lte: end } },
        orderBy: { dueDate: "desc" },
        take: 5,
        include: { creator: { select: { id: true, name: true, role: true } } },
      }),

      // 6. Recent leads (by creation)
      prisma.lead.findMany({
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { creator: { select: { id: true, name: true, role: true } } },
      }),

      // 7. Recently closed
      prisma.lead.findMany({
        where: {
          status: "Closed",
          closedAt: { gte: start, lte: end },
        },
        orderBy: { closedAt: "desc" },
        take: 5,
        include: {
          closedByUser: { select: { id: true, name: true, role: true } },
          creator: { select: { id: true, name: true, role: true } },
        },
      }),
    ]);

    // Process the combined queries to extract individual counts
    const newLeads = statusCounts.find(s => s.status === 'New')?._count.status || 0;
    const inProgress = statusCounts.find(s => s.status === 'In Progress')?._count.status || 0;
    const closed = statusCounts.find(s => s.status === 'Closed')?._count.status || 0;

    const high = priorityCounts.find(p => p.priority?.toLowerCase() === 'high')?._count.priority || 0;
    const medium = priorityCounts.find(p => p.priority?.toLowerCase() === 'medium')?._count.priority || 0;
    const low = priorityCounts.find(p => p.priority?.toLowerCase() === 'low')?._count.priority || 0;

    // Send response
    res.json({
      stats: { total, new: newLeads, inProgress, closed },
      priorityCounts: { high, medium, low },
      upcomingLeads,
      overdueLeads,
      recentLeads,
      recentlyClosedLeads,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({
      error: "Failed to fetch analytics",
      details: error.message,
    });
  }
};