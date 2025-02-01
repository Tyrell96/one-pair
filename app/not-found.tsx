import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <h2 className="text-2xl">페이지를 찾을 수 없습니다</h2>
        <p className="text-muted-foreground">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <Link href="/">
          <Button className="mt-4">
            <Home className="mr-2 h-4 w-4" />
            메인으로 돌아가기
          </Button>
        </Link>
      </div>
    </div>
  );
} 