import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }

  async resetDatabase() {
    // Delete all data from all tables except preserve admin user

    // Get admin user ID to preserve (try standard admin, then Kingpin, then any super admin)
    let adminUser = await this.prisma.user.findUnique({
      where: { email: 'admin@fortstec.com' },
    });

    if (!adminUser) {
      adminUser = await this.prisma.user.findUnique({
        where: { email: 'Kingpin@fortstec.com' },
      });
    }

    if (!adminUser) {
      // Fallback: find ANY super admin to preserve
      const superAdmins = await this.prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        take: 1
      });
      if (superAdmins.length > 0) {
        adminUser = superAdmins[0];
      }
    }

    if (!adminUser) {
      throw new Error('No Admin or Super Admin user found. Cannot reset database safely.');
    }

    // Count records before deletion
    const counts = {
      bankAccounts: await this.prisma.bankAccount.count(),
      goldAssets: await this.prisma.goldAsset.count(),
      stockAssets: await this.prisma.stockAsset.count(),
      bondAssets: await this.prisma.bondAsset.count(),
      mutualFunds: await this.prisma.mutualFundAsset.count(),
      properties: await this.prisma.property.count(),
      loans: await this.prisma.loan.count(),
      creditCards: await this.prisma.creditCard.count(),
      transactions: await this.prisma.transaction.count(),
      categories: await this.prisma.category.count(),
      budgets: await this.prisma.budget.count(),
      expenses: await this.prisma.expense.count(),
      expenseCategories: await this.prisma.expenseCategory.count(),
      goals: await this.prisma.goal.count(),
      snapshots: await this.prisma.netWorthSnapshot.count(),
      auditLogs: await this.prisma.auditLog.count(),
      users: await this.prisma.user.count({
        where: { id: { not: adminUser.id } },
      }),
    };

    // Delete all records in order (respecting foreign key constraints)
    // Most child tables have onDelete: Cascade, but explicit deletion is safer for counting
    await this.prisma.auditLog.deleteMany({});
    await this.prisma.netWorthSnapshot.deleteMany({});
    await this.prisma.goal.deleteMany({});
    await this.prisma.budget.deleteMany({});
    await this.prisma.transaction.deleteMany({});
    await this.prisma.expense.deleteMany({});
    await this.prisma.bankAccount.deleteMany({});
    await this.prisma.goldAsset.deleteMany({});
    await this.prisma.stockAsset.deleteMany({});
    await this.prisma.bondAsset.deleteMany({});
    await this.prisma.mutualFundAsset.deleteMany({});
    await this.prisma.property.deleteMany({});
    await this.prisma.loan.deleteMany({});
    await this.prisma.creditCard.deleteMany({});
    await this.prisma.category.deleteMany({});
    await this.prisma.expenseCategory.deleteMany({});

    // Delete all users except admin
    await this.prisma.user.deleteMany({
      where: {
        id: { not: adminUser.id },
      },
    });

    return {
      success: true,
      message: 'Database reset successfully',
      deletedRecords: counts,
      preserved: {
        adminUser: adminUser.email,
      },
    };
  }

  async exportData() {
    return {
      users: await this.prisma.user.findMany(),
      bankAccounts: await this.prisma.bankAccount.findMany(),
      goldAssets: await this.prisma.goldAsset.findMany(),
      stockAssets: await this.prisma.stockAsset.findMany(),
      bondAssets: await this.prisma.bondAsset.findMany(),
      mutualFundAssets: await this.prisma.mutualFundAsset.findMany(),
      properties: await this.prisma.property.findMany(),
      loans: await this.prisma.loan.findMany(),
      creditCards: await this.prisma.creditCard.findMany(),
      transactions: await this.prisma.transaction.findMany(),
      categories: await this.prisma.category.findMany(),
      budgets: await this.prisma.budget.findMany(),
      expenses: await this.prisma.expense.findMany(),
      expenseCategories: await this.prisma.expenseCategory.findMany(),
      goals: await this.prisma.goal.findMany(),
      snapshots: await this.prisma.netWorthSnapshot.findMany(),
      auditLogs: await this.prisma.auditLog.findMany(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  async importData(data: any) {
    // 1. Reset database first (preserving admin)
    await this.resetDatabase();

    // 2. Import users (except those that already exist - primarily the admin)
    const existingUsers = await this.prisma.user.findMany();
    // Create a map of Email -> ID for existing users
    const existingUserMap = new Map<string, string>();
    existingUsers.forEach(u => existingUserMap.set(u.email, u.id));

    // Map to track OldID -> NewID
    const userIdMap = new Map<string, string>();

    const usersToImport = data.users || [];

    for (const user of usersToImport) {
      if (existingUserMap.has(user.email)) {
        // User exists (e.g. Admin), map Old Backup ID -> Current DB ID
        const currentId = existingUserMap.get(user.email);
        userIdMap.set(user.id, currentId!);
        console.log(`[Import] Mapping existing user ${user.email} from ${user.id} -> ${currentId}`);
      } else {
        // User does not exist, create them
        // We try to keep the old ID if possible, but if there's a collision (unlikely with UUIDs), Prisma might throw.
        // Safer to let Prisma/DB generate ID if we wanted, but let's try to use the backup ID first.
        // Actually, if we create, we should store the mapping just in case constraints etc.
        try {
          const createdUser = await this.prisma.user.create({ data: user });
          userIdMap.set(user.id, createdUser.id);
        } catch (e) {
          // Fallback: if creation failed (maybe ID conflict?), try creating without ID
          const { id, ...userData } = user;
          const createdUser = await this.prisma.user.create({ data: userData });
          userIdMap.set(user.id, createdUser.id);
        }
      }
    }

    // Helper to update foreign keys
    const updateForeignKeys = (items: any[]) => {
      if (!items) return [];
      return items.map(item => {
        if (item.userId && userIdMap.has(item.userId)) {
          item.userId = userIdMap.get(item.userId);
        }
        return item;
      });
    };

    // 3. Import other data with updated IDs
    if (data.expenseCategories)
      await this.prisma.expenseCategory.createMany({
        data: updateForeignKeys(data.expenseCategories),
      });
    if (data.categories)
      // Some categories might already exist (system defaults potentially), verify constraints? 
      // For simplicity assuming resetDatabase cleared relevant ones or unique constraints won't trigger if system categories are global.
      // AdminService.resetDatabase() clears Category table, so we are good.
      await this.prisma.category.createMany({ data: updateForeignKeys(data.categories) });
    if (data.bankAccounts)
      await this.prisma.bankAccount.createMany({ data: updateForeignKeys(data.bankAccounts) });
    if (data.goldAssets)
      await this.prisma.goldAsset.createMany({ data: updateForeignKeys(data.goldAssets) });
    if (data.stockAssets)
      await this.prisma.stockAsset.createMany({ data: updateForeignKeys(data.stockAssets) });
    if (data.bondAssets)
      await this.prisma.bondAsset.createMany({ data: updateForeignKeys(data.bondAssets) });
    if (data.mutualFundAssets)
      await this.prisma.mutualFundAsset.createMany({
        data: updateForeignKeys(data.mutualFundAssets),
      });
    if (data.properties)
      await this.prisma.property.createMany({ data: updateForeignKeys(data.properties) });
    if (data.loans) await this.prisma.loan.createMany({ data: updateForeignKeys(data.loans) });
    if (data.creditCards)
      await this.prisma.creditCard.createMany({ data: updateForeignKeys(data.creditCards) });
    if (data.transactions)
      await this.prisma.transaction.createMany({ data: updateForeignKeys(data.transactions) });
    if (data.budgets)
      await this.prisma.budget.createMany({ data: updateForeignKeys(data.budgets) });
    if (data.expenses)
      await this.prisma.expense.createMany({ data: updateForeignKeys(data.expenses) });
    if (data.goals) await this.prisma.goal.createMany({ data: updateForeignKeys(data.goals) });
    if (data.snapshots)
      await this.prisma.netWorthSnapshot.createMany({ data: updateForeignKeys(data.snapshots) });
    if (data.auditLogs)
      await this.prisma.auditLog.createMany({ data: updateForeignKeys(data.auditLogs) });

    return { success: true, message: 'Data imported successfully' };
  }
}
