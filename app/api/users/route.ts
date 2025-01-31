import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JwtPayload {
  id: string;
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

    // 관리자 권한 확인
    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "관리자만 접근할 수 있습니다." },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        points: true,
        isDealer: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("사용자 목록 조회 에러:", error);
    return NextResponse.json(
      { error: "사용자 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const { name, email, password } = await request.json();
    console.log("계정 생성 요청:", { name, email });

    // 필수 필드 검증
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "모든 필드를 입력해주세요." },
        { status: 400 }
      );
    }

    // 이메일 중복 검사
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다." },
        { status: 400 }
      );
    }

    // 사용자명 생성 (이메일에서 @ 앞부분)
    const username = email.split("@")[0];
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("DB 연결 시도...");
    
    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        name,
        points: 0,
      },
    });

    console.log("사용자 생성 성공:", { id: user.id, name: user.name, email: user.email, points: user.points });

    return NextResponse.json({
      message: "계정이 생성되었습니다.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("계정 생성 에러:", error);
    return NextResponse.json(
      { error: "계정 생성에 실패했습니다." },
      { status: 500 }
    );
  }
} 