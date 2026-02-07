-- AlterTable
ALTER TABLE `Loan` ADD COLUMN `linkedBankAccountId` VARCHAR(191) NULL,
    ADD FOREIGN KEY (`linkedBankAccountId`) REFERENCES `BankAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
