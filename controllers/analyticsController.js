const pool = require("../config/db");

exports.getAnalytics = async (req, res) => {
  try {
    const leadsResult = await pool.query("SELECT * FROM leads ORDER BY created_at DESC");
    const leads = leadsResult.rows;

    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    // Basic stats
    const total = leads.length;
    const newLeads = leads.filter((l) => l.status?.toLowerCase() === "new").length;
    const inProgress = leads.filter((l) => l.status?.toLowerCase() === "in progress").length;
    const closed = leads.filter((l) => l.status?.toLowerCase() === "closed").length;

    // Priority counts
    const high = leads.filter((l) => l.priority?.toLowerCase() === "high").length;
    const medium = leads.filter((l) => l.priority?.toLowerCase() === "medium").length;
    const low = leads.filter((l) => l.priority?.toLowerCase() === "low").length;

    // Time-based filters
    const upcoming = leads
      .filter((l) => 
        l.due_date && 
        new Date(l.due_date) > now && 
        (l.status?.toLowerCase() === "new" || l.status?.toLowerCase() === "in progress")
      )
      .slice(0, 5);

    const overdue = leads
      .filter((l) => 
        l.due_date && 
        new Date(l.due_date) < now && 
        (l.status?.toLowerCase() === "new" || l.status?.toLowerCase() === "in progress")
      )
      .slice(0, 5);

    const recent = leads
      .filter((l) => {
        const createdAt = new Date(l.created_at);
        const isRecent = createdAt >= fiveDaysAgo && createdAt <= now;
        console.log(`Lead ${l.id || l._id}: created_at=${l.created_at}, isRecent=${isRecent}`); // Debug log
        return isRecent;
      })
      .slice(0, 5);

    const recentlyClosedLeads = leads
      .filter((l) => {
        const isClosed = l.status?.toLowerCase() === "closed";
        // Use closed_at if available, otherwise fall back to updated_at
        const closeDate = l.closed_at ? new Date(l.closed_at) : (l.updated_at ? new Date(l.updated_at) : null);
        const isRecent = closeDate && closeDate >= fiveDaysAgo && closeDate <= now;
        console.log(`Lead ${l.id || l._id}: status=${l.status}, closed_at=${l.closed_at}, updated_at=${l.updated_at}, isRecent=${isRecent}`); // Debug log
        return isClosed && isRecent;
      })
      .slice(0, 5);

    res.json({
      stats: {
        total,
        new: newLeads,
        inProgress,
        closed,
      },
      priorityCounts: {
        high,
        medium,
        low,
      },
      upcomingLeads: upcoming,
      overdueLeads: overdue,
      recentLeads: recent,
      recentlyClosedLeads,
    });
  } catch (error) {
    console.error("Analytics error:", error.message);
    res.status(500).json({ error: "Analytics fetch failed" });
  }
};