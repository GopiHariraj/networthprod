import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateInsurancePolicyDto, UpdateInsurancePolicyDto } from './dto/insurance-policy.dto';

@Injectable()
export class InsuranceService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, createDto: CreateInsurancePolicyDto) {
        const { benefits, ...policyData } = createDto;

        return this.prisma.insurancePolicy.create({
            data: {
                ...policyData,
                userId,
                benefits: {
                    create: benefits || [],
                },
            },
            include: {
                benefits: true,
            },
        });
    }

    async findAll(userId: string) {
        return this.prisma.insurancePolicy.findMany({
            where: { userId },
            include: {
                benefits: true,
                documents: true,
            },
            orderBy: { expiryDate: 'asc' },
        });
    }

    async findOne(userId: string, id: string) {
        const policy = await this.prisma.insurancePolicy.findFirst({
            where: { id, userId },
            include: {
                benefits: true,
                documents: true,
                claims: true,
            },
        });

        if (!policy) throw new NotFoundException('Insurance policy not found');
        return policy;
    }

    async update(userId: string, id: string, updateDto: UpdateInsurancePolicyDto) {
        const { benefits, ...policyData } = updateDto;

        // Delete existing benefits and replace with new ones (simple replacement logic)
        await this.prisma.insuranceBenefit.deleteMany({
            where: { policyId: id },
        });

        return this.prisma.insurancePolicy.update({
            where: { id },
            data: {
                ...policyData,
                benefits: {
                    create: benefits || [],
                },
            },
            include: {
                benefits: true,
            },
        });
    }

    async remove(userId: string, id: string) {
        const policy = await this.findOne(userId, id);
        return this.prisma.insurancePolicy.delete({
            where: { id: policy.id },
        });
    }

    async addDocument(policyId: string, name: string, fileUrl: string, fileType: string) {
        return this.prisma.insuranceDocument.create({
            data: {
                policyId,
                name,
                fileUrl,
                fileType,
            },
        });
    }
}
