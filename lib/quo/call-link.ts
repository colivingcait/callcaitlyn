"use client";

// Opens a call through Quo's mobile app via its documented deep link, so
// calls go out from Caitlyn's business number and log through Quo
// automatically instead of her personal dialer. Deep linking is
// mobile-app-only per Quo's docs - on desktop, or if the app isn't
// installed, nothing intercepts the openphone:// scheme and the page
// just sits there, so this falls back to a plain tel: link if the tab
// hasn't been backgrounded (a sign a native app took over) within ~1.2s.
export function openQuoCall(phone: string) {
  const quoUrl = `openphone://dial?number=${encodeURIComponent(phone)}&action=call`;
  let handedOff = false;

  const onVisibilityChange = () => {
    if (document.hidden) handedOff = true;
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  window.location.href = quoUrl;

  setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (!handedOff) window.location.href = `tel:${phone}`;
  }, 1200);
}
