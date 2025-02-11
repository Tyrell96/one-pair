import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JwtPayload {
  id: string;
  role: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, amount, userId } = body;

    // 포인트 요청 생성
    const pointRequest = await prisma.pointRequest.create({
      data: {
        type,
        amount,
        status: 'pending',
        userId,
      },
    });

    // 관리자에게 알림 전송 (이메일 또는 다른 알림 시스템 연동 필요)
    // TODO: 알림 시스템 구현

    return NextResponse.json({
      message: `포인트 ${type === 'charge' ? '충전' : '출금'} 요청이 접수되었습니다.`,
      request: pointRequest,
    });
  } catch (error) {
    console.error("포인트 요청 처리 중 오류:", error);
    return NextResponse.json(
      { error: "포인트 요청을 처리할 수 없습니다." },
      { status: 500 }
    );
  }
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

    // 관리자 권한 확인
    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "관리자만 접근할 수 있습니다." },
        { status: 403 }
      );
    }

    const pointRequests = await prisma.pointRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
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