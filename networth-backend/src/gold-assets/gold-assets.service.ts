import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateGoldAssetDto, UpdateGoldAssetDto } from './dto/gold-asset.dto';

import { StockPriceService } from '../stock-assets/stock-price.service';

@Injectable()
export class GoldAssetsService {
  constructor(
    private prisma: PrismaService,
    private stockPriceService: StockPriceService
  ) { }

  async findAll(userId: string) {
    return this.prisma.goldAsset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.goldAsset.findFirst({
      where: { id, userId },
    });
  }

  async create(userId: string, dto: CreateGoldAssetDto) {
    return this.prisma.goldAsset.create({
      data: {
        userId,
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateGoldAssetDto) {
    const asset = await this.findOne(id, userId);
    if (!asset) {
      throw new Error('Gold asset not found');
    }

    return this.prisma.goldAsset.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      },
    });
  }

  async delete(id: string, userId: string) {
    const asset = await this.findOne(id, userId);
    if (!asset) {
      throw new Error('Gold asset not found');
    }

    await this.prisma.goldAsset.delete({ where: { id } });
    return { success: true, message: 'Gold asset deleted' };
  }

  async refreshPrices(userId: string) {
    // 1. Fetch current Gold Price (24K per gram for simplicity, or we can adjust by purity)
    // For now, we assume the price returned is for 24K and we scale it? 
    // Or we just update the total value based on purity if logic exists. 
    // The current UI logic suggests `totalValue` is manually set or calculated.
    // If we want to automate, we need to know the purity factor.

    // Purity Map (approximate)
    const purityFactor: Record<string, number> = {
      '24K': 1.0,
      '22K': 22 / 24,
      '18K': 18 / 24,
      '14K': 14 / 24,
      '10K': 10 / 24,
    };

    const currentRate24k = await this.stockPriceService.fetchGoldPrice('AED');

    if (!currentRate24k) {
      throw new Error('Failed to fetch gold price');
    }

    const assets = await this.prisma.goldAsset.findMany({ where: { userId } });
    let updatedCount = 0;

    for (const asset of assets) {
      const factor = purityFactor[asset.notes || '24K'] || 1.0; // Assuming 'notes' field stores purity based on frontend logic, or we need to check where purity is stored. 
      // Wait! Frontend stores purity in `purity` field in local state, but maps it to...?
      // Let's check schema. `notes` seems to be used for purity in `create` DTO in frontend: `notes: formData.purity`. 
      // Yes, `notes` column stores purity.

      const estimatedPricePerGram = currentRate24k * factor;
      const newTotalValue = Number(asset.weightGrams) * estimatedPricePerGram;

      await this.prisma.goldAsset.update({
        where: { id: asset.id },
        data: {
          currentValue: newTotalValue,
          updatedAt: new Date(),
        },
      });
      updatedCount++;
    }

    return {
      success: true,
      message: `Updated ${updatedCount} gold assets`,
      currentRate24k
    };
  }
}
