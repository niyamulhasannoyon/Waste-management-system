import 'package:flutter/widgets.dart' show Color, BoxShadow, Offset;

/// Modern, cohesive design tokens & color palette for Clean Savar (ক্লিন সাভার).
/// Designed for professional municipal civic tech, extreme sunlight legibility,
/// and smooth visual hierarchy.
abstract final class AppColors {
  // Background & Surfaces
  static const Color scaffoldBg = Color(0xFFF8FAFC);
  static const Color cardSurface = Color(0xFFFFFFFF);
  static const Color neutralSurface = Color(0xFFF1F5F9);
  static const Color neutralSurfaceDark = Color(0xFFE2E8F0);

  // Hairline & Structural Borders
  static const Color border = Color(0xFFE2E8F0);
  static const Color borderStrong = Color(0xFFCBD5E1);

  // Eco Emerald Primary Brand Colors
  static const Color primaryGreen = Color(0xFF059669); // Crisp Emerald 600
  static const Color primaryGreenDark = Color(0xFF065F46); // Emerald 800
  static const Color primaryGreenDarker = Color(0xFF064E3B); // Deep Emerald 900
  static const Color primaryGreenLight = Color(0xFF10B981); // Emerald 500
  static const Color primaryGreenTint = Color(0xFFECFDF5); // Emerald 50
  static const Color primaryGreenBorder = Color(0xFFA7F3D0); // Emerald 200

  // High-contrast Typography
  static const Color textPrimary = Color(0xFF0F172A); // Slate 900
  static const Color textSecondary = Color(0xFF475569); // Slate 600
  static const Color textMuted = Color(0xFF64748B); // Slate 500
  static const Color textLight = Color(0xFF94A3B8); // Slate 400

  // Informative Ocean Blue
  static const Color infoBlue = Color(0xFF0284C7);
  static const Color infoBlueDark = Color(0xFF0369A1);
  static const Color infoBlueTint = Color(0xFFF0F9FF);
  static const Color infoBlueBorder = Color(0xFFBAE6FD);

  // Warning & Caution Amber
  static const Color warningAmber = Color(0xFFD97706);
  static const Color warningAmberDark = Color(0xFFB45309);
  static const Color warningAmberTint = Color(0xFFFFFBEB);
  static const Color warningAmberBorder = Color(0xFFFDE68A);

  // Critical Danger Red
  static const Color dangerRed = Color(0xFFDC2626);
  static const Color dangerRedDark = Color(0xFF991B1B);
  static const Color dangerRedTint = Color(0xFFFEF2F2);
  static const Color dangerRedBorder = Color(0xFFFECACA);

  // Tactile Soft Box Shadows for Premium Feel
  static const List<BoxShadow> cardShadow = [
    BoxShadow(
      color: Color(0x080F172A),
      blurRadius: 8,
      offset: Offset(0, 2),
    ),
    BoxShadow(
      color: Color(0x050F172A),
      blurRadius: 2,
      offset: Offset(0, 1),
    ),
  ];

  static const List<BoxShadow> heroCardShadow = [
    BoxShadow(
      color: Color(0x1A059669),
      blurRadius: 16,
      offset: Offset(0, 6),
    ),
  ];

  static const List<BoxShadow> floatingShadow = [
    BoxShadow(
      color: Color(0x140F172A),
      blurRadius: 12,
      offset: Offset(0, 4),
    ),
  ];
}
