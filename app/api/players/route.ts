import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: 모든 플레이어 조회
export async function GET() {
  try {
    const players = await prisma.player.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(players);
  } catch (error) {
    console.error("플레이어 목록 조회 에러:", error);
    return NextResponse.json(
      { error: "플레이어 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST: 새로운 플레이어 추가
export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    // 중복 체크
    const existingPlayer = await prisma.player.findFirst({
      where: { name }
    });

    if (existingPlayer) {
      return NextResponse.json(
        { error: "이미 존재하는 플레이어 이름입니다." },
        { status: 400 }
      );
    }

    const player = await prisma.player.create({
      data: {
        name,
        points: 0
      }
    });

    return NextResponse.json(player);
  } catch (error) {
    console.error("플레이어 추가 에러:", error);
    return NextResponse.json(
      { error: "플레이어 추가에 실패했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: 플레이어 삭제
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "플레이어 ID가 필요합니다." },
        { status: 400 }
      );
    }

    await prisma.player.delete({
      where: { id }
    });

    return NextResponse.json({ message: "플레이어가 삭제되었습니다." });
  } catch (error) {
    console.error("플레이어 삭제 에러:", error);
    return NextResponse.json(
      { error: "플레이어 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
} 