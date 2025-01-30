import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const senderId = decoded.id;

    const { receiverId, amount } = await request.json();

    if (!receiverId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "유효하지 않은 요청입니다." },
        { status: 400 }
      );
    }

    // 본인에게 전달하는지 확인
    if (receiverId === senderId) {
      return NextResponse.json(
        { error: "본인에게는 포인트를 전달할 수 없습니다." },
        { status: 400 }
      );
    }

    // 송신자 정보 확인
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
    });

    if (!sender) {
      return NextResponse.json(
        { error: "송신자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 수신자 정보 확인
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "수신자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 잔액 확인
    if (sender.points < amount) {
      return NextResponse.json(
        { error: "잔액이 부족합니다." },
        { status: 400 }
      );
    }

    // 트랜잭션 실행
    const result = await prisma.$transaction(async (tx) => {
      // 송신자 포인트 차감
      await tx.user.update({
        where: { id: senderId },
        data: { points: { decrement: amount } },
      });

      // 수신자 포인트 증가
      await tx.user.update({
        where: { id: receiverId },
        data: { points: { increment: amount } },
      });

      // 거래 내역 생성
      const transaction = await tx.pointTransaction.create({
        data: {
          type: "transfer",
          amount: amount,
          senderId: senderId,
          receiverId: receiverId,
          description: `${sender.name}님이 ${receiver.name}님에게 포인트 전달`,
        },
      });

      return transaction;
    });

    return NextResponse.json({
      success: true,
      message: "포인트 전송이 완료되었습니다.",
      transaction: result,
    });
  } catch (error) {
    console.error("포인트 전송 에러:", error);
    return NextResponse.json(
      { error: "포인트 전송에 실패했습니다." },
      { status: 500 }
    );
  }
} 