"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";

interface SignUpFormData {
  username: string;
  password: string;
  passwordConfirm: string;
  name: string;
  nickname: string;
  phone: string;
  bankAccount: string;
}

export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState<SignUpFormData>({
    username: "",
    password: "",
    passwordConfirm: "",
    name: "",
    nickname: "",
    phone: "",
    bankAccount: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

  const checkUsername = async () => {
    if (!formData.username) {
      toast({
        title: "아이디 입력 필요",
        description: "아이디를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingUsername(true);
    try {
      const response = await fetch("/api/auth/check-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: formData.username }),
      });

      if (response.ok) {
        setIsUsernameAvailable(true);
        toast({
          title: "사용 가능한 아이디",
          description: "사용 가능한 아이디입니다.",
        });
      } else {
        setIsUsernameAvailable(false);
        toast({
          title: "사용 불가능한 아이디",
          description: "이미 존재하는 아이디입니다.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "확인 실패",
        description: "아이디 중복 확인에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isUsernameAvailable) {
      toast({
        title: "아이디 중복 확인 필요",
        description: "아이디 중복 확인을 해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    if (formData.password !== formData.passwordConfirm) {
      toast({
        title: "비밀번호 불일치",
        description: "비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const submitData = {
        username: formData.username,
        password: formData.password,
        name: formData.name,
        nickname: formData.nickname,
        phone: formData.phone,
        bankAccount: formData.bankAccount
      };
      
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error("회원가입에 실패했습니다.");
      }

      toast({
        title: "회원가입 성공",
        description: "환영합니다!",
      });

      router.push("/auth/sign-in");
    } catch {
      toast({
        title: "오류",
        description: "회원가입에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-end mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/sign-in")}
          className="flex items-center space-x-2"
        >
          <LogIn className="h-4 w-4" />
          <span>로그인</span>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="username">아이디</Label>
          <div className="flex gap-2">
            <Input
              id="username"
              type="text"
              required
              placeholder="사용하실 아이디를 입력해주세요"
              value={formData.username}
              onChange={(e) => {
                setFormData({ ...formData, username: e.target.value });
                setIsUsernameAvailable(null);
              }}
              className={
                isUsernameAvailable === true
                  ? "border-green-500"
                  : isUsernameAvailable === false
                  ? "border-red-500"
                  : ""
              }
            />
            <Button
              type="button"
              onClick={checkUsername}
              disabled={isCheckingUsername}
              className="whitespace-nowrap"
            >
              {isCheckingUsername ? "확인 중..." : "중복 확인"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            required
            placeholder="비밀번호를 입력해주세요"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
          <Input
            id="passwordConfirm"
            type="password"
            required
            placeholder="비밀번호를 다시 입력해주세요"
            value={formData.passwordConfirm}
            onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            type="text"
            required
            placeholder="이름 (실명 필수, 입금 확인 시 필요)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nickname">닉네임</Label>
          <Input
            id="nickname"
            type="text"
            required
            placeholder="사용하실 닉네임을 입력해주세요"
            value={formData.nickname}
            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">연락처</Label>
          <Input
            id="phone"
            type="tel"
            required
            placeholder="010-1234-5678"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bankAccount">출금 계좌번호</Label>
          <Input
            id="bankAccount"
            type="text"
            required
            placeholder="은행명 계좌번호 (예: OO은행 00000000000000)"
            value={formData.bankAccount}
            onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading || !isUsernameAvailable}>
          회원가입
        </Button>
      </form>
    </div>
  );
} 