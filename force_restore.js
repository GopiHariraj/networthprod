const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importData() {
    console.log('Reading JSON backup file...');
    const rawData = fs.readFileSync('/home/gopihariraj2/networth-backup-2026-02-21.json', 'utf8');
    const data = JSON.parse(rawData);

    console.log(`Found ${data.users?.length || 0} users in backup.`);

    // Map to swap old User IDs to new ones (if any are regenerated)
    const userIdMap = new Map();

    for (const user of data.users) {
        try {
            const existingUser = await prisma.user.findUnique({ where: { email: user.email } });

            if (existingUser) {
                console.log(`[SKIP] User already exists: ${user.email} -> mapping ID ${user.id} to ${existingUser.id}`);
                userIdMap.set(user.id, existingUser.id);
            } else {
                const { id, ...userData } = user;
                const newUser = await prisma.user.create({
                    data: {
                        ...userData,
                        id: user.id, // Try to keep original ID
                        failedLoginAttempts: userData.failedLoginAttempts || 0,
                        isDisabled: userData.isDisabled || false,
                        enableProductTour: userData.enableProductTour || false,
                        createdAt: new Date(userData.createdAt),
                        updatedAt: new Date(),
                    }
                });
                userIdMap.set(user.id, newUser.id);
                console.log(`[RESTORED] User: ${newUser.email}`);
            }
        } catch (e) {
            console.error(`[ERROR] Failed user ${user.email}:`, e.message);
        }
    }

    // Helper to map foreign keys
    const updateForeignKeys = (items) => {
        if (!items) return [];
        return items.map(item => {
            if (item.userId && userIdMap.has(item.userId)) {
                item.userId = userIdMap.get(item.userId);
            }
            return item;
        });
    };

    console.log('Restoring dependent data (Banks, Transactions, etc.)...');

    try {
        if (data.categories?.length) {
            for (const cat of data.categories) {
                await prisma.category.upsert({ where: { id: cat.id }, update: {}, create: cat }).catch(() => null);
            }
        }
        if (data.bankAccounts?.length) await prisma.bankAccount.createMany({ data: updateForeignKeys(data.bankAccounts), skipDuplicates: true });
        if (data.goldAssets?.length) await prisma.goldAsset.createMany({ data: updateForeignKeys(data.goldAssets), skipDuplicates: true });
        if (data.stockAssets?.length) await prisma.stockAsset.createMany({ data: updateForeignKeys(data.stockAssets), skipDuplicates: true });
        if (data.bondAssets?.length) await prisma.bondAsset.createMany({ data: updateForeignKeys(data.bondAssets), skipDuplicates: true });
        if (data.mutualFundAssets?.length) await prisma.mutualFundAsset.createMany({ data: updateForeignKeys(data.mutualFundAssets), skipDuplicates: true });
        if (data.properties?.length) await prisma.property.createMany({ data: updateForeignKeys(data.properties), skipDuplicates: true });
        if (data.loans?.length) await prisma.loan.createMany({ data: updateForeignKeys(data.loans), skipDuplicates: true });
        if (data.creditCards?.length) await prisma.creditCard.createMany({ data: updateForeignKeys(data.creditCards), skipDuplicates: true });
        if (data.transactions?.length) await prisma.transaction.createMany({ data: updateForeignKeys(data.transactions), skipDuplicates: true });
        if (data.budgets?.length) await prisma.budget.createMany({ data: updateForeignKeys(data.budgets), skipDuplicates: true });
        if (data.expenses?.length) await prisma.expense.createMany({ data: updateForeignKeys(data.expenses), skipDuplicates: true });
        if (data.goals?.length) await prisma.goal.createMany({ data: updateForeignKeys(data.goals), skipDuplicates: true });
        if (data.snapshots?.length) await prisma.netWorthSnapshot.createMany({ data: updateForeignKeys(data.snapshots), skipDuplicates: true });
    } catch (e) {
        console.error('[WARNING] Some child records failed (likely already exist):', e.message);
    }

    console.log('✅ Full database restoration script completed!');
}

importData().catch(console.error).finally(() => prisma.$disconnect());
