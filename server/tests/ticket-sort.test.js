import test from "node:test";
import assert from "node:assert/strict";
import {
  SORT_OPTIONS,
  getSortOption,
  parseSortValue,
} from "../../client/src/features/tickets/ticket-sort.js";
import { getTickets } from "../src/modules/tickets/ticket.service.js";
import prisma from "../src/config/database.js";

test("SORT_OPTIONS defines the five required queue sorting options", () => {
  assert.equal(SORT_OPTIONS.length, 5);

  const [newest, oldest, recentlyUpdated, highestPriority, lowestPriority] =
    SORT_OPTIONS;

  assert.deepEqual(newest, {
    value: "createdAt_desc",
    label: "Newest first",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  assert.deepEqual(oldest, {
    value: "createdAt_asc",
    label: "Oldest first",
    sortBy: "createdAt",
    sortOrder: "asc",
  });

  assert.deepEqual(recentlyUpdated, {
    value: "updatedAt_desc",
    label: "Recently updated",
    sortBy: "updatedAt",
    sortOrder: "desc",
  });

  assert.deepEqual(highestPriority, {
    value: "priority_desc",
    label: "Highest priority",
    sortBy: "priority",
    sortOrder: "desc",
  });

  assert.deepEqual(lowestPriority, {
    value: "priority_asc",
    label: "Lowest priority",
    sortBy: "priority",
    sortOrder: "asc",
  });
});

test("getSortOption resolves option from sortBy and sortOrder with safe default fallback", () => {
  // Exact matches
  assert.equal(getSortOption("createdAt", "desc").value, "createdAt_desc");
  assert.equal(getSortOption("createdAt", "asc").value, "createdAt_asc");
  assert.equal(getSortOption("updatedAt", "desc").value, "updatedAt_desc");
  assert.equal(getSortOption("priority", "desc").value, "priority_desc");
  assert.equal(getSortOption("priority", "asc").value, "priority_asc");

  // Fallbacks
  assert.equal(getSortOption("unknown", "desc").value, "createdAt_desc");
  assert.equal(getSortOption().value, "createdAt_desc");
});

test("parseSortValue resolves option from select value with safe default fallback", () => {
  assert.equal(parseSortValue("priority_desc").sortBy, "priority");
  assert.equal(parseSortValue("priority_desc").sortOrder, "desc");

  assert.equal(parseSortValue("updatedAt_desc").sortBy, "updatedAt");
  assert.equal(parseSortValue("updatedAt_desc").sortOrder, "desc");

  assert.equal(parseSortValue("invalid").value, "createdAt_desc");
});

test("sorting change resets pagination page to 1 while preserving other active filters", () => {
  const currentFilters = {
    category: "ROYALTY_PAYMENTS",
    status: "OPEN",
    priority: "HIGH",
    from: "2026-10-01",
    to: "2026-10-29",
    page: 4,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  };

  const selectedOption = parseSortValue("priority_desc");

  const updatedFilters = {
    ...currentFilters,
    sortBy: selectedOption.sortBy,
    sortOrder: selectedOption.sortOrder,
    page: 1,
  };

  assert.equal(updatedFilters.page, 1, "Page must be reset to 1 on sort change");
  assert.equal(updatedFilters.sortBy, "priority");
  assert.equal(updatedFilters.sortOrder, "desc");
  assert.equal(updatedFilters.category, "ROYALTY_PAYMENTS");
  assert.equal(updatedFilters.status, "OPEN");
  assert.equal(updatedFilters.priority, "HIGH");
  assert.equal(updatedFilters.from, "2026-10-01");
  assert.equal(updatedFilters.to, "2026-10-29");
});

// MySQL ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') index mapping
const MYSQL_ENUM_INDEX = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
};

function createSampleTickets() {
  return [
    {
      id: "ticket-medium",
      subject: "Medium priority inquiry",
      priority: "MEDIUM",
      createdAt: new Date("2026-10-20T10:00:00.000Z"),
      updatedAt: new Date("2026-10-21T10:00:00.000Z"),
    },
    {
      id: "ticket-critical-old",
      subject: "Older critical bug",
      priority: "CRITICAL",
      createdAt: new Date("2026-10-15T10:00:00.000Z"),
      updatedAt: new Date("2026-10-16T10:00:00.000Z"),
    },
    {
      id: "ticket-high",
      subject: "High priority question",
      priority: "HIGH",
      createdAt: new Date("2026-10-18T10:00:00.000Z"),
      updatedAt: new Date("2026-10-19T10:00:00.000Z"),
    },
    {
      id: "ticket-low",
      subject: "Low priority suggestion",
      priority: "LOW",
      createdAt: new Date("2026-10-22T10:00:00.000Z"),
      updatedAt: new Date("2026-10-23T10:00:00.000Z"),
    },
    {
      id: "ticket-critical-new",
      subject: "Newer critical bug",
      priority: "CRITICAL",
      createdAt: new Date("2026-10-25T10:00:00.000Z"),
      updatedAt: new Date("2026-10-26T10:00:00.000Z"),
    },
  ];
}

function simulateMysqlOrderBy(items, orderBy) {
  const result = [...items];
  result.sort((a, b) => {
    for (const clause of orderBy) {
      for (const [key, dir] of Object.entries(clause)) {
        let cmp = 0;
        if (key === "priority") {
          const indexA = MYSQL_ENUM_INDEX[a.priority];
          const indexB = MYSQL_ENUM_INDEX[b.priority];
          cmp = dir === "asc" ? indexA - indexB : indexB - indexA;
        } else if (key === "createdAt" || key === "updatedAt") {
          const timeA = new Date(a[key]).getTime();
          const timeB = new Date(b[key]).getTime();
          cmp = dir === "asc" ? timeA - timeB : timeB - timeA;
        }
        if (cmp !== 0) return cmp;
      }
    }
    return 0;
  });
  return result;
}

test("getTickets with sortBy=priority & sortOrder=desc semantically sorts CRITICAL -> HIGH -> MEDIUM -> LOW with deterministic createdAt secondary sort", async () => {
  const adminUser = { id: "admin-1", role: "ADMIN" };
  const sampleTickets = createSampleTickets();

  const originalTransaction = prisma.$transaction;
  const originalFindMany = prisma.ticket.findMany;
  const originalCount = prisma.ticket.count;

  let capturedFindManyArgs = null;

  prisma.ticket.findMany = async (args) => {
    capturedFindManyArgs = args;
    return simulateMysqlOrderBy(sampleTickets, args.orderBy);
  };
  prisma.ticket.count = async () => sampleTickets.length;
  prisma.$transaction = async (queries) => Promise.all(queries);

  try {
    const result = await getTickets(adminUser, {
      sortBy: "priority",
      sortOrder: "desc",
      page: 1,
      limit: 10,
    });

    // Verify Prisma query translation:
    // MySQL enum ASC (1 -> 4) produces CRITICAL (1), HIGH (2), MEDIUM (3), LOW (4)
    assert.deepEqual(capturedFindManyArgs.orderBy, [
      { priority: "asc" },
      { createdAt: "desc" },
    ]);

    // Verify semantic priority ordering: CRITICAL -> HIGH -> MEDIUM -> LOW
    const priorities = result.tickets.map((t) => t.priority);
    assert.deepEqual(priorities, [
      "CRITICAL",
      "CRITICAL",
      "HIGH",
      "MEDIUM",
      "LOW",
    ]);

    // Verify deterministic secondary sort: between the two CRITICAL tickets, newer one is first
    const criticalTickets = result.tickets.filter((t) => t.priority === "CRITICAL");
    assert.equal(criticalTickets[0].id, "ticket-critical-new");
    assert.equal(criticalTickets[1].id, "ticket-critical-old");
  } finally {
    prisma.$transaction = originalTransaction;
    prisma.ticket.findMany = originalFindMany;
    prisma.ticket.count = originalCount;
  }
});

test("getTickets with sortBy=priority & sortOrder=asc semantically sorts LOW -> MEDIUM -> HIGH -> CRITICAL with deterministic createdAt secondary sort", async () => {
  const adminUser = { id: "admin-1", role: "ADMIN" };
  const sampleTickets = createSampleTickets();

  const originalTransaction = prisma.$transaction;
  const originalFindMany = prisma.ticket.findMany;
  const originalCount = prisma.ticket.count;

  let capturedFindManyArgs = null;

  prisma.ticket.findMany = async (args) => {
    capturedFindManyArgs = args;
    return simulateMysqlOrderBy(sampleTickets, args.orderBy);
  };
  prisma.ticket.count = async () => sampleTickets.length;
  prisma.$transaction = async (queries) => Promise.all(queries);

  try {
    const result = await getTickets(adminUser, {
      sortBy: "priority",
      sortOrder: "asc",
      page: 1,
      limit: 10,
    });

    // Verify Prisma query translation:
    // MySQL enum DESC (4 -> 1) produces LOW (4), MEDIUM (3), HIGH (2), CRITICAL (1)
    assert.deepEqual(capturedFindManyArgs.orderBy, [
      { priority: "desc" },
      { createdAt: "desc" },
    ]);

    // Verify semantic priority ordering: LOW -> MEDIUM -> HIGH -> CRITICAL
    const priorities = result.tickets.map((t) => t.priority);
    assert.deepEqual(priorities, [
      "LOW",
      "MEDIUM",
      "HIGH",
      "CRITICAL",
      "CRITICAL",
    ]);

    // Verify deterministic secondary sort: between the two CRITICAL tickets, newer one is first
    const criticalTickets = result.tickets.filter((t) => t.priority === "CRITICAL");
    assert.equal(criticalTickets[0].id, "ticket-critical-new");
    assert.equal(criticalTickets[1].id, "ticket-critical-old");
  } finally {
    prisma.$transaction = originalTransaction;
    prisma.ticket.findMany = originalFindMany;
    prisma.ticket.count = originalCount;
  }
});

test("getTickets preserves standard sort order for date fields without inversion", async () => {
  const adminUser = { id: "admin-1", role: "ADMIN" };

  const originalTransaction = prisma.$transaction;
  const originalFindMany = prisma.ticket.findMany;
  const originalCount = prisma.ticket.count;

  let capturedArgs = [];

  prisma.ticket.findMany = async (args) => {
    capturedArgs.push(args);
    return [];
  };
  prisma.ticket.count = async () => 0;
  prisma.$transaction = async (queries) => Promise.all(queries);

  try {
    // 1. Newest first (createdAt desc)
    await getTickets(adminUser, { sortBy: "createdAt", sortOrder: "desc" });
    assert.deepEqual(capturedArgs[0].orderBy, [{ createdAt: "desc" }]);

    // 2. Oldest first (createdAt asc)
    await getTickets(adminUser, { sortBy: "createdAt", sortOrder: "asc" });
    assert.deepEqual(capturedArgs[1].orderBy, [{ createdAt: "asc" }]);

    // 3. Recently updated (updatedAt desc, with secondary createdAt desc)
    await getTickets(adminUser, { sortBy: "updatedAt", sortOrder: "desc" });
    assert.deepEqual(capturedArgs[2].orderBy, [
      { updatedAt: "desc" },
      { createdAt: "desc" },
    ]);
  } finally {
    prisma.$transaction = originalTransaction;
    prisma.ticket.findMany = originalFindMany;
    prisma.ticket.count = originalCount;
  }
});
