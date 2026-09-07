import type { EventSeriesKey } from "@/lib/crm/nearest-event";

// Shared between the QR check-in success screen (app/checkin/[series]/
// page.tsx) and the post-check-in recap email (lib/crm/checkin-recap-
// email.ts) - one source of truth for who's sponsoring/speaking at each
// series so the two never drift out of sync.
export type ContactCard = {
  name: string;
  role: string;
  photo: string;
  phone?: string;
  email?: string;
  // Relative, not absolute - fine as an in-app anchor href on the check-in
  // page (same origin); the email renderer prefixes it with APP_BASE_URL
  // since a link inside an email needs to be absolute.
  bookingUrl?: string;
  // CSS object-position for the circular thumbnail crop - only needed when
  // the source photo isn't a tight square headshot, so a straight center
  // crop cuts the face off-center (e.g. a tall portrait with lots of
  // hair/torso below the face). Defaults to "center" when omitted. Unused
  // by the recap email, which doesn't embed photos.
  photoPosition?: string;
};

// Caitlyn's card is identical on both series - only her "book a call" link
// differs from the other sponsors' cards, which just show contact info.
export const CAITLYN_CARD: ContactCard = {
  name: "Caitlyn Verdugo",
  role: "Realtor | Investor",
  photo: "/images/checkin/caitlyn.jpg",
  phone: "(678) 884-8494",
  email: "cv.sellshomes@gmail.com",
  bookingUrl: "/book",
};

// Who shows up in "Get in touch" on the success screen (and in the recap
// email), per series.
export const CONTACT_CARDS: Record<EventSeriesKey, ContactCard[]> = {
  house_hacking: [
    CAITLYN_CARD,
    {
      name: "Krishen Shah",
      role: "Mortgage Banker | NMLS #1958810, Highland Mortgage",
      photo: "/images/checkin/krishen.png",
      photoPosition: "center 20%",
      phone: "(706) 399-8289",
      email: "krishen.shah@highlandmtg.com",
    },
    {
      name: "Whitney Mckee",
      role: "Licensed Insurance Agent, Allstate - Lion Heart Team",
      photo: "/images/checkin/whitney.jpeg",
      photoPosition: "center 15%",
      phone: "(678) 933-9981",
      email: "whitneymckee1@allstate.com",
    },
  ],
  womens_rei: [
    CAITLYN_CARD,
    { name: "Jasmine Brown", role: "Hard Money Lender, Conventus Lending", photo: "/images/checkin/jasmine.png", phone: "(404) 789-5791", email: "jbrown@cvlending.com" },
  ],
};

// "See more events" destination per series - real Eventbrite organizer/
// event pages already in use elsewhere in her ecosystem, not guessed.
export const SERIES_EVENTS_URL: Record<EventSeriesKey, string> = {
  house_hacking: "https://www.eventbrite.com/cc/house-hacking-atl-4861227",
  womens_rei: "https://www.eventbrite.com/e/women-real-estate-investors-meetup-tickets-1990612059255",
};
