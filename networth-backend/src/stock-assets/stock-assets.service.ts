import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateStockAssetDto,
  UpdateStockAssetDto,
} from './dto/stock-asset.dto';
import { AlphaVantageService } from './alpha-vantage.service';
import { StockPriceService } from './stock-price.service';

@Injectable()
export class StockAssetsService {
  constructor(
    private prisma: PrismaService,
    private alphaVantageService: AlphaVantageService,
    private stockPriceService: StockPriceService,
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

  async create(userId: string, dto: CreateStockAssetDto & { defaultBrokerageType?: string; defaultBrokerageValue?: number }) {
    const asset = await this.prisma.stockAsset.create({
      data: {
        userId,
        symbol: dto.symbol,
        name: dto.name,
        exchange: dto.exchange,
        quantity: dto.quantity,
        avgPrice: dto.avgPrice,
        currentPrice: dto.currentPrice,
        currency: dto.currency,
        currentPriceCurrency: dto.currentPriceCurrency,
        broker: dto.broker,
        defaultBrokerageType: dto.defaultBrokerageType || 'FLAT',
        defaultBrokerageValue: dto.defaultBrokerageValue || 0,
      },
    });

    // Create initial transaction if quantity > 0
    if (Number(dto.quantity) > 0) {
      // Calculate brokerage for initial transaction
      let brokerageFee = 0;
      if (dto.defaultBrokerageType === 'FLAT') {
        brokerageFee = Number(dto.defaultBrokerageValue || 0);
      } else if (dto.defaultBrokerageType === 'PERCENTAGE') {
        const totalValue = Number(dto.quantity) * Number(dto.avgPrice);
        brokerageFee = totalValue * (Number(dto.defaultBrokerageValue || 0) / 100);
      }

      await (this.prisma as any).stockTransaction.create({
        data: {
          stockAssetId: asset.id,
          type: 'BUY',
          quantity: dto.quantity,
          price: dto.avgPrice,
          brokerageFee: brokerageFee,
          date: new Date(),
          notes: 'Initial balance',
        },
      });
    }

    return asset;
  }

  async update(id: string, userId: string, dto: UpdateStockAssetDto & { defaultBrokerageType?: string; defaultBrokerageValue?: number }) {
    const asset = await this.findOne(id, userId);
    if (!asset) {
      throw new NotFoundException('Stock asset not found');
    }

    const updated = await this.prisma.stockAsset.update({
      where: { id },
      data: {
        ...dto,
        defaultBrokerageType: dto.defaultBrokerageType,
        defaultBrokerageValue: dto.defaultBrokerageValue,
      },
    });

    return updated;
  }

  async bulkCreate(userId: string, assets: any[]) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const assetData of assets) {
      try {
        // Check if asset exists by symbol
        let asset = await this.prisma.stockAsset.findFirst({
          where: { userId, symbol: assetData.symbol },
        });

        if (asset) {
          // Update existing? Or just add transaction? 
          // For now, let's assume we update defaults and add a transaction if quantity > 0
          await this.prisma.stockAsset.update({
            where: { id: asset.id },
            data: {
              defaultBrokerageType: assetData.defaultBrokerageType || asset.defaultBrokerageType,
              defaultBrokerageValue: assetData.defaultBrokerageValue !== undefined ? assetData.defaultBrokerageValue : asset.defaultBrokerageValue,
            }
          });
        } else {
          // Create new
          asset = await this.prisma.stockAsset.create({
            data: {
              userId,
              symbol: assetData.symbol,
              name: assetData.name || assetData.symbol,
              exchange: assetData.exchange || 'NASDAQ',
              quantity: 0, // Will be updated by transaction
              avgPrice: 0,
              currentPrice: assetData.currentPrice || 0,
              currency: assetData.currency || 'USD',
              broker: assetData.broker || assetData.platform,
              defaultBrokerageType: assetData.defaultBrokerageType || 'FLAT',
              defaultBrokerageValue: assetData.defaultBrokerageValue || 0,
            },
          });
        }

        // Add transaction
        if (Number(assetData.quantity) > 0) {
          const price = Number(assetData.avgPrice || assetData.currentPrice || 0);
          const quantity = Number(assetData.quantity);

          let brokerageFee = 0;
          const brokerageType = assetData.defaultBrokerageType || asset?.defaultBrokerageType || 'FLAT';
          const brokerageVal = assetData.defaultBrokerageValue !== undefined ? Number(assetData.defaultBrokerageValue) : Number(asset?.defaultBrokerageValue || 0);

          if (brokerageType === 'FLAT') {
            brokerageFee = brokerageVal;
          } else {
            brokerageFee = (quantity * price) * (brokerageVal / 100);
          }

          await this.addTransaction(
            userId,
            asset.id,
            'BUY',
            quantity,
            price,
            assetData.date ? new Date(assetData.date) : new Date(),
            'Bulk upload import',
            brokerageFee
          );
        }

        results.success++;
      } catch (error) {
        console.error(`Failed to import ${assetData.symbol}:`, error);
        results.failed++;
        results.errors.push(`${assetData.symbol}: ${error.message}`);
      }
    }

    return results;
  }

  async addTransaction(userId: string, assetId: string, type: 'BUY' | 'SELL', quantity: number, price: number, date: Date, notes?: string, brokerageFee?: number) {
    const asset = await this.findOne(assetId, userId);
    if (!asset) throw new NotFoundException('Stock asset not found');

    // If brokerageFee is not provided, calculate from default
    let finalBrokerage = brokerageFee;
    if (finalBrokerage === undefined) {
      if (asset.defaultBrokerageType === 'FLAT') {
        finalBrokerage = Number(asset.defaultBrokerageValue || 0);
      } else {
        finalBrokerage = (Number(quantity) * Number(price)) * (Number(asset.defaultBrokerageValue || 0) / 100);
      }
    }

    await (this.prisma as any).stockTransaction.create({
      data: {
        stockAssetId: assetId,
        type,
        quantity,
        price,
        date,
        notes,
        brokerageFee: finalBrokerage,
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
      // Net cost should include brokerage? Usually for tax, yes. 
      // Cost Basis = (Price * Qty) + Fee
      // For now we keep avgPrice as simple (Price * Qty) / Qty to match display, 
      // or we can bake fee into avgPrice. 
      // Let's stick to simple price avg for now, as UI displays "Avg Price" not "Avg Cost".

      if (tx.type === 'BUY') {
        totalBuyQty += Number(tx.quantity);
        totalBuyCost += (Number(tx.quantity) * Number(tx.price));
      } else if (tx.type === 'SELL') {
        totalSellQty += Number(tx.quantity);
      }
    });

    const netUnits = Math.max(0, totalBuyQty - totalSellQty);
    // Weighted Average Price
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
          // currency: 'USD', // Alpha Vantage returns prices in USD
        },
      });

      return updated;
    } catch (error) {
      console.error(`Failed to refresh price for ${asset.symbol}:`, error);
      throw error;
    }
  }

  async refreshAllPrices(userId: string, userEmail: string) {
    const assets = await this.prisma.stockAsset.findMany({
      where: { userId },
    });

    if (assets.length === 0) {
      return { message: 'No stocks to refresh', updated: 0 };
    }

    let updated = 0;
    const errors: string[] = [];
    const now = new Date();

    for (const asset of assets) {
      try {
        const priceData = await this.stockPriceService.fetchStockPrice(
          asset.symbol,
          asset.exchange || '',
          userEmail
        );

        if (priceData) {
          await this.prisma.stockAsset.update({
            where: { id: asset.id },
            data: {
              currentPrice: priceData.price,
              currentPriceCurrency: priceData.currency,
              lastPriceUpdate: now,
            },
          });
          console.log(`[StockAssetsService] Updated ${asset.symbol}: ${priceData.price} ${priceData.currency}`);
          updated++;
        } else {
          errors.push(`${asset.symbol}: Failed to fetch price`);
        }
      } catch (error) {
        errors.push(`${asset.symbol}: ${error.message}`);
      }
    }

    return {
      message: `Successfully updated ${updated} out of ${assets.length} stocks`,
      updated,
      total: assets.length,
      errors: errors.length > 0 ? errors : undefined,
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
