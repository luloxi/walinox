export function Brand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt=""
        width={28}
        height={28}
        className="size-7 rounded-full"
      />
      <p className="text-sm font-semibold tracking-[0.16em] uppercase">Walinox</p>
    </div>
  );
}
