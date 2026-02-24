import { profileData } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, MapPin, Phone, Mail, Globe, Calendar } from "lucide-react";

const ProfileDetail = () => {
  const p = profileData;

  return (
    <main>
      {/* Hero */}
      <section className="relative">
        <div className="h-48 overflow-hidden md:h-64">
          <img src={p.coverImage} alt="Cover" className="h-full w-full object-cover" />
        </div>
        <div className="container relative">
          <div className="flex flex-col items-start gap-4 pb-6 pt-0 md:flex-row md:items-end md:gap-6">
            <img
              src={p.profileImage}
              alt={p.name}
              className="-mt-16 h-32 w-32 rounded-xl border-4 border-background object-cover shadow-lg"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold md:text-3xl">{p.name}</h1>
                {p.verified && (
                  <Badge className="gap-1 bg-sage text-white">
                    <CheckCircle className="h-3 w-3" /> Verified
                  </Badge>
                )}
                {p.acceptingClients && (
                  <Badge variant="secondary">Accepting New Clients</Badge>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">{p.title}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container grid gap-8 py-8 lg:grid-cols-3">
        {/* Left - Main Content */}
        <div className="space-y-8 lg:col-span-2">
          {/* About */}
          <div>
            <h2 className="mb-3 font-display text-xl font-bold">About</h2>
            <p className="leading-relaxed text-muted-foreground">{p.about}</p>
          </div>

          {/* Services */}
          <div>
            <h2 className="mb-3 font-display text-xl font-bold">Services & Modalities</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {p.services.map((service) => (
                <li key={service} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {service}
                </li>
              ))}
            </ul>
          </div>

          {/* Gallery */}
          <div>
            <h2 className="mb-3 font-display text-xl font-bold">Gallery</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {p.gallery.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Gallery ${i + 1}`}
                  className="aspect-[4/3] rounded-lg object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* Map placeholder */}
          <Card>
            <CardContent className="p-0">
              <div className="flex h-40 items-center justify-center rounded-t-lg bg-ocean-light">
                <MapPin className="h-8 w-8 text-ocean" />
              </div>
              <div className="space-y-3 p-4">
                <p className="text-sm font-medium">{p.address}</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <a href={`tel:${p.phone}`} className="flex items-center gap-2 hover:text-foreground">
                    <Phone className="h-4 w-4" /> {p.phone}
                  </a>
                  <a href={`mailto:${p.email}`} className="flex items-center gap-2 hover:text-foreground">
                    <Mail className="h-4 w-4" /> {p.email}
                  </a>
                  <a href={p.website} className="flex items-center gap-2 hover:text-foreground" target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full gap-2" size="lg">
            <Calendar className="h-4 w-4" />
            Request Appointment
          </Button>
        </div>
      </section>
    </main>
  );
};

export default ProfileDetail;
