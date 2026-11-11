export function SiteFooter() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-white py-5">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-sm text-[#475569] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          ক্লিন সাভার — সাভার পৌরসভা বর্জ্য ব্যবস্থাপনা ও নাগরিক সেবা পোর্টাল
        </p>
        <p className="font-mixed">
          জরুরি হেল্পলাইন:{' '}
          <span lang="en" className="font-metric font-semibold text-[#0F172A]">
            01711-240100
          </span>{' '}
          (সকাল ৭টা – রাত ৯টা)
        </p>
      </div>
    </footer>
  );
}
