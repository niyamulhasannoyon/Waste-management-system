// ignore: deprecated_member_use
import 'package:flutter/material.dart';

import '../constants/app_colors.dart';

/// Zero-shadow flat card with crisp 1px border optimized for low-end Android GPUs.
class FlatCard extends StatelessWidget {
  const FlatCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.color = AppColors.cardSurface,
    this.borderColor = AppColors.border,
    this.borderWidth = 1,
    this.borderRadius = 12,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color color;
  final Color borderColor;
  final double borderWidth;
  final double borderRadius;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(borderRadius);
    final decoration = BoxDecoration(
      color: color,
      borderRadius: radius,
      border: Border.all(color: borderColor, width: borderWidth),
    );

    if (onTap == null) {
      return Container(
        decoration: decoration,
        padding: padding,
        child: child,
      );
    }

    return Material(
      color: color,
      shape: RoundedRectangleBorder(
        borderRadius: radius,
        side: BorderSide(color: borderColor, width: borderWidth),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: radius,
        child: Padding(
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}
