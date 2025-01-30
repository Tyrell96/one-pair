import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { blackTableSeats, blueTableSeats } = body;

    console.log("테이블 설정 요청:", { blackTableSeats, blueTableSeats });

    // 기존 테이블 삭제
    await prisma.seatAssignment.deleteMany();
    await prisma.pokerTable.deleteMany();

    const tablesToCreate = [];

    // Black 테이블 생성 (좌석 수가 0보다 큰 경우에만)
    if (blackTableSeats > 0) {
      tablesToCreate.push({
        name: "Black",
        color: "Black",
        number: 1,
        seats: blackTableSeats,
      });
    }

    // Blue 테이블 생성 (좌석 수가 0보다 큰 경우에만)
    if (blueTableSeats > 0) {
      tablesToCreate.push({
        name: "Blue",
        color: "Blue",
        number: 1,
        seats: blueTableSeats,
      });
    }

    console.log("생성할 테이블:", tablesToCreate);

    // 테이블 생성
    for (const table of tablesToCreate) {
      await prisma.pokerTable.create({
        data: table,
      });
    }

    const tables = await prisma.pokerTable.findMany({
      orderBy: [
        { color: "asc" },
      ],
    });

    console.log("생성된 테이블:", tables);

    return NextResponse.json({ tables });
  } catch (error) {
    console.error("테이블 설정 에러:", error);
    return NextResponse.json(
      { error: "테이블 설정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 