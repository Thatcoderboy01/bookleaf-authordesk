import test from "node:test";
import assert from "node:assert/strict";
import {
  isTicketUnresolved,
  isTicketUrgent,
  getTicketAge,
  getTicketTriageInfo,
} from "../../client/src/features/tickets/ticket-triage.js";

test("isTicketUnresolved correctly identifies active vs inactive statuses", () => {
  assert.equal(isTicketUnresolved("OPEN"), true);
  assert.equal(isTicketUnresolved("IN_PROGRESS"), true);
  assert.equal(isTicketUnresolved("RESOLVED"), false);
  assert.equal(isTicketUnresolved("CLOSED"), false);
  assert.equal(isTicketUnresolved(undefined), false);
});

test("isTicketUrgent highlights unresolved CRITICAL and HIGH tickets only", () => {
  // Active and critical/high -> urgent
  assert.equal(isTicketUrgent({ status: "OPEN", priority: "CRITICAL" }), true);
  assert.equal(isTicketUrgent({ status: "IN_PROGRESS", priority: "HIGH" }), true);

  // Active but medium/low -> not urgent
  assert.equal(isTicketUrgent({ status: "OPEN", priority: "MEDIUM" }), false);
  assert.equal(isTicketUrgent({ status: "IN_PROGRESS", priority: "LOW" }), false);

  // Resolved or Closed are NEVER urgent, even if priority is CRITICAL or HIGH
  assert.equal(isTicketUrgent({ status: "RESOLVED", priority: "CRITICAL" }), false);
  assert.equal(isTicketUrgent({ status: "RESOLVED", priority: "HIGH" }), false);
  assert.equal(isTicketUrgent({ status: "CLOSED", priority: "CRITICAL" }), false);
  assert.equal(isTicketUrgent({ status: "CLOSED", priority: "HIGH" }), false);
});

test("getTicketAge formats newly opened unresolved ticket", () => {
  const now = new Date("2026-10-29T10:00:00.000Z");
  const createdToday = new Date("2026-10-29T04:00:00.000Z");

  const age = getTicketAge(createdToday, "OPEN", now);
  assert.equal(age.diffDays, 0);
  assert.equal(age.label, "Opened today");
  assert.equal(age.isAging, false);
});

test("getTicketAge formats day-based open durations", () => {
  const now = new Date("2026-10-29T10:00:00.000Z");

  // 1 day old
  const oneDayAgo = new Date("2026-10-28T09:00:00.000Z");
  const age1 = getTicketAge(oneDayAgo, "OPEN", now);
  assert.equal(age1.diffDays, 1);
  assert.equal(age1.label, "Open for 1 day");
  assert.equal(age1.isAging, false);

  // 3 days old
  const threeDaysAgo = new Date("2026-10-26T09:00:00.000Z");
  const age3 = getTicketAge(threeDaysAgo, "OPEN", now);
  assert.equal(age3.diffDays, 3);
  assert.equal(age3.label, "Open for 3 days");
  assert.equal(age3.isAging, false);
});

test("getTicketAge flags aging tickets open for a week or more", () => {
  const now = new Date("2026-10-29T10:00:00.000Z");

  // 1 week (7 days)
  const oneWeekAgo = new Date("2026-10-22T09:00:00.000Z");
  const ageWeek = getTicketAge(oneWeekAgo, "OPEN", now);
  assert.equal(ageWeek.diffDays, 7);
  assert.equal(ageWeek.label, "Open for 1 week");
  assert.equal(ageWeek.isAging, true);

  // 2 weeks (14 days)
  const twoWeeksAgo = new Date("2026-10-15T09:00:00.000Z");
  const ageTwoWeeks = getTicketAge(twoWeeksAgo, "IN_PROGRESS", now);
  assert.equal(ageTwoWeeks.diffDays, 14);
  assert.equal(ageTwoWeeks.label, "Open for 2 weeks");
  assert.equal(ageTwoWeeks.isAging, true);

  // 1 month (35 days)
  const oneMonthAgo = new Date("2026-09-24T09:00:00.000Z");
  const ageMonth = getTicketAge(oneMonthAgo, "OPEN", now);
  assert.equal(ageMonth.diffDays, 35);
  assert.equal(ageMonth.label, "Open for 1 month");
  assert.equal(ageMonth.isAging, true);
});

test("getTicketAge formats resolved and closed tickets with past-tense age without aging flag", () => {
  const now = new Date("2026-10-29T10:00:00.000Z");

  const resolved3DaysAgo = new Date("2026-10-26T09:00:00.000Z");
  const ageResolved = getTicketAge(resolved3DaysAgo, "RESOLVED", now);
  assert.equal(ageResolved.label, "Opened 3 days ago");
  assert.equal(ageResolved.isAging, false);
  assert.equal(ageResolved.isUnresolved, false);

  const closed2WeeksAgo = new Date("2026-10-15T09:00:00.000Z");
  const ageClosed = getTicketAge(closed2WeeksAgo, "CLOSED", now);
  assert.equal(ageClosed.label, "Opened 2 weeks ago");
  assert.equal(ageClosed.isAging, false);
});

test("getTicketAge handles missing, null, and invalid timestamps safely", () => {
  const missing = getTicketAge(null, "OPEN");
  assert.equal(missing.label, "Age unavailable");
  assert.equal(missing.diffDays, 0);

  const invalid = getTicketAge("not-a-real-date", "OPEN");
  assert.equal(invalid.label, "Age unavailable");
  assert.equal(invalid.diffDays, 0);

  const undefinedDate = getTicketAge(undefined, "OPEN");
  assert.equal(undefinedDate.label, "Age unavailable");
  assert.equal(undefinedDate.diffDays, 0);
});

test("getTicketAge prevents negative duration when client clock is slightly skewed", () => {
  const now = new Date("2026-10-29T10:00:00.000Z");
  // Timestamp slightly in future relative to client now
  const futureTimestamp = new Date("2026-10-29T10:05:00.000Z");

  const age = getTicketAge(futureTimestamp, "OPEN", now);
  assert.equal(age.diffDays, 0);
  assert.equal(age.label, "Opened today");
});

test("getTicketTriageInfo aggregates urgency and age for queue presentation", () => {
  const now = new Date("2026-10-29T10:00:00.000Z");

  const ticketUrgent = {
    id: "ticket-1",
    status: "OPEN",
    priority: "CRITICAL",
    createdAt: new Date("2026-10-20T10:00:00.000Z"),
  };

  const triage = getTicketTriageInfo(ticketUrgent, now);
  assert.equal(triage.isUrgent, true);
  assert.equal(triage.isUnresolved, true);
  assert.equal(triage.isAging, true);
  assert.equal(triage.ageLabel, "Open for 1 week");
});

