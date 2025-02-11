"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/navigation/bottom-nav";

interface UserProfile {
  id: string;
  name: string;
  nickname: string;
  points: number;
  bankAccount: string;
  avatar?: string;
}

const initialProfile: UserProfile = {
  id: '',
  name: '',
  nickname: '',
  points: 0,
  bankAccount: '',
  avatar: '',
};

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/sign-in");
        return;
      }

      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("프로필 정보를 불러올 수 없습니다.");
      }

      const data = await response.json();
      setProfile({
        id: data.id,
        name: data.name,
        nickname: data.nickname,
        points: data.points,
        bankAccount: data.bankAccount || "",
        avatar: data.avatar,
      });
    } catch (error) {
      console.error("프로필 로딩 에러:", error);
      toast({
        title: "오류",
        description: "프로필 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
      router.push("/sign-in");
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileUpdate = async () => {
    if (!profile.id) return;

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
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/sign-in");
        return;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: profile.id,
          nickname: profile.nickname,
          bankAccount: profile.bankAccount,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '프로필 업데이트에 실패했습니다.');
      }

      await response.json();
      
      toast({
        title: "성공",
        description: "프로필이 업데이트되었습니다.",
      });
      
      router.push('/');
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "오류",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
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
    <div className="container mx-auto p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>프로필 수정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 프로필 이미지 섹션 */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar} alt={profile.nickname} />
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
                <div className="space-y-2">
                  <Label htmlFor="nickname">닉네임</Label>
                  <Input
                    id="nickname"
                    placeholder="닉네임"
                    value={profile.nickname}
                    onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccount">출금계좌번호</Label>
                  <Input
                    id="bankAccount"
                    placeholder="출금계좌번호 (예: 000-000000-00-000)"
                    value={profile.bankAccount}
                    onChange={(e) => setProfile({ ...profile, bankAccount: e.target.value })}
                    disabled={isLoading}
                  />
                  <p className="text-sm text-muted-foreground">
                    포인트 출금시 사용될 계좌번호를 입력해주세요.
                  </p>
                </div>
              </div>
            </div>

            {/* 비밀번호 변경 섹션 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">비밀번호 변경</h3>
              <div className="space-y-2">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">현재 비밀번호</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="현재 비밀번호"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">새 비밀번호</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="새 비밀번호"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="새 비밀번호 확인"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
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
      <BottomNav />
    </div>
  );
} 