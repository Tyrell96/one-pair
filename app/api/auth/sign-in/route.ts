import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = "6h";

interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    name: string;
    nickname: string;
    role: string;
    points: number;
    isDealer: boolean;
    avatar?: string | null;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse | { error: string }>> {
  try {
    const { username, password } = await request.json();

    // 필수 필드 검증
    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 사용자 조회 - 필요한 필드만 선택
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        nickname: true,
        role: true,
        points: true,
        isDealer: true,
        password: true,
        avatar: true,
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
    const userWithoutPassword = {
      id: user.id,
      username: user.username,
      name: user.name,
      nickname: user.nickname,
      role: user.role,
      points: user.points,
      isDealer: user.isDealer,
      avatar: user.avatar,
    };

    // JWT 토큰 생성 - 필요한 정보만 포함
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 응답 데이터 구성
    const response: LoginResponse = {
      token,
      user: userWithoutPassword
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("로그인 에러:", error);
    return NextResponse.json(
      { error: "로그인에 실패했습니다." },
      { status: 500 }
    );
  }
} 