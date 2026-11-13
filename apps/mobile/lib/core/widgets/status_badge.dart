import 'package:flutter/widgets.dart';

import '../constants/app_colors.dart';

enum BadgeTone { green, blue, amber, red, neutral }

/// Compact high-contrast flat status pill with zero shadow.
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    this.tone = BadgeTone.neutral,
    this.icon,
    this.fontSize = 12,
  });

  final String label;
  final BadgeTone tone;
  final IconData? icon;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color border, Color fg) = switch (tone) {
      BadgeTone.green => (
          AppColors.primaryGreenTint,
          AppColors.primaryGreenBorder,
          AppColors.primaryGreenDark,
        ),
      BadgeTone.blue => (
          AppColors.infoBlueTint,
          AppColors.infoBlueBorder,
          AppColors.infoBlueDark,
        ),
      BadgeTone.amber => (
          AppColors.warningAmberTint,
          AppColors.warningAmberBorder,
          AppColors.warningAmberDark,
        ),
      BadgeTone.red => (
          AppColors.dangerRedTint,
          AppColors.dangerRedBorder,
          AppColors.dangerRed,
        ),
      BadgeTone.neutral => (
          AppColors.neutralSurface,
          AppColors.borderStrong,
          AppColors.textSecondary,
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: border, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: fontSize + 2, color: fg),
            const SizedBox(width: 5),
          ],
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: fontSize,
                fontWeight: FontWeight.w700,
                color: fg,
                height: 1.25,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
