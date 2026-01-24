import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateStockAssetDto,
  UpdateStockAssetDto,
} from './dto/stock-asset.dto';
import { AlphaVantageService } from './alpha-vantage.service';

@Injectable()
export class StockAssetsService {
  constructor(
    private prisma: PrismaService,
    private alphaVantageService: AlphaVantageService,
  ) { }

  async findAll(userId: string) {
    const assets = await this.prisma.stockAsset.findMany({
      where: { userId },
      include: {
        transactions: true,
      },
      orderBy: { symbol: 'asc' },
    });

    // Optionally recalculate on the fly if needed, or trust stored values
    return assets;
  }

  async findOne(id: string, userId: string) {
    return this.prisma.stockAsset.findFirst({
      where: { id, userId },
      include: {
        transactions: true,
      },
    });
  }

  async create(userId: string, dto: CreateStockAssetDto) {
    const asset = await this.prisma.stockAsset.create({
      data: {
        userId,
        ...dto,
      },
    });

    // Create initial transaction if quantity > 0
    if (Number(dto.quantity) > 0) {
      await (this.prisma as any).stockTransaction.create({
        data: {
          stockAssetId: asset.id,
          type: 'BUY',
          quantity: dto.quantity,
          price: dto.avgPrice,
          date: new Date(),
          notes: 'Initial balance',
        },
      });
    }

    return asset;
  }

  async update(id: string, userId: string, dto: UpdateStockAssetDto) {
    const asset = await this.findOne(id, userId);
    if (!asset) {
      throw new NotFoundException('Stock asset not found');
    }

    const updated = await this.prisma.stockAsset.update({
      where: { id },
      data: dto,
    });

    // If quantity or avgPrice was manually updated, we might want to sync transactions,
    // but for now we'll assume manual updates are for corrections.
    return updated;
  }

  async addTransaction(userId: string, assetId: string, type: 'BUY' | 'SELL', quantity: number, price: number, date: Date, notes?: string) {
    const asset = await this.findOne(assetId, userId);
    if (!asset) throw new NotFoundException('Stock asset not found');

    await (this.prisma as any).stockTransaction.create({
      data: {
        stockAssetId: assetId,
        type,
        quantity,
        price,
        date,
        notes,
      },
    });

    return this.recalculateAsset(assetId);
  }

  async recalculateAsset(assetId: string) {
    const asset = await this.prisma.stockAsset.findUnique({
      where: { id: assetId },
      include: { transactions: true },
    });

    if (!asset) return null;

    let totalBuyQty = 0;
    let totalBuyCost = 0;
    let totalSellQty = 0;

    asset.transactions.forEach((tx: any) => {
      if (tx.type === 'BUY') {
        totalBuyQty += Number(tx.quantity);
        totalBuyCost += Number(tx.quantity) * Number(tx.price);
      } else if (tx.type === 'SELL') {
        totalSellQty += Number(tx.quantity);
      }
    });

    const netUnits = Math.max(0, totalBuyQty - totalSellQty);
    const avgBuyPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;

    return this.prisma.stockAsset.update({
      where: { id: assetId },
      data: {
        quantity: netUnits,
        avgPrice: avgBuyPrice,
      },
    });
  }

  async refreshPrice(id: string, userId: string) {
    const asset = await this.findOne(id, userId);
    if (!asset) {
      throw new NotFoundException('Stock asset not found');
    }

    try {
      const quote = await this.alphaVantageService.getStockQuote(asset.symbol);

      // Update the current price (Alpha Vantage returns USD prices)
      const updated = await this.prisma.stockAsset.update({
        where: { id },
        data: {
          currentPrice: quote.price,
          currency: 'USD', // Alpha Vantage returns prices in USD
        },
      });

      return updated;
    } catch (error) {
      console.error(`Failed to refresh price for ${asset.symbol}:`, error);
      throw error;
    }
  }

  async refreshAllPrices(userId: string) {
    const assets = await this.prisma.stockAsset.findMany({
      where: { userId },
    });

    if (assets.length === 0) {
      return { message: 'No stocks to refresh', updated: 0 };
    }

    const symbols = assets.map(a => a.symbol);
    const prices = await this.alphaVantageService.getBatchQuotes(symbols);

    let updated = 0;
    for (const asset of assets) {
      const newPrice = prices.get(asset.symbol);
      if (newPrice) {
        await this.prisma.stockAsset.update({
          where: { id: asset.id },
          data: {
            currentPrice: newPrice,
            currency: 'USD',
          },
        });
        updated++;
      }
    }

    return {
      message: `Successfully updated ${updated} out of ${assets.length} stocks`,
      updated,
      total: assets.length,
    };
  }

  async getQuoteBySymbol(symbol: string) {
    try {
      const quote = await this.alphaVantageService.getStockQuote(symbol);
      return {
        symbol: quote.symbol,
        price: quote.price,
        currency: 'USD', // Alpha Vantage returns USD prices
      };
    } catch (error) {
      console.error(`Failed to get quote for ${symbol}:`, error);
      throw error;
    }
  }

  async delete(id: string, userId: string) {
    const asset = await this.findOne(id, userId);
    if (!asset) {
      throw new Error('Stock asset not found');
    }

    await this.prisma.stockAsset.delete({ where: { id } });
    return { success: true, message: 'Stock asset deleted' };
  }
}
