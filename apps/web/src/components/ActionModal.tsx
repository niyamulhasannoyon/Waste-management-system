"use client";

import React from "react";
import { useCleanSavar } from "@/context/CleanSavarContext";
import { ModalDialog } from "./ModalDialog";
import { PickupRequestForm, ReportWasteForm } from "./ActionForms";

export function ActionModal() {
  const { actionModalKind, openActionModal, closeActionModal } = useCleanSavar();

  const isReport = actionModalKind === "report";
  const title = isReport
    ? "রাস্তার ময়লা বা অব্যবস্থাপনার অভিযোগ জানান"
    : "বাসা থেকে ময়লা সংগ্রহের পিকআপ রিকোয়েস্ট";
  const subtitle = isReport
    ? "এলাকা, ময়লার ধরন ও ছবি দিলে সাভার পৌরসভার নিকটস্থ টিম দ্রুত ব্যবস্থা নেবে।"
    : "বাসার ঠিকানা ও পছন্দের সময় নির্ধারণ করুন — নির্ধারিত ভ্যান আপনার এলাকায় পৌঁছাবে।";

  return (
    <ModalDialog
      open={actionModalKind !== null}
      onClose={closeActionModal}
      title={title}
      subtitle={subtitle}
      maxWidthClass="max-w-2xl"
    >
      <div className="mb-4 flex gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => openActionModal("report")}
          aria-pressed={isReport}
          className={`min-h-[38px] rounded border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            isReport
              ? "border-[#15803D] bg-[#15803D] text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          ময়লার রিপোর্ট করুন
        </button>
        <button
          type="button"
          onClick={() => openActionModal("pickup")}
          aria-pressed={!isReport}
          className={`min-h-[38px] rounded border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            !isReport
              ? "border-[#15803D] bg-[#15803D] text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          বাসা থেকে ময়লা সংগ্রহ
        </button>
      </div>

      {isReport ? (
        <ReportWasteForm idPrefix="modal" onSuccessCloseModal={closeActionModal} />
      ) : (
        <PickupRequestForm idPrefix="modal" onSuccessCloseModal={closeActionModal} />
      )}
    </ModalDialog>
  );
}
