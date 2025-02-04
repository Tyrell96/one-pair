import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    // URL 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('searchQuery');
    const searchType = searchParams.get('searchType') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    // 쿼리 조건 구성
    const where: Prisma.PointTransactionWhereInput = {};

    if (searchQuery && searchQuery.trim() !== '') {
      if (searchType === 'sender') {
        where.sender = {
          OR: [
            { name: { contains: searchQuery } },
            { username: { contains: searchQuery } }
          ]
        };
      } else if (searchType === 'receiver') {
        where.receiver = {
          OR: [
            { name: { contains: searchQuery } },
            { username: { contains: searchQuery } }
          ]
        };
      } else if (searchType === 'all') {
        where.OR = [
          {
            sender: {
              OR: [
                { name: { contains: searchQuery } },
                { username: { contains: searchQuery } }
              ]
            }
          },
          {
            receiver: {
              OR: [
                { name: { contains: searchQuery } },
                { username: { contains: searchQuery } }
              ]
            }
          }
        ];
      }
    }

    // 포인트 내역 조회 (User 테이블과 Join)
    const transactions = await prisma.pointTransaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        createdAt: true,
        senderId: true,
        receiverId: true,
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
          }
        }
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
    const formattedTransactions = transactions.map(tx => {
      // sender와 receiver 정보 처리
      const senderInfo = tx.sender 
        ? { name: tx.sender.name, username: tx.sender.username }
        : { name: "시스템", username: "-" };
      
      const receiverInfo = tx.receiver
        ? { name: tx.receiver.name, username: tx.receiver.username }
        : { name: "시스템", username: "-" };

      return {
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        date: tx.createdAt,
        senderName: senderInfo.name,
        senderUsername: senderInfo.username,
        receiverName: receiverInfo.name,
        receiverUsername: receiverInfo.username
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