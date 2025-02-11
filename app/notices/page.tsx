"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BottomNav } from "@/components/navigation/bottom-nav";

interface Notice {
  id: string;
  title: string;
  content: string;
  isImportant: boolean;
  createdAt: string;
  author: {
    name: string;
  };
}

export default function NoticesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/sign-in");
          return;
        }

        const response = await fetch("/api/notices", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("공지사항을 불러올 수 없습니다.");

        const data = await response.json();
        setNotices(data.notices);
      } catch {
        toast({
          title: "오류",
          description: "공지사항을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotices();
  }, [router, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          뒤로가기
        </Button>
        <h1 className="text-2xl font-bold">공지사항</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>전체 공지사항</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {notices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 공지사항이 없습니다.
                </div>
              ) : (
                notices.map((notice) => (
                  <div key={notice.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {notice.isImportant && (
                          <Pin className="h-4 w-4 text-red-500" />
                        )}
                        <h3 className="text-lg font-semibold">{notice.title}</h3>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(notice.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {notice.content}
                    </p>
                    <div className="text-sm text-right">
                      작성자: {notice.author.name}
                    </div>
                    <Separator className="my-4" />
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <BottomNav />
    </div>
  );
} 