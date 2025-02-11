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

    // 모든 사용자 정보 조회
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        nickname: true,
        points: true,
        role: true,
        isDealer: true,
        createdAt: true,
        bankAccount: true,
        avatar: true,
        pointRequests: {
          select: {
            id: true,
            type: true,
            amount: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        sentTransactions: {
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        receivedTransactions: {
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 응답 데이터 가공
    const formattedUsers = users.map(user => ({
      ...user,
      transactions: [
        ...user.sentTransactions,
        ...user.receivedTransactions
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
      pointRequests: user.pointRequests,
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("사용자 목록 조회 에러:", error);
    return NextResponse.json(
      { error: "사용자 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

// 사용자 정보 업데이트
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
    const { id, ...updateData } = body;

    // 사용자 정보 업데이트
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("사용자 정보 업데이트 에러:", error);
    return NextResponse.json(
      { error: "사용자 정보를 업데이트할 수 없습니다." },
      { status: 500 }
    );
  }
}

// 사용자 삭제
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 사용자 삭제
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: "사용자가 삭제되었습니다." });
  } catch (error) {
    console.error("사용자 삭제 에러:", error);
    return NextResponse.json(
      { error: "사용자를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}