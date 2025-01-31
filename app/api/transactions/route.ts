import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description?: string | null;
  createdAt: Date;
  senderId: string;
  receiverId: string;
  sender: {
    name: string;
  };
  receiver: {
    name: string;
  };
}

interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function GET(request: Request) {
  try {
    // 토큰 확인
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 토큰 검증
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 401 }
      );
    }

    const userId = decoded.id;

    // URL 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    // 포인트 내역 조회
    const where = {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    };

    const transactions = await prisma.pointTransaction.findMany({
      where,
      include: {
        sender: {
          select: {
            name: true,
          },
        },
        receiver: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 전체 거래 수 조회
    const total = await prisma.pointTransaction.count({
      where,
    });
    // 응답 데이터 포맷팅
    const formattedTransactions = transactions.map((tx: Transaction) => {
      let amount = tx.amount;
      let description = tx.description || '';

      // 포인트 부호 및 설명 결정
      if (tx.type === 'transfer') {
        if (tx.senderId === userId) {
          amount = -tx.amount;
        }
      } else if (tx.type === '충전') {
        description = description || '포인트 충전';
      } else if (tx.type === '출금') {
        amount = -tx.amount;
        description = description || '포인트 출금';
      } else if (tx.type === '전달') {
        if (tx.senderId === userId) {
          amount = -tx.amount;
        }
      }

      return {
        id: tx.id,
        type: tx.type,
        amount,
        description,
        date: tx.createdAt,
      };
    });

    return NextResponse.json({
      transactions: formattedTransactions,
      total,
    });
  } catch (error) {
    console.error("포인트 내역 조회 에러:", error);
    return NextResponse.json(
      { error: "포인트 내역을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
} 