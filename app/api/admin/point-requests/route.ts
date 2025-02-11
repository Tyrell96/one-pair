import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { type NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JwtPayload {
  id: string;
  role: string;
}

export async function GET(request: NextRequest) {
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

    // 관리자 권한 확인
    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "관리자만 접근할 수 있습니다." },
        { status: 403 }
      );
    }

    // 모든 포인트 요청 조회
    const pointRequests = await prisma.pointRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            points: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(pointRequests);
  } catch (error) {
    console.error("포인트 요청 목록 조회 에러:", error);
    return NextResponse.json(
      { error: "포인트 요청 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

// 포인트 요청 상태 업데이트 (승인/거절)
export async function PUT(request: NextRequest) {
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

    // 관리자 권한 확인
    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "관리자만 접근할 수 있습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status } = body;

    // 포인트 요청 상태 업데이트
    const updatedRequest = await prisma.pointRequest.update({
      where: { id },
      data: { status },
      include: {
        user: true,
      },
    });

    // 요청이 승인된 경우 사용자의 포인트 업데이트
    if (status === 'approved') {
      const pointChange = updatedRequest.type === 'charge' 
        ? updatedRequest.amount 
        : -updatedRequest.amount;

      // 트랜잭션으로 포인트 업데이트와 거래 내역 생성을 함께 처리
      await prisma.$transaction(async (tx) => {
        // 사용자 포인트 업데이트
        await tx.user.update({
          where: { id: updatedRequest.userId },
          data: {
            points: {
              increment: pointChange,
            },
          },
        });
        // 거래 내역 생성
        const transactionData = {
          type: updatedRequest.type,
          amount: updatedRequest.amount,
          description: `포인트 ${updatedRequest.type === 'charge' ? '충전' : '출금'} 승인`,
          senderId: updatedRequest.type === 'withdraw' ? updatedRequest.userId : decoded.id,
          receiverId: updatedRequest.type === 'charge' ? updatedRequest.userId : decoded.id,
        };

        await tx.pointTransaction.create({
          data: transactionData,
        });
      });
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("포인트 요청 상태 업데이트 에러:", error);
    return NextResponse.json(
      { error: "포인트 요청 상태를 업데이트할 수 없습니다." },
      { status: 500 }
    );
  }
} 