const pool = require("../config/db");

exports.getAnalytics = async (req, res) => {
  try {
    const leadsResult = await pool.query("SELECT * FROM leads ORDER BY created_at DESC");
    const leads = leadsResult.rows;

    const now = new Date();

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
      .filter((l) => l.due_date && new Date(l.due_date) > now)
      .slice(0, 5);

    const overdue = leads
      .filter((l) => l.due_date && new Date(l.due_date) < now)
      .slice(0, 5);

    const recent = leads.slice(0, 5); // recently created

    const recentlyClosedLeads = leads
      .filter((l) => l.status?.toLowerCase() === "closed")
      .slice(0, 5); // recent closed

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
      recentlyClosedLeads, // 🔥 added
    });
  } catch (error) {
    console.error("Analytics error:", error.message);
    res.status(500).json({ error: "Analytics fetch failed" });
  }
};
    