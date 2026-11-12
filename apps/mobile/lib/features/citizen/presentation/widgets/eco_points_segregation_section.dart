import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/providers/citizen_state_provider.dart';
import '../../../../core/utils/bangla_formatters.dart';
import '../../../../core/widgets/flat_card.dart';

class EcoPointsSegregationSection extends ConsumerWidget {
  const EcoPointsSegregationSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ecoPoints = ref.watch(
      citizenStateProvider.select((state) => state.ecoPoints),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'ইকো পয়েন্ট ও বর্জ্য পৃথকীকরণ গাইড',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
            height: 1.35,
          ),
        ),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  width: 192,
                  child: _EcoPointsCard(ecoPoints: ecoPoints),
                ),
                const SizedBox(width: 12),
                const SizedBox(
                  width: 192,
                  child: _BinGuideCard(
                    title: 'পচনশীল',
                    binLabel: 'সবুজ বিন',
                    description: 'রান্নাঘরের উচ্ছিষ্ট, সবজি ও ফলের খোসা',
                    icon: Icons.compost_rounded,
                    accentColor: AppColors.primaryGreen,
                    surfaceColor: AppColors.primaryGreenTint,
                    borderColor: AppColors.primaryGreenBorder,
                  ),
                ),
                const SizedBox(width: 12),
                const SizedBox(
                  width: 192,
                  child: _BinGuideCard(
                    title: 'রিসাইকেলযোগ্য',
                    binLabel: 'নীল বিন',
                    description: 'প্লাস্টিক বোতল, কাগজ, কার্টন ও টিন',
                    icon: Icons.recycling_rounded,
                    accentColor: AppColors.infoBlueDark,
                    surfaceColor: AppColors.infoBlueTint,
                    borderColor: AppColors.infoBlueBorder,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _EcoPointsCard extends StatelessWidget {
  const _EcoPointsCard({required this.ecoPoints});

  final int ecoPoints;

  @override
  Widget build(BuildContext context) {
    return FlatCard(
      padding: const EdgeInsets.all(14),
      color: AppColors.cardSurface,
      borderColor: AppColors.primaryGreenBorder,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: AppColors.primaryGreenTint,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: AppColors.primaryGreenBorder,
                    width: 1,
                  ),
                ),
                child: const Icon(
                  Icons.eco_rounded,
                  size: 19,
                  color: AppColors.primaryGreen,
                ),
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'সবুজ পয়েন্ট',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryGreenDark,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            '${BanglaFormatters.formatInt(ecoPoints)} পয়েন্ট',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'সঠিক বিনে বর্জ্য দিলে পয়েন্ট বাড়বে',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}

class _BinGuideCard extends StatelessWidget {
  const _BinGuideCard({
    required this.title,
    required this.binLabel,
    required this.description,
    required this.icon,
    required this.accentColor,
    required this.surfaceColor,
    required this.borderColor,
  });

  final String title;
  final String binLabel;
  final String description;
  final IconData icon;
  final Color accentColor;
  final Color surfaceColor;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return FlatCard(
      padding: const EdgeInsets.all(14),
      color: surfaceColor,
      borderColor: borderColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: AppColors.cardSurface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: borderColor, width: 1),
                ),
                child: Icon(icon, size: 19, color: accentColor),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: accentColor,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  binLabel,
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    height: 1.2,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            description,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}
