import { PaymentTabs } from "@/components/PaymentTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const benefits = [
  "Premium directory placement",
  "Enhanced profile with gallery & bio",
  "Direct booking link integration",
  "Featured in search results",
  "Monthly analytics dashboard",
  "Priority support",
];

const ListYourPractice = () => {
  return (
    <main className="container py-12">
      <h1 className="mb-2 text-center font-display text-3xl font-bold md:text-4xl">
        List Your Practice
      </h1>
      <p className="mb-10 text-center text-muted-foreground">
        Join Hawai'i's premier holistic health directory
      </p>

      <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
        {/* Order Summary */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-display">Premium Directory Listing</CardTitle>
            <p className="text-sm text-muted-foreground">Monthly subscription</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold text-primary">$39</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <hr className="border-border" />
            <ul className="space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-sage" />
                  {benefit}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentTabs />
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default ListYourPractice;
