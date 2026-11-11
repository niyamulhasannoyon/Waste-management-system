import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Strict Anti-AI Flat Design tokens for Clean Savar (ক্লিন সাভার).
/// Optimized for low-end Android GPUs: zero blur filters, zero drop shadows.
abstract final class CleanSavarColors {
  static const Color pageBackground = Color(0xFFF8FAFC);
  static const Color cardSurface = Color(0xFFFFFFFF);
  static const Color borderSubtle = Color(0xFFE2E8F0);
  static const Color borderInput = Color(0xFFCBD5E1);

  static const Color primaryGreen = Color(0xFF15803D);
  static const Color deepAccent = Color(0xFF14532D);
  static const Color softTint = Color(0xFFF0FDF4);
  static const Color softBorderGreen = Color(0xFFBBF7D0);

  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF475569);

  static const Color warningAmber = Color(0xFFD97706);
  static const Color dangerRed = Color(0xFFDC2626);
  static const Color infoBlue = Color(0xFF0284C7);
}

abstract final class CleanSavarTheme {
  /// Use Inter with tabular numerals for tracking codes, phone numbers, and distances.
  static TextStyle metricStyle({
    double fontSize = 13,
    FontWeight fontWeight = FontWeight.w600,
    Color color = CleanSavarColors.textPrimary,
  }) {
    return GoogleFonts.inter(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
  }

  static ThemeData buildLightTheme() {
    final baseTextTheme = GoogleFonts.hindSiliguriTextTheme().apply(
      bodyColor: CleanSavarColors.textPrimary,
      displayColor: CleanSavarColors.textPrimary,
    );

    final banglaTextTheme = baseTextTheme.copyWith(
      headlineSmall: baseTextTheme.headlineSmall?.copyWith(
        fontWeight: FontWeight.w700,
        height: 1.45,
      ),
      titleLarge: baseTextTheme.titleLarge?.copyWith(
        fontWeight: FontWeight.w700,
        height: 1.5,
      ),
      titleMedium: baseTextTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.w600,
        height: 1.5,
      ),
      bodyLarge: baseTextTheme.bodyLarge?.copyWith(
        height: 1.6,
      ),
      bodyMedium: baseTextTheme.bodyMedium?.copyWith(
        height: 1.6,
      ),
    );

    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: CleanSavarColors.pageBackground,
      textTheme: banglaTextTheme,
      colorScheme: const ColorScheme.light(
        primary: CleanSavarColors.primaryGreen,
        onPrimary: Colors.white,
        secondary: CleanSavarColors.deepAccent,
        onSecondary: Colors.white,
        surface: CleanSavarColors.cardSurface,
        onSurface: CleanSavarColors.textPrimary,
        error: CleanSavarColors.dangerRed,
        outline: CleanSavarColors.borderSubtle,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: CleanSavarColors.cardSurface,
        foregroundColor: CleanSavarColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        shape: Border(
          bottom: BorderSide(color: CleanSavarColors.borderSubtle),
        ),
      ),
      cardTheme: CardThemeData(
        color: CleanSavarColors.cardSurface,
        elevation: 0,
        margin: EdgeInsets.zero,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: CleanSavarColors.borderSubtle),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: CleanSavarColors.cardSurface,
        elevation: 0,
        indicatorColor: CleanSavarColors.softTint,
        surfaceTintColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return GoogleFonts.hindSiliguri(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? CleanSavarColors.deepAccent : CleanSavarColors.textSecondary,
          );
        }),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: CleanSavarColors.primaryGreen,
          foregroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: CleanSavarColors.textPrimary,
          backgroundColor: CleanSavarColors.cardSurface,
          minimumSize: const Size.fromHeight(48),
          side: const BorderSide(color: CleanSavarColors.borderInput),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: CleanSavarColors.cardSurface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: CleanSavarColors.borderInput),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: CleanSavarColors.borderInput),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: CleanSavarColors.primaryGreen, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: CleanSavarColors.dangerRed),
        ),
      ),
    );
  }
}
