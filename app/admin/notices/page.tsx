"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pin, Plus, Eye, EyeOff, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Notice {
  id: string;
  title: string;
  content: string;
  isImportant: boolean;
  isVisible: boolean;
  createdAt: string;
  author: {
    name: string;
  };
}

export default function AdminNoticesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    isImportant: false,
  });

  const fetchNotices = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/sign-in");
        return;
      }

      const response = await fetch("/api/admin/notices", {
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
  }, [router, toast]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/notices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("공지사항을 등록할 수 없습니다.");

      toast({
        title: "성공",
        description: "공지사항이 등록되었습니다.",
      });

      setIsDialogOpen(false);
      setFormData({ title: "", content: "", isImportant: false });
      fetchNotices();
    } catch {
      toast({
        title: "오류",
        description: "공지사항 등록에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const toggleVisibility = async (noticeId: string, currentVisibility: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/notices/${noticeId}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isVisible: !currentVisibility }),
      });

      if (!response.ok) throw new Error("공지사항 상태를 변경할 수 없습니다.");

      toast({
        title: "성공",
        description: `공지사항이 ${!currentVisibility ? "표시" : "숨김"} 처리되었습니다.`,
      });

      fetchNotices();
    } catch {
      toast({
        title: "오류",
        description: "상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const deleteNotice = async (noticeId: string) => {
    if (!confirm("정말 이 공지사항을 삭제하시겠습니까?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/notices/${noticeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("공지사항을 삭제할 수 없습니다.");

      toast({
        title: "성공",
        description: "공지사항이 삭제되었습니다.",
      });

      fetchNotices();
    } catch {
      toast({
        title: "오류",
        description: "삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            관리자 홈
          </Button>
          <h1 className="text-2xl font-bold">공지사항 관리</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 공지사항
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 공지사항 작성</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="공지사항 제목"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">내용</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="공지사항 내용"
                  rows={5}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="important"
                  checked={formData.isImportant}
                  onCheckedChange={(checked) => setFormData({ ...formData, isImportant: checked })}
                />
                <Label htmlFor="important">중요 공지</Label>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                등록하기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>공지사항 목록</CardTitle>
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
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVisibility(notice.id, notice.isVisible)}
                        >
                          {notice.isVisible ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotice(notice.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {notice.content}
                    </p>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>작성자: {notice.author.name}</span>
                      <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                    </div>
                    <Separator className="my-4" />
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 