// ignore: deprecated_member_use
import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/flat_card.dart';

class PrimaryActionCards extends StatelessWidget {
  const PrimaryActionCards({
    super.key,
    required this.onRequestPickup,
    required this.onReportGarbage,
  });

  final VoidCallback onRequestPickup;
  final VoidCallback onReportGarbage;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: Semantics(
              button: true,
              label: 'বাসার ময়লা দিন — পিকআপ গাড়ি বুক করুন',
              child: FlatCard(
                onTap: onRequestPickup,
                padding: const EdgeInsets.all(15),
                borderRadius: 16,
                borderColor: AppColors.primaryGreenBorder,
                color: AppColors.cardSurface,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [
                                AppColors.primaryGreenTint,
                                Color(0xFFD1FAE5),
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(13),
                            border: Border.all(
                              color: AppColors.primaryGreenBorder,
                              width: 1,
                            ),
                          ),
                          child: const Icon(
                            Icons.delete_sweep_rounded,
                            size: 26,
                            color: AppColors.primaryGreen,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primaryGreenTint,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'নিয়মিত',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primaryGreenDark,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'বাসার ময়লা দিন',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 3),
                    const Text(
                      'পিকআপ গাড়ি বুক করুন',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                        height: 1.3,
                      ),
                    ),
                    const Spacer(),
                    const SizedBox(height: 12),
                    const Row(
                      children: [
                        Text(
                          'রিকোয়েস্ট করুন',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryGreen,
                          ),
                        ),
                        SizedBox(width: 4),
                        Icon(
                          Icons.arrow_forward_rounded,
                          size: 15,
                          color: AppColors.primaryGreen,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Semantics(
              button: true,
              label: 'রাস্তার ময়লা রিপোর্ট করুন — ছবি ও জিপিএসসহ জানান',
              child: FlatCard(
                onTap: onReportGarbage,
                padding: const EdgeInsets.all(15),
                borderRadius: 16,
                borderColor: AppColors.warningAmberBorder,
                color: AppColors.cardSurface,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [
                                AppColors.warningAmberTint,
                                Color(0xFFFEF3C7),
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(13),
                            border: Border.all(
                              color: AppColors.warningAmberBorder,
                              width: 1,
                            ),
                          ),
                          child: const Icon(
                            Icons.add_a_photo_rounded,
                            size: 24,
                            color: AppColors.warningAmberDark,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.warningAmberTint,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'হটস্পট',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.warningAmberDark,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'রাস্তার ময়লা রিপোর্ট করুন',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 3),
                    const Text(
                      'ছবি ও জিপিএসসহ জানান',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                        height: 1.3,
                      ),
                    ),
                    const Spacer(),
                    const SizedBox(height: 12),
                    const Row(
                      children: [
                        Text(
                          'ছবি তুলুন',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.warningAmberDark,
                          ),
                        ),
                        SizedBox(width: 4),
                        Icon(
                          Icons.arrow_forward_rounded,
                          size: 15,
                          color: AppColors.warningAmberDark,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
