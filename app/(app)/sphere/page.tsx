import { HeartHandshake } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export default function SpherePage() {
  return (
    <ComingSoon
      title="Sphere"
      description="Past clients, referral partners, anniversaries - the people who get lost inside a general contacts list. Coming in a later phase."
      icon={HeartHandshake}
    />
  );
}
