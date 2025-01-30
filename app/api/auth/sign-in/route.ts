import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // 필수 필드 검증
    if (!username || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        points: true,
        isDealer: true,
        password: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    // 응답에서 비밀번호 제외
    const { password: _, ...userWithoutPassword } = user;

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "6h" }
    );

    return NextResponse.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error("로그인 에러:", error);
    return NextResponse.json(
      { error: "로그인에 실패했습니다." },
      { status: 500 }
    );
  }
} 