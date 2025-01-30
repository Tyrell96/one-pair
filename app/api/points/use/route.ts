import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: Request) {
  try {
    // 토큰 검증
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "인증되지 않은 사용자입니다." },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const { product, amount } = await request.json();

    // 사용자 확인
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        points: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 포인트 잔액 확인
    if (user.points < amount) {
      return NextResponse.json(
        { error: "포인트가 부족합니다." },
        { status: 400 }
      );
    }

    // 관리자 계정 조회 (포인트 수신자)
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true }
    });

    if (!admin) {
      return NextResponse.json(
        { error: "관리자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 포인트 차감
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          points: {
            decrement: amount,
          },
        },
      });

      // 포인트 거래 내역 생성
      await tx.pointTransaction.create({
        data: {
          type: "사용",
          amount: -amount,
          senderId: user.id,
          receiverId: admin.id,
          description: `${product} 구매 (${amount.toLocaleString()}P)`,
        },
      });

      return updatedUser;
    });

    return NextResponse.json({
      message: "포인트 사용이 완료되었습니다.",
      user: result,
    });
  } catch (error) {
    console.error("포인트 사용 에러:", error);
    return NextResponse.json(
      { error: "포인트 사용 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 