"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

interface TableSettings {
  seats: number;
  isActive: boolean;
}

export default function TableSetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    blackTable: { seats: 9, isActive: true } as TableSettings,
    blueTable: { seats: 9, isActive: true } as TableSettings,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.blackTable.isActive && !formData.blueTable.isActive) {
      toast({
        title: "설정 오류",
        description: "최소 하나의 테이블은 활성화되어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/tables/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blackTableSeats: formData.blackTable.isActive ? formData.blackTable.seats : 0,
          blueTableSeats: formData.blueTable.isActive ? formData.blueTable.seats : 0,
        }),
      });

      if (!response.ok) {
        throw new Error("테이블 설정에 실패했습니다.");
      }

      toast({
        title: "테이블 설정 완료",
        description: "자리 배정을 시작할 수 있습니다.",
      });

      router.push("/seat-assignment");
    } catch (error) {
      toast({
        title: "설정 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-lg mx-auto p-4">
      <div className="flex justify-between items-center mb-6 p-4 sm:p-0 border-b sm:border-0">
        <h1 className="text-xl sm:text-2xl font-bold">테이블 설정</h1>
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
          <CardTitle>포커 테이블 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="blackTableActive">Black 테이블 활성화</Label>
                <Switch
                  id="blackTableActive"
                  checked={formData.blackTable.isActive}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({
                      ...prev,
                      blackTable: { ...prev.blackTable, isActive: checked }
                    }))
                  }
                />
              </div>
              {formData.blackTable.isActive && (
                <div className="space-y-2">
                  <Label htmlFor="blackTableSeats">Black 테이블 좌석 수</Label>
                  <Input
                    id="blackTableSeats"
                    type="number"
                    min="2"
                    max="10"
                    required
                    value={formData.blackTable.seats}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        blackTable: { ...prev.blackTable, seats: parseInt(e.target.value) }
                      }))
                    }
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="blueTableActive">Blue 테이블 활성화</Label>
                <Switch
                  id="blueTableActive"
                  checked={formData.blueTable.isActive}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({
                      ...prev,
                      blueTable: { ...prev.blueTable, isActive: checked }
                    }))
                  }
                />
              </div>
              {formData.blueTable.isActive && (
                <div className="space-y-2">
                  <Label htmlFor="blueTableSeats">Blue 테이블 좌석 수</Label>
                  <Input
                    id="blueTableSeats"
                    type="number"
                    min="2"
                    max="10"
                    required
                    value={formData.blueTable.seats}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        blueTable: { ...prev.blueTable, seats: parseInt(e.target.value) }
                      }))
                    }
                  />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full">
              테이블 설정하기
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 