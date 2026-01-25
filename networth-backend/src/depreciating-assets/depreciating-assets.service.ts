import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepreciatingAssetsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, data: any) {
        try {
            // Helper function to parse numeric values safely
            const parseNumeric = (value: any): number | null => {
                if (value === null || value === undefined || value === '') {
                    return null;
                }
                const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
                return isNaN(parsed) ? null : parsed;
            };

            const parseInteger = (value: any): number | null => {
                if (value === null || value === undefined || value === '') {
                    return null;
                }
                const parsed = typeof value === 'string' ? parseInt(value, 10) : Number(value);
                return isNaN(parsed) ? null : parsed;
            };

            // Validate depreciation method requirements
            if (data.isDepreciationEnabled !== false) {
                if (data.depreciationMethod === 'STRAIGHT_LINE') {
                    const usefulLife = parseInteger(data.usefulLife);
                    if (!usefulLife || usefulLife <= 0) {
                        throw new Error('Useful life is required and must be greater than 0 for STRAIGHT_LINE depreciation');
                    }
                } else if (data.depreciationMethod === 'PERCENTAGE') {
                    const rate = parseNumeric(data.rate);
                    if (!rate || rate <= 0) {
                        throw new Error('Depreciation rate is required and must be greater than 0 for PERCENTAGE depreciation');
                    }
                }
            }

            // Build create data with proper type conversion
            const createData: any = {
                userId,
                name: data.name,
                type: data.type,
                purchasePrice: parseNumeric(data.purchasePrice) ?? data.purchasePrice,
                purchaseDate: new Date(data.purchaseDate),
                depreciationMethod: data.depreciationMethod,
                isDepreciationEnabled: data.isDepreciationEnabled ?? true,
            };

            // Handle optional numeric fields with proper conversion
            const rate = parseNumeric(data.rate);
            const usefulLife = parseInteger(data.usefulLife);
            const salvageValue = parseNumeric(data.salvageValue);

            if (rate !== null) {
                createData.rate = rate;
            }

            if (usefulLife !== null) {
                createData.usefulLife = usefulLife;
            }

            if (salvageValue !== null) {
                createData.salvageValue = salvageValue;
            }

            // Handle optional string fields
            if (data.purchaseCurrency) {
                createData.purchaseCurrency = data.purchaseCurrency;
            }

            if (data.notes) {
                createData.notes = data.notes;
            }

            return this.prisma.depreciatingAsset.create({
                data: createData,
            });
        } catch (error: any) {
            console.error('Error creating depreciating asset:', error);
            // Log specific Prisma error details
            if (error.code) {
                console.error('Prisma Error Code:', error.code);
                console.error('Prisma Error Meta:', error.meta);
            }

            // Re-throw with descriptive message
            throw new Error(`Failed to create asset: ${error.message}`);
        }
    }

    async findAll(userId: string) {
        const assets = await this.prisma.depreciatingAsset.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        // Calculate current value for each asset
        return assets.map(asset => {
            if (!asset.isDepreciationEnabled) {
                return { ...asset, currentValue: asset.currentValue ?? asset.purchasePrice };
            }
            const currentValue = this.calculateCurrentValue(asset);
            return { ...asset, currentValue };
        });
    }

    private calculateCurrentValue(asset: any): number {
        const purchasePrice = Number(asset.purchasePrice);
        const purchaseDate = new Date(asset.purchaseDate);
        const now = new Date();

        // Calculate years elapsed (fractional)
        const diffTime = Math.abs(now.getTime() - purchaseDate.getTime());
        const yearsElapsed = diffTime / (1000 * 60 * 60 * 24 * 365.25);

        let currentValue = purchasePrice;

        if (asset.depreciationMethod === 'STRAIGHT_LINE' && asset.usefulLife) {
            // Annual Depreciation = Cost / Useful Life
            const annualDepreciation = purchasePrice / asset.usefulLife;
            const totalDepreciation = annualDepreciation * yearsElapsed;
            currentValue = purchasePrice - totalDepreciation;
        } else if (asset.depreciationMethod === 'PERCENTAGE' && asset.rate) {
            // Declining Balance: Value = Cost * (1 - rate)^years
            const rateDecimal = Number(asset.rate) / 100;
            currentValue = purchasePrice * Math.pow(1 - rateDecimal, yearsElapsed);
        }

        // Ensure value doesn't go below salvage value (if set) or 0
        const salvageValue = asset.salvageValue ? Number(asset.salvageValue) : 0;
        return Math.max(salvageValue, Number(currentValue.toFixed(2)));
    }

    async findOne(id: string, userId: string) {
        const asset = await this.prisma.depreciatingAsset.findFirst({
            where: { id, userId },
        });

        if (asset && asset.isDepreciationEnabled) {
            const calculatedValue = this.calculateCurrentValue(asset);
            return { ...asset, currentValue: calculatedValue };
        }
        return asset;
    }

    async update(id: string, userId: string, data: any) {
        const updateData: any = {};

        // Explicitly map fields to prevent "Unknown arg" errors or type mismatches
        if (data.name !== undefined) updateData.name = data.name;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice;
        if (data.purchaseDate !== undefined) updateData.purchaseDate = new Date(data.purchaseDate);
        if (data.depreciationMethod !== undefined) updateData.depreciationMethod = data.depreciationMethod;
        if (data.rate !== undefined) updateData.rate = data.rate || null;
        if (data.usefulLife !== undefined) updateData.usefulLife = data.usefulLife || null;
        if (data.isDepreciationEnabled !== undefined) updateData.isDepreciationEnabled = data.isDepreciationEnabled;
        if (data.notes !== undefined) updateData.notes = data.notes;

        // New fields
        if (data.purchaseCurrency !== undefined) updateData.purchaseCurrency = data.purchaseCurrency;
        if (data.salvageValue !== undefined) updateData.salvageValue = data.salvageValue || null;

        return this.prisma.depreciatingAsset.update({
            where: { id, userId },
            data: updateData,
        });
    }

    async remove(id: string, userId: string) {
        return this.prisma.depreciatingAsset.delete({
            where: { id, userId },
        });
    }
}
