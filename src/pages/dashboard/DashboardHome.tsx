import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Building, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  {
    title: "Practitioner Profile",
    icon: User,
    description: "List your individual practice, bio, and modalities.",
    button: "Manage Profile",
    to: "/dashboard/profile",
    color: "bg-terracotta-light text-terracotta",
  },
  {
    title: "Centers & Spas",
    icon: Building,
    description: "Manage listings for physical clinics, spas, or shared wellness spaces.",
    button: "Manage Centers",
    to: "/dashboard/centers",
    color: "bg-secondary text-secondary-foreground",
  },
  {
    title: "Retreats & Events",
    icon: Calendar,
    description: "Publish upcoming time-bound retreats or workshops.",
    button: "Manage Retreats",
    to: "/dashboard/retreats",
    color: "bg-ocean-light text-ocean",
  },
];

export default function DashboardHome() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Welcome to your Provider Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          What would you like to manage today? Each section is independent — choose only what applies to you.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {actions.map((a) => (
          <Card
            key={a.title}
            className="group relative overflow-hidden transition-shadow hover:shadow-md"
          >
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <div className={`rounded-xl p-3 ${a.color}`}>
                <a.icon className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-lg font-semibold">{a.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {a.description}
                </p>
              </div>
              <Button asChild className="mt-auto w-full" variant="outline">
                <Link to={a.to}>{a.button}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
