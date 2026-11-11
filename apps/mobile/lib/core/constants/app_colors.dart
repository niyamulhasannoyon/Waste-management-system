import 'package:flutter/material.dart';

/// Unified flat color palette for Clean Savar (ক্লিন সাভার).
/// Optimized for budget Android screens and bright outdoor sunlight legibility.
abstract final class AppColors {
  static const Color scaffoldBg = Color(0xFFF8FAFC);
  static const Color cardSurface = Color(0xFFFFFFFF);
  static const Color neutralSurface = Color(0xFFF1F5F9);

  static const Color border = Color(0xFFE2E8F0);
  static const Color borderStrong = Color(0xFFCBD5E1);

  static const Color primaryGreen = Color(0xFF15803D);
  static const Color primaryGreenDark = Color(0xFF14532D);
  static const Color primaryGreenTint = Color(0xFFF0FDF4);
  static const Color primaryGreenBorder = Color(0xFFBBF7D0);

  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF475569);
  static const Color textMuted = Color(0xFF64748B);

  static const Color infoBlue = Color(0xFF0284C7);
  static const Color infoBlueDark = Color(0xFF0369A1);
  static const Color infoBlueTint = Color(0xFFF0F9FF);
  static const Color infoBlueBorder = Color(0xFFBAE6FD);

  static const Color warningAmber = Color(0xFFD97706);
  static const Color warningAmberDark = Color(0xFFB45309);
  static const Color warningAmberTint = Color(0xFFFFFBEB);
  static const Color warningAmberBorder = Color(0xFFFDE68A);

  static const Color dangerRed = Color(0xFFDC2626);
  static const Color dangerRedTint = Color(0xFFFEF2F2);
  static const Color dangerRedBorder = Color(0xFFFECACA);
}
