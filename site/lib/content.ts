// Real stats/reviews/service-area data pulled from Caitlyn's own
// colivingcait.com (her existing public Zillow reviews and service
// counties) - not fabricated, just reused here.

export const STATS = ["7 Years Experience", "5.0 Zillow", "Top Realtor in DeKalb County"];

export const TESTIMONIALS = [
  {
    quote:
      "Caitlyn made the entire process seamless. She knew exactly what to look for and guided us through every step. I wouldn't work with anyone else.",
    source: "Zillow Review",
  },
  {
    quote:
      "Her knowledge of investment properties is unmatched. She helped me see potential in a property I would have passed on — and it turned out to be my best deal.",
    source: "Zillow Review",
  },
  {
    quote: "Professional, responsive, and genuinely invested in my success. Caitlyn goes above and beyond for every client.",
    source: "Zillow Review",
  },
  {
    quote:
      "I came in with a vague idea about real estate investing. Caitlyn helped me build a clear plan and execute on it. Can't recommend her enough.",
    source: "Zillow Review",
  },
] as const;

// Glyphs match the design system's icon set (no icon library - section 8
// of DESIGNSYSTEM.md): ◈ $ ⌂ ♀ ★ ✦ ⊕, rendered in the heading font, gold.
export const DIFFERENTIATORS = [
  {
    glyph: "◈",
    title: "Investor Mindset",
    body: "I evaluate every property the way I'd evaluate it for my own portfolio — not just the listing sheet.",
  },
  {
    glyph: "⌂",
    title: "Renovation Knowledge",
    body: "I know what work costs, what adds value, and what to walk away from before you're in too deep.",
  },
  {
    glyph: "✦",
    title: "Coliving Expertise",
    body: "I specialize in identifying properties with coliving conversion potential that most agents overlook entirely.",
  },
  {
    glyph: "$",
    title: "Sharp Negotiation",
    body: "Whether you're buying or selling, I protect your bottom line at every stage of the transaction.",
  },
  {
    glyph: "⊕",
    title: "Full Transaction Support",
    body: "Contract to close — inspections, appraisal, title, repairs, and closing coordination handled.",
  },
] as const;

export const BUYER_ITEMS = [
  {
    title: "House Hacking",
    description: "Live for free (or close to it) while your residents cover your mortgage. The smartest first move most investors can make.",
  },
  {
    title: "Coliving Conversions",
    description: "Properties with coliving conversion potential. I know what to look for: room count, layout, parking, and the hidden spaces most people walk right past.",
  },
  {
    title: "Occupied Coliving Properties",
    description: "Already-operating coliving homes come with unique complexities. I help you navigate the nuances of occupied transactions so nothing falls through the cracks.",
  },
  {
    title: "Other Investment Properties",
    description: "Single-family rentals, small multifamily, and buy-and-hold properties with strong cashflow and appreciation potential.",
  },
] as const;

export const SELLER_ITEMS = [
  {
    title: "Full-Service Listing",
    description: "Market analysis, pricing strategy, staging guidance, professional marketing, and full MLS exposure.",
  },
  {
    title: "Transaction Management",
    description: "Contract to close handled for you: inspections, appraisal, title, repairs, and closing coordination.",
  },
  {
    title: "Negotiation",
    description: "I protect your bottom line at every stage, from initial offers through repairs and final walkthrough.",
  },
  {
    title: "Alternative Strategies",
    description: "Not sure selling is the right move? Explore leasing your property for coliving arbitrage or getting a property management referral first.",
  },
] as const;

export const SERVICE_AREAS = [
  {
    county: "DeKalb County",
    cities: ["Decatur", "Stone Mountain", "Lithonia", "Tucker", "Clarkston", "Avondale Estates", "Scottdale", "Redan", "Ellenwood", "Pine Lake", "Chamblee", "Dunwoody", "Brookhaven"],
  },
  {
    county: "Gwinnett County",
    cities: ["Snellville", "Lawrenceville", "Lilburn", "Loganville", "Norcross", "Duluth", "Suwanee", "Buford", "Grayson", "Dacula", "Peachtree Corners"],
  },
  {
    county: "Fulton County",
    cities: ["Atlanta", "East Point", "College Park", "Hapeville", "Fairburn", "Palmetto", "Union City", "Roswell", "Alpharetta", "Sandy Springs", "Johns Creek"],
  },
] as const;
