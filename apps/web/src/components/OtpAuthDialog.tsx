'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NativeDialog } from '@/components/ui/native-dialog';
import { OtpAuthPanel } from '@/components/OtpAuthPanel';
import { useCleanSavar } from '@/context/CleanSavarContext';
import { getUserCanonicalRole } from '@/lib/rbac';

export function OtpAuthDialog() {
  const router = useRouter();
  const { authModalOpen, closeAuthModal } = useCleanSavar();

  return (
    <NativeDialog
      open={authModalOpen}
      onClose={closeAuthModal}
      title="ক্লিন সাভার — ব্যবহারকারী লগইন"
      description="নাম, মোবাইল নম্বর ও Google সাইন-ইন দিয়ে যাচাইকরণ"
    >
      <div className="space-y-4">
        <OtpAuthPanel
          onSuccess={(session) => {
            closeAuthModal();
            const canonical = getUserCanonicalRole(session.profile.user);
            if (typeof window !== 'undefined') {
              const path = window.location.pathname;
              if (canonical === 'pouro_admin' && !path.startsWith('/admin')) {
                router.push('/admin');
              } else if (canonical === 'collector' && !path.startsWith('/collector')) {
                router.push('/collector');
              } else if (canonical === 'partner' && !path.startsWith('/partner')) {
                router.push('/partner');
              }
            }
          }}
          titleId="modal-otp"
        />
        <p className="border-t border-[#E2E8F0] pt-3 text-center text-xs text-[#475569]">
          আলাদা পূর্ণ পৃষ্ঠায় যেতে চাইলে{' '}
          <Link
            href="/login"
            onClick={closeAuthModal}
            className="font-semibold text-[#15803D] underline underline-offset-2"
          >
            লগইন পেজ খুলুন
          </Link>
        </p>
      </div>
    </NativeDialog>
  );
}
