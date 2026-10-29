/**
 * Ticket triage and urgency evaluation utilities for BookLeaf AuthorDesk.
 */

/**
 * Checks if a ticket status represents an active, unresolved ticket.
 * Resolved and Closed tickets are not active/unresolved.
 *
 * @param {string} status
 * @returns {boolean}
 */
export function isTicketUnresolved(status) {
  return status === "OPEN" || status === "IN_PROGRESS";
}

/**
 * Evaluates whether an unresolved ticket requires urgent attention.
 * Only genuinely unresolved Critical and High priority tickets are urgent.
 * Resolved or Closed tickets are NEVER urgent.
 *
 * @param {{ status?: string, priority?: string }} ticket
 * @returns {boolean}
 */
export function isTicketUrgent(ticket) {
  if (!ticket || !isTicketUnresolved(ticket.status)) {
    return false;
  }

  return ticket.priority === "CRITICAL" || ticket.priority === "HIGH";
}

/**
 * Formats a readable age string from a ticket's createdAt timestamp.
 * Provides deterministic and safe age calculations.
 *
 * Examples:
 * - "Opened today" (diffDays === 0)
 * - "Open for 1 day" / "Open for 3 days"
 * - "Open for 1 week" / "Open for 2 weeks"
 *
 * For resolved/closed tickets:
 * - "Opened today" / "Opened 3 days ago" / "Opened 2 weeks ago"
 *
 * @param {string|Date} createdAt
 * @param {string} [status]
 * @param {Date|number} [now]
 * @returns {{ label: string, diffDays: number, isAging: boolean, isUnresolved: boolean }}
 */
export function getTicketAge(createdAt, status = "OPEN", now = new Date()) {
  if (!createdAt) {
    return {
      diffDays: 0,
      isAging: false,
      isUnresolved: isTicketUnresolved(status),
      label: "Age unavailable",
    };
  }

  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) {
    return {
      diffDays: 0,
      isAging: false,
      isUnresolved: isTicketUnresolved(status),
      label: "Age unavailable",
    };
  }

  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  // Protect against negative ages due to minor client clock skew
  const diffMs = Math.max(0, nowTime - createdTime);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const unresolved = isTicketUnresolved(status);
  // Unresolved tickets open for 7 or more days are flagged as aging/oldest
  const isAging = unresolved && diffDays >= 7;

  let labelText;

  if (unresolved) {
    if (diffDays === 0) {
      labelText = "Opened today";
    } else if (diffDays === 1) {
      labelText = "Open for 1 day";
    } else if (diffDays < 7) {
      labelText = `Open for ${diffDays} days`;
    } else if (diffDays < 14) {
      labelText = "Open for 1 week";
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      labelText = `Open for ${weeks} weeks`;
    } else if (diffDays < 60) {
      labelText = "Open for 1 month";
    } else {
      const months = Math.floor(diffDays / 30);
      labelText = `Open for ${months} months`;
    }
  } else {
    if (diffDays === 0) {
      labelText = "Opened today";
    } else if (diffDays === 1) {
      labelText = "Opened 1 day ago";
    } else if (diffDays < 7) {
      labelText = `Opened ${diffDays} days ago`;
    } else if (diffDays < 14) {
      labelText = "Opened 1 week ago";
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      labelText = `Opened ${weeks} weeks ago`;
    } else if (diffDays < 60) {
      labelText = "Opened 1 month ago";
    } else {
      const months = Math.floor(diffDays / 30);
      labelText = `Opened ${months} months ago`;
    }
  }

  return {
    diffDays,
    isAging,
    isUnresolved: unresolved,
    label: labelText,
  };
}

/**
 * Returns comprehensive triage metadata for a ticket.
 *
 * @param {{ status?: string, priority?: string, createdAt?: string|Date }} ticket
 * @param {Date|number} [now]
 */
export function getTicketTriageInfo(ticket, now = new Date()) {
  if (!ticket) {
    return {
      ageLabel: "Age unavailable",
      diffDays: 0,
      isAging: false,
      isUnresolved: false,
      isUrgent: false,
    };
  }

  const unresolved = isTicketUnresolved(ticket.status);
  const isUrgent = isTicketUrgent(ticket);
  const age = getTicketAge(ticket.createdAt, ticket.status, now);

  return {
    ageLabel: age.label,
    diffDays: age.diffDays,
    isAging: age.isAging,
    isUnresolved: unresolved,
    isUrgent,
  };
}
