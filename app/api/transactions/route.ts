import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import type { Prisma } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const CACHE_DURATION = 60 * 5; // 5분

interface JwtPayload {
  id: string;
  role: string;
}

interface TransactionResponse {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  date: Date;
  senderName: string;
  senderUsername: string;
  receiverName: string;
  receiverUsername: string;
}

export async function GET(request: NextRequest) {
  try {
    // 토큰 검증
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId) {
      return NextResponse.json(
        { error: "사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 요청한 사용자와 조회 대상 사용자가 일치하는지 확인
    if (userId !== decoded.id && decoded.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "접근 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 날짜 필터 설정
    const dateFilter: Prisma.PointTransactionWhereInput = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    const where: Prisma.PointTransactionWhereInput = {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ],
      ...(Object.keys(dateFilter).length > 0 && { AND: [dateFilter] }),
    };

    // 거래 내역 조회
    const transactions = await prisma.pointTransaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        createdAt: true,
        sender: {
          select: {
            name: true,
            username: true,
          }
        },
        receiver: {
          select: {
            name: true,
            username: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    // 전체 거래 수 조회
    const total = await prisma.pointTransaction.count({ where });

    // 응답 데이터 포맷팅
    const formattedTransactions: TransactionResponse[] = transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      date: tx.createdAt,
      senderName: tx.sender?.name || '시스템',
      senderUsername: tx.sender?.username || '-',
      receiverName: tx.receiver?.name || '시스템',
      receiverUsername: tx.receiver?.username || '-'
    }));

    // 캐시 헤더 설정
    const response = NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });

    response.headers.set('Cache-Control', `private, max-age=${CACHE_DURATION}`);
    
    return response;
  } catch (error) {
    console.error("거래 내역 조회 에러:", error);
    return NextResponse.json(
      { error: "거래 내역을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
} 