import { listAgentRecruits } from "@/lib/data/agent-recruits";
import { RecruitBoard } from "@/components/recruiting/RecruitBoard";

export default async function RecruitingPage() {
  const recruits = await listAgentRecruits();

  return (
    <div>
      <div className="px-4 pt-6 pb-4 md:px-6">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900 sm:text-[28px]">Agent recruiting</h1>
        <p className="mt-1 text-[15px] leading-[22px] text-neutral-500">
          Everyone tagged &quot;Agent&quot; - track who&apos;s moving toward joining the office and the referral fee that comes with it.
        </p>
      </div>
      <RecruitBoard recruits={recruits} />
    </div>
  );
}
