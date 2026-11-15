'use client';

import React from 'react';
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
      title="ক্লিন সাভার লগইন"
      description="আপনার ভূমিকা ও মোবাইল নম্বর দিয়ে Google সাইন-ইন সম্পন্ন করুন"
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
      </div>
    </NativeDialog>
  );
}
