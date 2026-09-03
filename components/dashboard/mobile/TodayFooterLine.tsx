export function TodayFooterLine({
  totalActive,
  hotCount,
  underContractCount,
  underContractNet,
}: {
  totalActive: number;
  hotCount: number;
  underContractCount: number;
  underContractNet: number;
}) {
  return (
    <p className="mt-5 pb-4 pr-[140px] text-[14px] text-neutral-400">
      {totalActive} active · {hotCount} hot · {underContractCount} under contract · $
      {Math.round(underContractNet).toLocaleString()} projected
    </p>
  );
}
