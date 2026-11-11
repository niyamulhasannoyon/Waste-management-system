import React from "react";

const STEPS = [
  {
    number: "০১",
    title: "তথ্য বা ছবি জমা দিন",
    description:
      "রাস্তার পাশে জমে থাকা ময়লার ছবি ও জিপিএস পিন পাঠান অথবা বাসাবাড়ির ময়লা নেওয়ার জন্য পছন্দের সময় ও বর্জ্যের ধরন বেছে নিন।",
    meta: "সময় লাগে ১ মিনিটেরও কম",
  },
  {
    number: "০২",
    title: "ওয়ার্ড টিমে দ্রুত অ্যাসাইন",
    description:
      "আপনার রিকোয়েস্টটি স্বয়ংক্রিয়ভাবে সাভার পৌরসভার নির্ধারিত ওয়ার্ড বা ইউনিয়ন পরিষদের দায়িত্বপ্রাপ্ত সুপারভাইজার ও ভ্যান টিমের কাছে পৌঁছে যায়।",
    meta: "তাৎক্ষণিক রুট সমন্বয়",
  },
  {
    number: "০৩",
    title: "সংগ্রহ ও পরিচ্ছন্নতা নিশ্চিত",
    description:
      "নির্ধারিত সময়ের মধ্যে পরিচ্ছন্নতাকর্মীরা ময়লা সংগ্রহ করে জৈব বর্জ্য কম্পোস্ট প্ল্যান্টে এবং প্লাস্টিক-কাগজ রিসাইক্লিং হাবে পাঠান।",
    meta: "লাইভ স্ট্যাটাস ট্র্যাকিং",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="border-b border-slate-200 bg-white py-12 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-[#15803D]">
            কীভাবে কাজ করে
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            ৩টি সহজ ধাপে পরিচ্ছন্ন পাড়া-মহল্লা
          </h2>
          <p className="mt-2 text-base text-slate-600">
            কোনো জটিল ধাপ নেই — নাগরিকের তথ্য সরাসরি সাভারের মাঠ পর্যায়ের
            পরিচ্ছন্নতা টিমের কাজের তালিকায় যুক্ত হয়।
          </p>
        </div>

        <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="flex flex-col justify-between rounded-lg border border-slate-300 bg-[#F8FAFC] p-6"
            >
              <div>
                <div className="flex items-baseline justify-between border-b border-slate-200 pb-4">
                  <span className="text-4xl font-bold tabular-nums tracking-tight text-[#15803D]">
                    {step.number}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {step.meta}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
