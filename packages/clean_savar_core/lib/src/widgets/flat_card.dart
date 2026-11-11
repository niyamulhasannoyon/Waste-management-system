import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Flat crisp card with 1px Slate-200 border and zero elevation/shadow overdraw.
class FlatCard extends StatelessWidget {
  const FlatCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.backgroundColor = CleanSavarColors.cardSurface,
    this.borderColor = CleanSavarColors.borderSubtle,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color backgroundColor;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Padding(
        padding: padding,
        child: child,
      ),
    );
  }
}
