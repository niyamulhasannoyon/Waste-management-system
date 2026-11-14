// ignore: deprecated_member_use
import 'package:flutter/material.dart';

import '../constants/app_colors.dart';

/// Professional tactile card with micro-shadow and hairline border.
/// Smoothly renders on low-end and high-end Android displays.
class FlatCard extends StatelessWidget {
  const FlatCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.color = AppColors.cardSurface,
    this.borderColor = AppColors.border,
    this.borderWidth = 1,
    this.borderRadius = 14,
    this.gradient,
    this.hasShadow = true,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color color;
  final Color borderColor;
  final double borderWidth;
  final double borderRadius;
  final Gradient? gradient;
  final bool hasShadow;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(borderRadius);
    final decoration = BoxDecoration(
      color: gradient == null ? color : null,
      gradient: gradient,
      borderRadius: radius,
      border: Border.all(color: borderColor, width: borderWidth),
      boxShadow: hasShadow ? AppColors.cardShadow : null,
    );

    if (onTap == null) {
      return Container(
        decoration: decoration,
        padding: padding,
        child: child,
      );
    }

    return Container(
      decoration: decoration,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Padding(
            padding: padding,
            child: child,
          ),
        ),
      ),
    );
  }
}
