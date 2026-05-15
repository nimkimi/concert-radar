// Temporary design-system render check. Issue #5 will replace this
// file with the real landing page.

import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { ConcertCard } from "@/components/ConcertCard";
import { SourceBadge } from "@/components/SourceBadge";

export default function Home() {
  return (
    <>
      <AppNav activeHref="/dashboard" userName="Kristoffer" />
      <main className="cr-frame py-12 flex flex-col gap-10">
        <header>
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-(--color-spotify) mb-3">
            Design system · render check
          </p>
          <h1
            className="font-black uppercase leading-[0.85] tracking-[-0.05em]"
            style={{ fontSize: "var(--text-display)" }}
          >
            Festival-poster
            <br />
            <span className="text-(--color-spotify)">maximalism</span>.
          </h1>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Buttons</h2>
          <div className="flex gap-3 flex-wrap items-center">
            <Button variant="spotify">Connect with Spotify</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Chips</h2>
          <div className="flex gap-2 flex-wrap">
            <Chip>Default</Chip>
            <Chip variant="accent">Within 100km</Chip>
            <Chip>This weekend</Chip>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Source badges</h2>
          <div className="flex gap-2 flex-wrap">
            <SourceBadge source="TICKETMASTER" />
            <SourceBadge source="BANDSINTOWN" />
            <SourceBadge source="SONGKICK" />
            <SourceBadge source="BILLETTO" />
            <SourceBadge source="TICKETMASTER" size="full" />
          </div>
        </section>

        <section className="flex flex-col gap-4 pb-20">
          <h2 className="text-xl font-bold">Concert card</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <ConcertCard
              imageUrl="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800"
              artistName="Aurora"
              venueName="USF Verftet"
              city="Bergen"
              time="Fri Jun 14 · 21:00 CET"
              distanceLabel="2.3 km"
              sources={["TICKETMASTER", "BANDSINTOWN"]}
            />
            <ConcertCard
              imageUrl="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800"
              artistName="Honningbarna"
              venueName="Røkeriet"
              city="Bergen"
              time="Fri Jun 14 · 22:30"
              distanceLabel="0.8 km"
              sources={["BANDSINTOWN"]}
            />
            <ConcertCard
              imageUrl="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800"
              artistName="Røyksopp"
              venueName="Sentrum Scene"
              city="Oslo"
              time="Sat Jun 22 · 20:00 CET"
              distanceLabel="312 km"
              sources={["TICKETMASTER"]}
            />
          </div>
        </section>
      </main>
    </>
  );
}
