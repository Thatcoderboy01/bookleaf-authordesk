/*
  Warnings:

  - A unique constraint covering the columns `[aiDraftId]` on the table `TicketReply` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Ticket` ADD COLUMN `aiDraftId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `TicketReply` ADD COLUMN `aiDraftId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `TicketReply_aiDraftId_key` ON `TicketReply`(`aiDraftId`);
