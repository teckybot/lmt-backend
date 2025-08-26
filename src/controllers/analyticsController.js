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
    // Log for debugging (optional, remove in production)
    console.log("Received query params:", req.query);

    const { startDate, endDate } = req.query;

    // Support fallback if frontend mistakenly uses 'from'/'to'
    const startInput = startDate || req.query.from;
    const endInput = endDate || req.query.to;

    if (!startInput || !endInput) {
      return res.status(400).json({
        error: "Missing required date range. Please provide startDate and endDate.",
        example: "GET /analytics?startDate=2025-08-01&endDate=2025-08-31",
      });
    }

    // Parse dates
    const start = new Date(startInput);
    const end = new Date(endInput);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: "Invalid date format. Use YYYY-MM-DD.",
        received: { startDate: startInput, endDate: endInput },
      });
    }

    // Set full day boundaries: start = 00:00:00, end = 23:59:59
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const openStatuses = ["New", "In Progress"];

    // Fetch all data in parallel
    const [
      total,
      newLeads,
      inProgress,
      closed,
      high,
      medium,
      low,
      upcomingLeads,
      overdueLeads,
      recentLeads,
      recentlyClosedLeads,
    ] = await Promise.all([
      // Total leads created in range
      prisma.lead.count({
        where: { createdAt: { gte: start, lte: end } },
      }),

      prisma.lead.count({
        where: { status: "New", createdAt: { gte: start, lte: end } },
      }),
      prisma.lead.count({
        where: { status: "In Progress", createdAt: { gte: start, lte: end } },
      }),
      prisma.lead.count({
        where: { status: "Closed", createdAt: { gte: start, lte: end } },
      }),

      // Priority counts
      prisma.lead.count({
        where: { priority: { equals: "high", mode: "insensitive" }, createdAt: { gte: start, lte: end } },
      }),
      prisma.lead.count({
        where: { priority: { equals: "medium", mode: "insensitive" }, createdAt: { gte: start, lte: end } },
      }),
      prisma.lead.count({
        where: { priority: { equals: "low", mode: "insensitive" }, createdAt: { gte: start, lte: end } },
      }),

      // Upcoming leads (due after today, open)
      prisma.lead.findMany({
        where: { status: { in: openStatuses }, dueDate: { gt: new Date() }, createdAt: { gte: start, lte: end } },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: { creator: { select: { id: true, name: true, role: true } } },
      }),

      // Overdue leads
      prisma.lead.findMany({
        where: { status: { in: openStatuses }, dueDate: { lt: new Date() }, createdAt: { gte: start, lte: end } },
        orderBy: { dueDate: "desc" },
        take: 5,
        include: { creator: { select: { id: true, name: true, role: true } } },
      }),

      // Recent leads (by creation)
      prisma.lead.findMany({
        where: { createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { creator: { select: { id: true, name: true, role: true } } },
      }),

      // Recently closed
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