import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Shield } from "lucide-react";

const Concierge = () => {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-[hsl(220,20%,8%)] p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <Shield className="mx-auto mb-4 h-10 w-10 text-[hsl(15,65%,52%)]" />
          <h1 className="font-display text-2xl font-bold text-[hsl(35,20%,92%)]">
            Black Label Concierge Access
          </h1>
          <p className="mt-2 text-sm text-[hsl(35,10%,55%)]">
            Exclusive wellness curation for discerning clients
          </p>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2 text-left">
            <Label htmlFor="username" className="text-[hsl(35,20%,92%)]">Username</Label>
            <Input
              id="username"
              placeholder="Enter your username"
              className="border-[hsl(220,15%,18%)] bg-[hsl(220,20%,12%)] text-[hsl(35,20%,92%)] placeholder:text-[hsl(35,10%,40%)]"
            />
          </div>
          <div className="space-y-2 text-left">
            <Label htmlFor="password" className="text-[hsl(35,20%,92%)]">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="border-[hsl(220,15%,18%)] bg-[hsl(220,20%,12%)] text-[hsl(35,20%,92%)] placeholder:text-[hsl(35,10%,40%)]"
            />
          </div>
          <Button className="w-full gap-2" size="lg">
            <Lock className="h-4 w-4" />
            Secure Login
          </Button>
        </form>

        <p className="text-xs text-[hsl(35,10%,40%)]">
          Protected access. Unauthorized entry is prohibited.
        </p>
      </div>
    </div>
  );
};

export default Concierge;
