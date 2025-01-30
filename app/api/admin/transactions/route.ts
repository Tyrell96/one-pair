import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    // URL 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const searchType = searchParams.get('searchType') || 'all'; // 'sender', 'receiver', 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    // 쿼리 조건 구성
    const where: Prisma.PointTransactionWhereInput = {};

    if (search) {
      if (searchType === 'sender') {
        where.sender = {
          OR: [
            { name: { contains: search } },
            { id: { contains: search } }
          ]
        };
      } else if (searchType === 'receiver') {
        where.receiver = {
          OR: [
            { name: { contains: search } },
            { id: { contains: search } }
          ]
        };
      } else {
        where.OR = [
          {
            sender: {
              OR: [
                { name: { contains: search } },
                { id: { contains: search } }
              ]
            }
          },
          {
            receiver: {
              OR: [
                { name: { contains: search } },
                { id: { contains: search } }
              ]
            }
          }
        ];
      }
    }

    if (type && type !== 'all') {
      where.type = type;
    }

    // 포인트 내역 조회
    const transactions = await prisma.pointTransaction.findMany({
      where,
      include: {
        sender: {
          select: {
            name: true,
            username: true,
          },
        },
        receiver: {
          select: {
            name: true,
            username: true,
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
    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      senderName: tx.sender.name,
      senderUsername: tx.sender.username,
      receiverName: tx.receiver.name,
      receiverUsername: tx.receiver.username,
      description: tx.type === 'transfer' 
        ? `${tx.sender.name}님이 ${tx.receiver.name}님에게 포인트 전달`
        : tx.type === 'charge'
        ? `${tx.receiver.name}님 포인트 충전`
        : `${tx.sender.name}님 포인트 출금`,
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