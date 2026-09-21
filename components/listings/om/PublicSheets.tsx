"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { SellerAnalysisSheet } from "./SellerAnalysisForm";

type Sheets = {
  bookOpen: boolean;
  sellerOpen: boolean;
  offerOpen: boolean;
  openBook: () => void;
  closeBook: () => void;
  openSeller: () => void;
  closeSeller: () => void;
  openOffer: () => void;
  closeOffer: () => void;
};

const SheetsContext = createContext<Sheets | null>(null);

export function usePublicSheets() {
  return useContext(SheetsContext);
}

export function PublicSheetsProvider({ children }: { children: React.ReactNode }) {
  const [bookOpen, setBookOpen] = useState(false);
  const [sellerOpen, setSellerOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);

  useEffect(() => {
    const locked = bookOpen || sellerOpen || offerOpen;
    const previous = document.body.style.overflow;
    if (locked) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [bookOpen, sellerOpen, offerOpen]);

  const value = useMemo<Sheets>(
    () => ({
      bookOpen,
      sellerOpen,
      offerOpen,
      openBook: () => {
        setSellerOpen(false);
        setOfferOpen(false);
        setBookOpen(true);
      },
      closeBook: () => setBookOpen(false),
      openSeller: () => {
        setBookOpen(false);
        setOfferOpen(false);
        setSellerOpen(true);
      },
      closeSeller: () => setSellerOpen(false),
      openOffer: () => {
        setBookOpen(false);
        setSellerOpen(false);
        setOfferOpen(true);
      },
      closeOffer: () => setOfferOpen(false),
    }),
    [bookOpen, sellerOpen, offerOpen],
  );

  return (
    <SheetsContext.Provider value={value}>
      {children}
      {sellerOpen && <SellerAnalysisSheet onClose={() => setSellerOpen(false)} />}
      {bookOpen && (
        <div
          role="presentation"
          data-om-noprint
          style={{ position: "fixed", inset: 0, zIndex: 61, background: "rgba(23,19,17,0.62)", display: "flex", alignItems: "flex-end" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setBookOpen(false);
          }}
        >
          <div style={{ width: "100%", maxHeight: "100%", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            {/* BookingFlow's slug is an 8-character booking link, not the
                listing slug. The sheet uses the same generic calendar as /book. */}
            <BookingFlow slug={null} presentation="sheet" onClose={() => setBookOpen(false)} />
          </div>
        </div>
      )}
    </SheetsContext.Provider>
  );
}

const bookButtonStyle: React.CSSProperties = { cursor: "pointer", font: "inherit" };

export function BookCallButton({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const sheets = usePublicSheets();
  return (
    <>
      <Link href="/book" className={`om-book-link ${className ?? ""}`} style={style}>
        {children}
      </Link>
      <button type="button" className={`om-book-sheet ${className ?? ""}`} style={{ ...bookButtonStyle, ...style }} onClick={() => sheets?.openBook()}>
        {children}
      </button>
    </>
  );
}

export function SellerAnalysisButton({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const sheets = usePublicSheets();
  return (
    <button type="button" className={className} style={{ ...bookButtonStyle, ...style }} onClick={() => sheets?.openSeller()}>
      {children}
    </button>
  );
}
