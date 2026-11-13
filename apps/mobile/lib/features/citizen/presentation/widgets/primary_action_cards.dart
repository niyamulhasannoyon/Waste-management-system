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
              padding: const EdgeInsets.all(14),
              borderColor: AppColors.primaryGreenBorder,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.primaryGreenTint,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.primaryGreenBorder,
                        width: 1,
                      ),
                    ),
                    child: const Icon(
                      Icons.delete_sweep_outlined,
                      size: 26,
                      color: AppColors.primaryGreen,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'বাসার ময়লা দিন',
                    style: TextStyle(
                      fontSize: 16.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'পিকআপ গাড়ি বুক করুন',
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textSecondary,
                      height: 1.35,
                    ),
                  ),
                  const Spacer(),
                  const SizedBox(height: 10),
                  const Row(
                    children: [
                      Text(
                        'রিকোয়েস্ট করুন',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primaryGreen,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(
                        Icons.arrow_forward_rounded,
                        size: 16,
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
              padding: const EdgeInsets.all(14),
              borderColor: AppColors.warningAmberBorder,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.warningAmberTint,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.warningAmberBorder,
                        width: 1,
                      ),
                    ),
                    child: const Icon(
                      Icons.add_a_photo_outlined,
                      size: 25,
                      color: AppColors.warningAmberDark,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'রাস্তার ময়লা রিপোর্ট করুন',
                    style: TextStyle(
                      fontSize: 16.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'ছবি ও জিপিএসসহ জানান',
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textSecondary,
                      height: 1.35,
                    ),
                  ),
                  const Spacer(),
                  const SizedBox(height: 10),
                  const Row(
                    children: [
                      Text(
                        'ছবি তুলুন',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.warningAmberDark,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(
                        Icons.arrow_forward_rounded,
                        size: 16,
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
