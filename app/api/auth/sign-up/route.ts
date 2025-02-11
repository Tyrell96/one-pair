import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";

interface SignUpRequest {
  username: string;
  password: string;
  name: string;
  nickname: string;
  phone: string;
  bankAccount: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, name, nickname, phone, bankAccount } = body as SignUpRequest;

    // 필수 필드 검증
    const requiredFields = { username, password, name, nickname, phone, bankAccount };
    const emptyFields = Object.entries(requiredFields)
      .filter(([, value]) => !value?.trim())
      .map(([key]) => key);

    if (emptyFields.length > 0) {
      return NextResponse.json(
        { 
          error: "필수 정보가 누락되었습니다.",
          emptyFields 
        },
        { status: 400 }
      );
    }

    // 아이디 형식 검증
    const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: "아이디는 4~20자의 영문, 숫자, 언더스코어만 사용 가능합니다." },
        { status: 400 }
      );
    }

    // 비밀번호 형식 검증
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상의 영문과 숫자 조합이어야 합니다." },
        { status: 400 }
      );
    }

    // 전화번호 형식 검증
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    if (!phoneRegex.test(phone.replace(/-/g, ''))) {
      return NextResponse.json(
        { error: "올바른 전화번호 형식이 아닙니다." },
        { status: 400 }
      );
    }

    // 중복 검사 (아이디, 닉네임)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { nickname }
        ]
      },
      select: {
        username: true,
        nickname: true
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json(
          { error: "이미 사용 중인 아이디입니다." },
          { status: 400 }
        );
      }
      if (existingUser.nickname === nickname) {
        return NextResponse.json(
          { error: "이미 사용 중인 닉네임입니다." },
          { status: 400 }
        );
      }
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 12);

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        nickname,
        phone: phone.replace(/-/g, ''),
        bankAccount,
        points: 0, // 초기 포인트
        role: "USER", // 기본 역할
        isDealer: false, // 기본값
      },
      select: {
        id: true,
        username: true,
        name: true,
        nickname: true,
        role: true,
      }
    });

    return NextResponse.json({
      message: "회원가입이 완료되었습니다.",
      user
    });
  } catch (error) {
    console.error("회원가입 에러:", error);
    return NextResponse.json(
      { error: "회원가입에 실패했습니다." },
      { status: 500 }
    );
  }
} 