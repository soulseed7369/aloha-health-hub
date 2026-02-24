import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Bitcoin, Copy, Zap } from "lucide-react";

export function PaymentTabs() {
  return (
    <Tabs defaultValue="card">
      <TabsList className="mb-6 w-full">
        <TabsTrigger value="card" className="flex-1 gap-2">
          <CreditCard className="h-4 w-4" />
          Credit Card
        </TabsTrigger>
        <TabsTrigger value="bitcoin" className="flex-1 gap-2">
          <Bitcoin className="h-4 w-4" />
          Bitcoin / Lightning
        </TabsTrigger>
      </TabsList>

      <TabsContent value="card" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cardNumber">Card Number</Label>
          <Input id="cardNumber" placeholder="4242 4242 4242 4242" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiry">Expiry Date</Label>
            <Input id="expiry" placeholder="MM / YY" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvc">CVC</Label>
            <Input id="cvc" placeholder="123" />
          </div>
        </div>
        <Button className="mt-4 w-full" size="lg">
          Subscribe — $39/mo
        </Button>
      </TabsContent>

      <TabsContent value="bitcoin" className="space-y-6">
        {/* QR Placeholder */}
        <div className="flex justify-center">
          <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted">
            <span className="text-sm text-muted-foreground">QR Code</span>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label>Bitcoin / Lightning Address</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value="lnurl1dp68gurn8ghj7mrww4exctt..."
              className="font-mono text-xs"
            />
            <Button variant="outline" size="icon">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button className="w-full gap-2" size="lg">
          <Zap className="h-4 w-4" />
          Pay with Lightning Wallet
        </Button>

        <Card className="border-secondary bg-secondary/30">
          <CardContent className="p-3 text-center text-xs text-muted-foreground">
            ⚡ Instant, private settlement. No middlemen. Your payment is confirmed in seconds.
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
