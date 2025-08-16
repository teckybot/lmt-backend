import prisma from "../config/db.js";

export const getAnalytics = async (_req, res) => {
  try {
    const now = new Date();
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const openStatuses = ["New", "In Progress"];

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
      // counts
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "New" } }),
      prisma.lead.count({ where: { status: "In Progress" } }),
      prisma.lead.count({ where: { status: "Closed" } }),

      prisma.lead.count({
        where: { priority: { equals: "high", mode: "insensitive" } },
      }),
      prisma.lead.count({
        where: { priority: { equals: "medium", mode: "insensitive" } },
      }),
      prisma.lead.count({
        where: { priority: { equals: "low", mode: "insensitive" } },
      }),

      // upcoming leads
      prisma.lead.findMany({
        where: { status: { in: openStatuses }, dueDate: { gt: now } },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: {
          creator: { select: { id: true, name: true, role: true } },
        },
      }),

      // overdue leads
      prisma.lead.findMany({
        where: { status: { in: openStatuses }, dueDate: { lt: now } },
        orderBy: { dueDate: "desc" },
        take: 5,
        include: {
          creator: { select: { id: true, name: true, role: true } },
        },
      }),

      // recent leads (added in last 5 days)
      prisma.lead.findMany({
        where: { createdAt: { gt: fiveDaysAgo } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          creator: { select: { id: true, name: true, role: true } },
        },
      }),

      // recently closed leads (last 5 days)
      prisma.lead.findMany({
        where: {
          status: "Closed",
          OR: [
            { closedAt: { gt: fiveDaysAgo } },
            { AND: [{ closedAt: null }, { updatedAt: { gt: fiveDaysAgo } }] },
          ],
        },
        orderBy: [{ closedAt: "desc" }, { updatedAt: "desc" }],
        take: 5,
        include: {
          closedByUser: { select: { id: true, name: true, role: true } },
          creator: { select: { id: true, name: true, role: true } }, //  optional, show who created too
        },
      }),
    ]);

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
    res
      .status(500)
      .json({ error: "Analytics fetch failed", details: error.message });
  }
};
