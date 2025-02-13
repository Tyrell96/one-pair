"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Send, Home } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  name: string;
  points: number;
}

export default function PaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [selectedDealer, setSelectedDealer] = useState("");
  const [dealers, setDealers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error("사용자 정보를 불러올 수 없습니다.");
      const data = await response.json();
      setCurrentUser(data);
    } catch (error: unknown) {
      console.error("사용자 정보 로딩 에러:", error);
      toast({
        title: "오류",
        description: "사용자 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchDealers = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users/dealers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("딜러 목록을 불러올 수 없습니다.");
      const data = await response.json();
      setDealers(data.dealers);
    } catch (error: unknown) {
      console.error("딜러 목록 로딩 에러:", error);
      toast({
        title: "오류",
        description: "딜러 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchCurrentUser();
    fetchDealers();
  }, [fetchCurrentUser, fetchDealers]);

  const handlePayment = useCallback(async () => {
    if (!selectedDealer) {
      toast({
        title: "오류",
        description: "딜러를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseInt(amount) <= 0) {
      toast({
        title: "오류",
        description: "올바른 금액을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser || parseInt(amount) > currentUser.points) {
      toast({
        title: "오류",
        description: "보유 포인트가 부족합니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/payment/dealer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dealerId: selectedDealer,
          amount: parseInt(amount),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "포인트 전달에 실패했습니다.");
      }

      const selectedDealerInfo = dealers.find(d => d.id === selectedDealer);
      
      toast({
        title: "성공",
        description: `${parseInt(amount).toLocaleString()}P가 ${selectedDealerInfo?.name}님에게 전달되었습니다.`,
      });

      router.push("/");
    } catch (error: unknown) {
      console.error("포인트 전달 에러:", error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "포인트 전달 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  }, [selectedDealer, amount, dealers, currentUser, toast, router]);

  return (
    <div className="container mx-auto sm:p-4 p-0">
      <div className="flex justify-between items-center mb-6 p-4 sm:p-0 border-b sm:border-0">
        <h1 className="text-xl sm:text-2xl font-bold">딜러에게 포인트 전달</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="flex items-center space-x-2"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">메인으로</span>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>딜러에게 포인트 전달</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              포인트를 전달할 딜러를 선택해주세요.
            </div>
            <Select
              value={selectedDealer}
              onValueChange={setSelectedDealer}
            >
              <SelectTrigger>
                <SelectValue placeholder="딜러 선택" />
              </SelectTrigger>
              <SelectContent>
                {dealers.map((dealer) => (
                  <SelectItem key={dealer.id} value={dealer.id}>
                    {dealer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              전달할 포인트 금액을 입력해주세요.
            </div>
            <div className="flex space-x-2">
              <Input
                type="number"
                placeholder="금액 입력"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Button 
                onClick={handlePayment}
                disabled={!selectedDealer || !amount || parseInt(amount) <= 0 || !currentUser || parseInt(amount) > currentUser.points}
              >
                <Send className="mr-2 h-4 w-4" />
                전달하기
              </Button>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <span>현재 보유 포인트:</span>
              <span className="font-medium">{currentUser?.points?.toLocaleString() || 0}P</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            * 전달된 포인트는 되돌릴 수 없습니다.
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
            >
              취소
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 