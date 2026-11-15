import { isAllowedDevEmail } from './dev-store';

export type { UserRole } from './types';

export type CanonicalRole =
  | 'citizen'
  | 'pouro_admin'
  | 'collector'
  | 'partner'
  | 'developer';

export interface NavItemConfig {
  href: string;
  label: string;
}

export interface RouteAccessResult {
  allowed: boolean;
  role: CanonicalRole;
  titleBn: string;
  reasonBn: string;
  redirectHref: string;
  actionLabelBn: string;
}

/**
 * Normalizes any role representation into one of the 5 canonical roles:
 * - 'citizen': General citizens and unauthenticated public users
 * - 'pouro_admin': Municipal administration, supervisors, and officers
 * - 'collector': Field drivers, cleaners, and waste collection staff
 * - 'partner': Registered private recycling facilities and scrap hubs
 * - 'developer': System engineering & super administration
 */
export function normalizeRole(role?: string | null): CanonicalRole {
  if (!role) return 'citizen';
  const clean = role.trim().toLowerCase();

  if (
    clean === 'pouro_admin' ||
    clean === 'admin' ||
    clean === 'পৌর অ্যাডমিন' ||
    clean === 'অ্যাডমিন'
  ) {
    return 'pouro_admin';
  }

  if (
    clean === 'collector' ||
    clean === 'cleaner' ||
    clean === 'সংগ্রহকারী' ||
    clean === 'পরিচ্ছন্নতাকর্মী'
  ) {
    return 'collector';
  }

  if (
    clean === 'partner' ||
    clean === 'রিসাইক্লিং পার্টনার' ||
    clean === 'পার্টনার'
  ) {
    return 'partner';
  }

  if (
    clean === 'developer' ||
    clean === 'super_admin' ||
    clean === 'dev' ||
    clean === 'ডেভেলপার' ||
    clean === 'সুপার অ্যাডমিন'
  ) {
    return 'developer';
  }

  return 'citizen';
}

/**
 * Checks if the given user has verified developer / super_admin credentials.
 * Only developer accounts and explicitly whitelisted emails can access dev tools.
 */
export function isDeveloperUser(
  user?: { role?: string | null; email?: string | null } | null,
): boolean {
  if (!user) return false;
  if (isAllowedDevEmail(user.email)) return true;
  const role = (user.role || '').trim().toLowerCase();
  return role === 'developer' || role === 'super_admin';
}

/**
 * Returns the effective canonical role for a user.
 */
export function getUserCanonicalRole(
  user?: { role?: string | null; email?: string | null } | null,
): CanonicalRole {
  if (!user) return 'citizen';
  if (isDeveloperUser(user)) return 'developer';
  return normalizeRole(user.role);
}

export function isPouroAdminUser(
  user?: { role?: string | null; email?: string | null } | null,
): boolean {
  if (!user) return false;
  if (isDeveloperUser(user)) return false;
  return normalizeRole(user.role) === 'pouro_admin';
}

export function isCollectorUser(
  user?: { role?: string | null; email?: string | null } | null,
): boolean {
  if (!user) return false;
  if (isDeveloperUser(user)) return false;
  return normalizeRole(user.role) === 'collector';
}

export function isPartnerUser(
  user?: { role?: string | null; email?: string | null } | null,
): boolean {
  if (!user) return false;
  if (isDeveloperUser(user)) return false;
  return normalizeRole(user.role) === 'partner';
}

export function isCitizenUser(
  user?: { role?: string | null; email?: string | null } | null,
): boolean {
  if (!user) return true;
  if (isDeveloperUser(user)) return false;
  return normalizeRole(user.role) === 'citizen';
}

/**
 * Retrieves the strict navigation links per role according to the visibility matrix.
 */
export function getNavItemsForUser(
  user?: { role?: string | null; email?: string | null } | null,
): readonly NavItemConfig[] {
  const canonical = getUserCanonicalRole(user);

  switch (canonical) {
    case 'pouro_admin':
      return [
        { href: '/', label: 'হোম' },
        { href: '/admin', label: 'অ্যাডমিন প্যানেল' },
      ];

    case 'collector':
      return [
        { href: '/collector', label: 'কালেক্টর ড্যাশবোর্ড' },
      ];

    case 'partner':
      return [
        { href: '/partner', label: 'পার্টনার ড্যাশবোর্ড' },
      ];

    case 'developer':
      return [
        { href: '/', label: 'হোম' },
        { href: '/admin', label: 'অ্যাডমিন' },
        { href: '/collector', label: 'কালেক্টর' },
        { href: '/partner', label: 'পার্টনার' },
      ];

    case 'citizen':
    default:
      return [
        { href: '/', label: 'হোম' },
        { href: '/pickup', label: 'পিকআপ' },
        { href: '/report', label: 'ছবি দিন' },
        { href: '/track', label: 'ট্র্যাক' },
        { href: '/download', label: 'অ্যাপ ডাউনলোড' },
      ];
  }
}

/**
 * Determines whether the top-right / drawer "অ্যাডমিন প্যানেল" button should render.
 */
export function shouldShowAdminPanelButton(
  user?: { role?: string | null; email?: string | null } | null,
): boolean {
  if (!user) return false;
  const canonical = getUserCanonicalRole(user);
  return canonical === 'pouro_admin' || canonical === 'developer';
}

/**
 * Determines whether the "দেব কনসোল" button should render.
 * STRICT: Only Developer / Super Admin can see this.
 * Pouro Admin must NEVER see this button.
 */
export function shouldShowDevConsoleButton(
  user?: { role?: string | null; email?: string | null } | null,
): boolean {
  if (!user) return false;
  return isDeveloperUser(user);
}

/**
 * Determines whether the standalone "অ্যাপ ডাউনলোড" button should render on header right.
 */
export function shouldShowDownloadButton(
  user?: { role?: string | null; email?: string | null } | null,
): boolean {
  const canonical = getUserCanonicalRole(user);
  return canonical === 'citizen' || canonical === 'developer';
}

/**
 * Enforces route-level access rules so users cannot manually type unauthorized URLs in the address bar.
 */
export function checkRouteAccess(
  pathname: string,
  user?: { role?: string | null; email?: string | null; full_name?: string } | null,
): RouteAccessResult {
  const canonical = getUserCanonicalRole(user);
  const normalizedPath = pathname.replace(/\/$/, '') || '/';

  // 1. Dev Console Routes: /dev, /dev-admin
  if (normalizedPath === '/dev' || normalizedPath.startsWith('/dev-admin')) {
    if (canonical === 'developer') {
      return {
        allowed: true,
        role: canonical,
        titleBn: '',
        reasonBn: '',
        redirectHref: '/dev-admin',
        actionLabelBn: '',
      };
    }
    if (canonical === 'pouro_admin') {
      return {
        allowed: false,
        role: canonical,
        titleBn: 'প্রবেশাধিকার সংরক্ষিত — দেব কনসোল',
        reasonBn:
          'দেব কনসোল (Dev Console) শুধুমাত্র সিস্টেম ইঞ্জিনিয়ার ও সুপার অ্যাডমিনদের জন্য নির্ধারিত। পৌর অ্যাডমিনদের এখানে প্রবেশের অনুমতি নেই।',
        redirectHref: '/admin',
        actionLabelBn: 'পৌর অ্যাডমিন প্যানেলে ফিরে যান',
      };
    }
    if (canonical === 'collector') {
      return {
        allowed: false,
        role: canonical,
        titleBn: 'প্রবেশাধিকার সংরক্ষিত — দেব কনসোল',
        reasonBn:
          'দেব কনসোল শুধুমাত্র সিস্টেম ইঞ্জিনিয়ারদের জন্য নির্ধারিত। মাঠপর্যায়ের কাজের জন্য কালেক্টর ওয়ার্কস্পেসে ফিরে যান।',
        redirectHref: '/collector',
        actionLabelBn: 'কালেক্টর ড্যাশবোর্ডে ফিরে যান',
      };
    }
    if (canonical === 'partner') {
      return {
        allowed: false,
        role: canonical,
        titleBn: 'প্রবেশাধিকার সংরক্ষিত — দেব কনসোল',
        reasonBn:
          'দেব কনসোল শুধুমাত্র সিস্টেম ইঞ্জিনিয়ারদের জন্য নির্ধারিত। আপনার কাজের জন্য পার্টনার ড্যাশবোর্ডে ফিরে যান।',
        redirectHref: '/partner',
        actionLabelBn: 'পার্টনার ড্যাশবোর্ডে ফিরে যান',
      };
    }
    // Unauthenticated: if attempting direct /dev or /dev-admin, let DevAuthGate prompt or block if guest
    return {
      allowed: true,
      role: canonical,
      titleBn: '',
      reasonBn: '',
      redirectHref: '/dev-admin',
      actionLabelBn: '',
    };
  }

  // 2. Pouro Admin Routes: /admin
  if (normalizedPath === '/admin' || normalizedPath.startsWith('/admin/')) {
    if (canonical === 'pouro_admin' || canonical === 'developer') {
      return {
        allowed: true,
        role: canonical,
        titleBn: '',
        reasonBn: '',
        redirectHref: '/admin',
        actionLabelBn: '',
      };
    }
    if (!user) {
      // Allow AuthGateCard to present the admin sign-in UI
      return {
        allowed: true,
        role: canonical,
        titleBn: '',
        reasonBn: '',
        redirectHref: '/admin',
        actionLabelBn: '',
      };
    }
    if (canonical === 'collector') {
      return {
        allowed: false,
        role: canonical,
        titleBn: 'অননুমোদিত প্রবেশাধিকার',
        reasonBn:
          'সাভার পৌরসভা অ্যাডমিন কমান্ড প্যানেল শুধুমাত্র পৌর অ্যাডমিনদের জন্য নির্ধারিত। আপনি বর্তমানে পরিচ্ছন্নতাকর্মী/কালেক্টর হিসেবে লগইন আছেন।',
        redirectHref: '/collector',
        actionLabelBn: 'আমার কালেক্টর ওয়ার্কস্পেসে যান',
      };
    }
    if (canonical === 'partner') {
      return {
        allowed: false,
        role: canonical,
        titleBn: 'অননুমোদিত প্রবেশাধিকার',
        reasonBn:
          'সাভার পৌরসভা অ্যাডমিন কমান্ড প্যানেল শুধুমাত্র পৌর অ্যাডমিনদের জন্য নির্ধারিত। আপনি বর্তমানে রিসাইক্লিং পার্টনার হিসেবে লগইন আছেন।',
        redirectHref: '/partner',
        actionLabelBn: 'আমার পার্টনার ড্যাশবোর্ডে যান',
      };
    }
    return {
      allowed: false,
      role: canonical,
      titleBn: 'পৌর অ্যাডমিন লগইন প্রয়োজন',
      reasonBn:
        'সাভার পৌরসভা সার্বিক অপারেশন ও ডিসপ্যাচ কমান্ড প্যানেলে প্রবেশের জন্য পৌর অ্যাডমিন অ্যাকাউন্ট দিয়ে লগইন করুন। সাধারণ নাগরিক অ্যাকাউন্টে এখানে প্রবেশ নিষিদ্ধ।',
      redirectHref: '/',
      actionLabelBn: 'হোম পেজে যান',
    };
  }

  // 3. Collector Routes: /collector
  if (normalizedPath === '/collector' || normalizedPath.startsWith('/collector/')) {
    if (canonical === 'collector' || canonical === 'developer') {
      return {
        allowed: true,
        role: canonical,
        titleBn: '',
        reasonBn: '',
        redirectHref: '/collector',
        actionLabelBn: '',
      };
    }
    if (!user) {
      // Allow AuthGateCard to present collector sign-in UI
      return {
        allowed: true,
        role: canonical,
        titleBn: '',
        reasonBn: '',
        redirectHref: '/collector',
        actionLabelBn: '',
      };
    }
    if (canonical === 'pouro_admin') {
      return {
        allowed: false,
        role: canonical,
        titleBn: 'মাঠপর্যায়ের কালেক্টর পোর্টাল',
        reasonBn:
          'কালেক্টর পোর্টালটি সরাসরি ফিল্ড পরিচ্ছন্নতাকর্মীদের পিকআপ আপডেট ও গাড়ির জিপিএস অপারেশনের জন্য। পৌর অ্যাডমিনদের জন্য সেন্ট্রাল কমান্ড প্যানেলে ফ্লিট মনিটরিং রয়েছে।',
        redirectHref: '/admin',
        actionLabelBn: 'পৌর অ্যাডমিন প্যানেলে ফিরে যান',
      };
    }
    if (canonical === 'partner') {
      return {
        allowed: false,
        role: canonical,
        titleBn: 'অননুমোদিত প্রবেশাধিকার',
        reasonBn:
          'কালেক্টর পোর্টালটি শুধুমাত্র মাঠপর্যায়ের কর্মীদের জন্য নির্ধারিত। আপনার নিজস্ব কাজের জন্য রিসাইক্লিং পার্টনার মার্কেটপ্লেসে যান।',
        redirectHref: '/partner',
        actionLabelBn: 'পার্টনার মার্কেটপ্লেসে যান',
      };
    }
    return {
      allowed: false,
      role: canonical,
      titleBn: 'সংগ্রহকারী অ্যাকাউন্ট দিয়ে প্রবেশ করুন',
      reasonBn:
        'মাঠপর্যায়ের টাস্ক দেখা ও সম্পন্ন হিসেবে চিহ্নিত করতে অনুমোদিত সংগ্রহকারী বা ড্রাইভার মোবাইল দিয়ে লগইন করুন।',
      redirectHref: '/',
      actionLabelBn: 'হোম পেজে যান',
    };
  }

  // 4. Partner Routes: /partner
  if (normalizedPath === '/partner' || normalizedPath.startsWith('/partner/')) {
    if (canonical === 'partner' || canonical === 'developer') {
      return {
        allowed: true,
        role: canonical,
        titleBn: '',
        reasonBn: '',
        redirectHref: '/partner',
        actionLabelBn: '',
      };
    }
    if (!user) {
      // Allow AuthGateCard to present partner sign-in UI
      return {
        allowed: true,
        role: canonical,
        titleBn: '',
        reasonBn: '',
        redirectHref: '/partner',
        actionLabelBn: '',
      };
    }
    if (canonical === 'collector') {
      return {
        allowed: false,
        role: canonical,
        titleBn: 'অননুমোদিত প্রবেশাধিকার',
        reasonBn:
          'রিসাইক্লিং পার্টনার মার্কেটপ্লেস শুধুমাত্র অনুমোদিত রিসাইক্লিং হাব ও পার্টনারদের জন্য। মাঠপর্যায়ের কাজের জন্য আপনার কালেক্টর পোর্টালে যান।',
        redirectHref: '/collector',
        actionLabelBn: 'কালেক্টর ওয়ার্কস্পেসে ফিরে যান',
      };
    }
    if (canonical === 'pouro_admin') {
      return {
        allowed: false,
        role: canonical,
        titleBn: 'রিসাইক্লিং পার্টনার মার্কেটপ্লেস',
        reasonBn:
          'রিসাইক্লিং পার্টনার মার্কেটপ্লেসটি পার্টনারদের সেকেন্ডারি লট ইনটেকের জন্য। পৌর অ্যাডমিনদের জন্য অ্যাডমিন প্যানেলে রিসাইক্লিং লট ও ওজন সারসংক্ষেপ রয়েছে।',
        redirectHref: '/admin',
        actionLabelBn: 'পৌর অ্যাডমিন প্যানেলে ফিরে যান',
      };
    }
    return {
      allowed: false,
      role: canonical,
      titleBn: 'অনুমোদিত রিসাইক্লিং পার্টনার লগইন প্রয়োজন',
      reasonBn:
        'লট তালিকা দেখতে এবং সংগ্রহের জন্য বুক করতে অনুমোদিত রিসাইক্লিং পার্টনার অ্যাকাউন্ট দিয়ে লগইন করুন।',
      redirectHref: '/',
      actionLabelBn: 'হোম পেজে যান',
    };
  }

  // 5. Citizen-Only Submission Routes: /pickup, /report
  if (
    normalizedPath === '/pickup' ||
    normalizedPath.startsWith('/pickup/') ||
    normalizedPath === '/report' ||
    normalizedPath.startsWith('/report/')
  ) {
    if (canonical === 'citizen' || canonical === 'developer') {
      return {
        allowed: true,
        role: canonical,
        titleBn: '',
        reasonBn: '',
        redirectHref: pathname,
        actionLabelBn: '',
      };
    }
    if (canonical === 'pouro_admin') {
      return {
        allowed: false,
        role: canonical,
        titleBn: 'নাগরিক সেবা পোর্টাল',
        reasonBn:
          'পিকআপ অনুরোধ ও ময়লার স্তূপ রিপোর্টের এই ফর্মটি সাধারণ নাগরিকদের জন্য নির্ধারিত। আপনি বর্তমানে পৌর অ্যাডমিন হিসেবে সাইন ইন আছেন।',
        redirectHref: '/admin',
        actionLabelBn: 'পৌর অ্যাডমিন প্যানেলে ফিরে যান',
      };
    }
    if (canonical === 'collector') {
      return {
        allowed: false,
        role: canonical,
        titleBn: 'নাগরিক সেবা পোর্টাল',
        reasonBn:
          'এই ফর্মটি সাধারণ নাগরিকদের জন্য নির্ধারিত। আপনি বর্তমানে মাঠপর্যায়ের সংগ্রাহক/পরিচ্ছন্নতাকর্মী হিসেবে সাইন ইন আছেন।',
        redirectHref: '/collector',
        actionLabelBn: 'কালেক্টর ওয়ার্কস্পেসে ফিরে যান',
      };
    }
    if (canonical === 'partner') {
      return {
        allowed: false,
        role: canonical,
        titleBn: 'নাগরিক সেবা পোর্টাল',
        reasonBn:
          'এই ফর্মটি সাধারণ নাগরিকদের জন্য নির্ধারিত। আপনি বর্তমানে রিসাইক্লিং পার্টনার হিসেবে সাইন ইন আছেন।',
        redirectHref: '/partner',
        actionLabelBn: 'পার্টনার ড্যাশবোর্ডে ফিরে যান',
      };
    }
  }

  // 6. Public routes: /, /track, /download, /login
  return {
    allowed: true,
    role: canonical,
    titleBn: '',
    reasonBn: '',
    redirectHref: pathname,
    actionLabelBn: '',
  };
}
