const pool = require("../config/db");

exports.getAnalytics = async (req, res) => {
  try {
    // --- Use database functions for date calculations to avoid timezone issues ---

    // Assuming your database stores timestamps in a format recognized by your DB (e.g., TIMESTAMP WITH TIME ZONE in PostgreSQL)
    // This query fetches all leads once and uses database functions for filtering.
    // You might need to adjust the date arithmetic syntax slightly depending on your exact DB (PostgreSQL shown here).
    const leadsQuery = `
      SELECT *,
        -- Add flags for easier filtering in JS if needed, or filter directly in subqueries
        CASE WHEN status ILIKE 'closed' AND 
             (closed_at > (NOW() - INTERVAL '5 days') OR 
              (closed_at IS NULL AND updated_at > (NOW() - INTERVAL '5 days') AND status ILIKE 'closed'))
             THEN TRUE ELSE FALSE END AS is_recently_closed_candidate,
        CASE WHEN created_at > (NOW() - INTERVAL '5 days') THEN TRUE ELSE FALSE END AS is_recent_candidate
      FROM leads
      ORDER BY created_at DESC
    `;

    const leadsResult = await pool.query(leadsQuery);
    const leads = leadsResult.rows;

    // --- Basic Stats (calculated in JS from full list) ---
    const total = leads.length;
    const newLeads = leads.filter((l) => l.status?.toLowerCase() === "new").length;
    const inProgress = leads.filter((l) => l.status?.toLowerCase() === "in progress").length;
    const closed = leads.filter((l) => l.status?.toLowerCase() === "closed").length; // Count all closed

    // --- Priority Counts ---
    const high = leads.filter((l) => l.priority?.toLowerCase() === "high").length;
    const medium = leads.filter((l) => l.priority?.toLowerCase() === "medium").length;
    const low = leads.filter((l) => l.priority?.toLowerCase() === "low").length;

    const now = new Date(); // For JS-side filtering if needed

    // --- Upcoming Leads (Open leads with due_date in the future) ---
    const upcomingLeads = leads
      .filter((l) =>
        l.due_date &&
        new Date(l.due_date) > now && // JS comparison here, might still have issues if due_date lacks TZ
        (l.status?.toLowerCase() === "new" || l.status?.toLowerCase() === "in progress")
      )
      .slice(0, 5);

    // --- Overdue Leads (Open leads with due_date in the past) ---
    const overdueLeads = leads
      .filter((l) =>
        l.due_date &&
        new Date(l.due_date) < now && // JS comparison here, might still have issues if due_date lacks TZ
        (l.status?.toLowerCase() === "new" || l.status?.toLowerCase() === "in progress")
      )
      .slice(0, 5);

    // --- Recent Leads (created in last 5 days) ---
    // Using the flag calculated by the database
    const recentLeads = leads
      .filter((l) => l.is_recent_candidate) // Filter based on DB calculation
      .slice(0, 5);

    // --- Recently Closed Leads (closed in last 5 days) ---
    // Using the flag calculated by the database OR filter in JS with better date handling
    // Option 1: Filter using DB flag (relies on DB timezone logic)
    // const recentlyClosedLeads = leads
    //   .filter((l) => l.is_recently_closed_candidate)
    //   .slice(0, 5);

    // Option 2: Filter in JS, but handle dates carefully
    // Assuming closed_at is the primary field, falling back to updated_at if closed_at is missing
    // AND the status is 'closed'. Parse dates explicitly if format is ambiguous.
    const recentlyClosedLeads = leads
      .filter((l) => {
        if (l.status?.toLowerCase() !== "closed") {
          return false; // Must be closed
        }

        let closeDateObj = null;
        if (l.closed_at) {
          closeDateObj = new Date(l.closed_at);
        } else if (l.updated_at) {
          // Fallback to updated_at only if closed_at is missing
          closeDateObj = new Date(l.updated_at);
        }

         // Check if closeDateObj is a valid date
        if (!closeDateObj || isNaN(closeDateObj.getTime())) {
           // console.log(`Invalid close date for lead ${l.id || l._id}: closed_at=${l.closed_at}, updated_at=${l.updated_at}`);
           return false;
        }

        // Compare using date objects (still potential TZ issue if DB and Node TZ differ)
        // Consider if DB filtering is better.
        // console.log(`Checking lead ${l.id || l._id}: CloseDate=${closeDateObj.toISOString()}, FiveDaysAgo=${fiveDaysAgo.toISOString()}, Now=${now.toISOString()}`);

        return closeDateObj >= new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) && closeDateObj <= now;
      })
      .slice(0, 5);

    // --- Response ---
    res.json({
      stats: {
        total,
        new: newLeads,
        inProgress,
        closed, // This is the total count of closed leads ever
      },
      priorityCounts: {
        high,
        medium,
        low,
      },
      upcomingLeads,
      overdueLeads,
      recentLeads, // This should now be filtered by DB or robust JS logic
      recentlyClosedLeads, // This should now be filtered by DB or robust JS logic
    });
  } catch (error) {
    console.error("Analytics error:", error.message);
    // Log the full error for debugging
    console.error(error);
    res.status(500).json({ error: "Analytics fetch failed", details: error.message }); // Include details for debugging
  }
};