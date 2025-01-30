"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import jwt from "jsonwebtoken";
import { Label } from "@/components/ui/label";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  points: number;
  avatar?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleProfileUpdate = useCallback(async () => {
    if (!profile) return;

    if (newPassword && newPassword !== confirmPassword) {
      toast({
        title: "오류",
        description: "새 비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '프로필 업데이트에 실패했습니다.');
      }

      const updatedUser = await response.json();
      
      toast({
        title: "성공",
        description: "프로필이 업데이트되었습니다.",
      });
      
      router.push('/');
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "프로필 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [profile, newPassword, confirmPassword, currentPassword, toast, router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/sign-in");
      return;
    }

    try {
      const decoded = jwt.decode(token) as UserProfile;
      if (decoded) {
        setProfile({
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          points: decoded.points,
          avatar: decoded.avatar,
        });
      }
    } catch (error) {
      console.error("토큰 디코딩 에러:", error);
      router.push("/sign-in");
    }
  }, [router]);

  if (!profile) {
    return (
      <div className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              로딩 중...
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>프로필 수정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 프로필 이미지 섹션 */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar} alt={profile.name} />
                <AvatarFallback>
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" disabled>프로필 이미지 변경</Button>
            </div>

            {/* 기본 정보 섹션 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">기본 정보</h3>
              <div className="space-y-2">
                <Input
                  placeholder="이름"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  disabled={isLoading}
                />
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    이메일은 변경할 수 없습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 비밀번호 변경 섹션 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">비밀번호 변경</h3>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="현재 비밀번호"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isLoading}
                />
                <Input
                  type="password"
                  placeholder="새 비밀번호"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
                <Input
                  type="password"
                  placeholder="새 비밀번호 확인"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* 버튼 섹션 */}
            <div className="flex space-x-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => router.push('/')}
                disabled={isLoading}
              >
                취소
              </Button>
              <Button 
                onClick={handleProfileUpdate}
                disabled={isLoading}
              >
                {isLoading ? "저장 중..." : "저장"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 