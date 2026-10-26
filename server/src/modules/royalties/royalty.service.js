import prisma from "../../config/database.js";

export async function getRoyaltySummary(user) {
  const where =
    user.role === "ADMIN"
      ? {}
      : { authorId: user.id };

  const summary = await prisma.book.aggregate({
    where,
    _sum: {
      totalCopiesSold: true,
      totalRoyaltyEarned: true,
      royaltyPaid: true,
      royaltyPending: true,
    },
    _count: {
      id: true,
    },
  });

  return {
    totalBooks: summary._count.id,
    totalCopiesSold: summary._sum.totalCopiesSold ?? 0,
    totalRoyaltyEarned: summary._sum.totalRoyaltyEarned ?? 0,
    royaltyPaid: summary._sum.royaltyPaid ?? 0,
    royaltyPending: summary._sum.royaltyPending ?? 0,
  };
}


export async function getRoyaltyRecords(user) {
  const where =
    user.role === "ADMIN"
      ? {}
      : {
          book: {
            authorId: user.id,
          },
        };

  return prisma.royaltyRecord.findMany({
    where,
    orderBy: {
      periodStart: "desc",
    },
    select: {
      id: true,
      bookId: true,
      periodStart: true,
      periodEnd: true,
      platform: true,
      copiesSold: true,
      mrpTotal: true,
      printingCost: true,
      platformCommission: true,
      shippingCharges: true,
      netProfit: true,
      authorShare: true,
      amountPaid: true,
      amountPending: true,
      payoutStatus: true,
      createdAt: true,
      book: {
        select: {
          title: true,
        },
      },
    },
  });
}
