export function SiteFooter() {
  return (
    <footer className="overflow-hidden bg-white px-5 pb-0 pt-12 sm:px-8 sm:pt-16 lg:px-11">
      <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-7 gap-y-3 text-[16px] leading-[0.8] tracking-[-0.03em] text-black/55">
          <a href="/#about" className="transition-colors hover:text-black">About</a>
          <a href="/#product" className="transition-colors hover:text-black">Product</a>
          <a href="/#pricing" className="transition-colors hover:text-black">Pricing</a>
          <a href="/#terms" className="transition-colors hover:text-black">Terms of Use</a>
          <a href="/#privacy" className="transition-colors hover:text-black">Privacy Policy</a>
        </nav>
        <p className="shrink-0 text-[16px] leading-[0.8] tracking-[-0.03em] text-black/55">
          (C) &amp; TM 2026 Paperbag
        </p>
      </div>

      <div className="mt-8 sm:mt-10" aria-hidden="true">
        <img src="/paperbag-wordmark-grey.svg" alt="" className="block h-auto w-full select-none" />
      </div>
    </footer>
  );
}
