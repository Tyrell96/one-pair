"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function CreateUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "오류",
        description: "비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("계정 생성 시도:", { name: formData.name, email: formData.email });
      
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "계정 생성에 실패했습니다.");
      }

      console.log("계정 생성 성공:", data);

      toast({
        title: "성공",
        description: "계정이 생성되었습니다.",
      });

      router.push("/admin");
    } catch (error: unknown) {
      console.error("계정 생성 에러:", error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "계정 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-lg mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>계정 생성</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">이름</label>
              <Input
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="이름 입력"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">이메일</label>
              <Input
                required
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="이메일 입력"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">비밀번호</label>
              <Input
                required
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="비밀번호 입력"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">비밀번호 확인</label>
              <Input
                required
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="비밀번호 다시 입력"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin")}
                disabled={isLoading}
              >
                취소
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "생성 중..." : "생성"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 