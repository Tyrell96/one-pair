import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const type = searchParams.get('type');
    const searchType = searchParams.get('searchType') || 'all';
    const search = searchParams.get('search');

    // 쿼리 조건 구성
    const where: Prisma.PointTransactionWhereInput = {};

    if (type && type !== 'all') {
      where.type = type;
    }

    if (search) {
      if (searchType === 'sender') {
        where.sender = {
          OR: [
            { name: { contains: search } },
            { username: { contains: search } }
          ]
        };
      } else if (searchType === 'receiver') {
        where.receiver = {
          OR: [
            { name: { contains: search } },
            { username: { contains: search } }
          ]
        };
      } else {
        where.OR = [
          {
            sender: {
              OR: [
                { name: { contains: search } },
                { username: { contains: search } }
              ]
            }
          },
          {
            receiver: {
              OR: [
                { name: { contains: search } },
                { username: { contains: search } }
              ]
            }
          }
        ];
      }
    }

    // 포인트 내역 조회
    const transactions = await prisma.pointTransaction.findMany({
      where,
      include: {
        sender: true,
        receiver: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 전체 거래 수 조회
    const total = await prisma.pointTransaction.count({ where });

    // 응답 데이터 포맷팅
    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      senderName: tx.sender?.name || '시스템',
      senderUsername: tx.sender?.username || 'SYSTEM',
      receiverName: tx.receiver?.name || '시스템',
      receiverUsername: tx.receiver?.username || 'SYSTEM',
      description: tx.description || '',
      date: tx.createdAt,
    }));

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