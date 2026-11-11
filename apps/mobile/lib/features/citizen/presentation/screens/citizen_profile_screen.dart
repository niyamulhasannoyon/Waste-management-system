import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/models/app_role.dart';
import '../../../../core/providers/app_role_provider.dart';
import '../../../../core/providers/citizen_state_provider.dart';
import '../../../../core/utils/bangla_formatters.dart';
import '../../../../core/utils/phone_caller.dart';
import '../../../../core/widgets/flat_card.dart';
import '../../../../core/widgets/status_badge.dart';

class CitizenProfileScreen extends ConsumerWidget {
  const CitizenProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final citizen = ref.watch(citizenStateProvider);
    final progress = (citizen.ecoPoints / 200).clamp(0.0, 1.0);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        FlatCard(
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: AppColors.primaryGreenTint,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: AppColors.primaryGreenBorder,
                    width: 1,
                  ),
                ),
                child: const Icon(
                  Icons.person_rounded,
                  size: 30,
                  color: AppColors.primaryGreen,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      citizen.citizenFullName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${citizen.citizenPhone} • ${citizen.defaultAddress}',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    StatusBadge(
                      label: citizen.selectedWard.areaChipLabel,
                      tone: BadgeTone.green,
                      icon: Icons.location_on_outlined,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        FlatCard(
          color: AppColors.primaryGreenTint,
          borderColor: AppColors.primaryGreenBorder,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text(
                    'সবুজ পয়েন্ট ব্যালেন্স',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryGreenDark,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${BanglaFormatters.formatInt(citizen.ecoPoints)} পয়েন্ট',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryGreenDark,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 8,
                  backgroundColor: Colors.white,
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    AppColors.primaryGreen,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                '২০০ পয়েন্ট পূর্ণ হলে সাভার পৌরসভা থেকে বিনামূল্যে জৈব সার ও ডাস্টবিন ব্যাগ সংগ্রহ করুন।',
                style: TextStyle(
                  fontSize: 12.5,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        FlatCard(
          child: Row(
            children: [
              const Icon(
                Icons.support_agent_rounded,
                size: 28,
                color: AppColors.infoBlueDark,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ওয়ার্ড সুপারভাইজার: ${citizen.selectedWard.supervisorName}',
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      citizen.selectedWard.supervisorPhone,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              OutlinedButton.icon(
                onPressed: () => PhoneCaller.call(
                  context,
                  phoneNumber: citizen.selectedWard.supervisorPhone,
                  contactName: citizen.selectedWard.supervisorName,
                ),
                icon: const Icon(Icons.call, size: 17),
                label: const Text('কল'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        FlatCard(
          onTap: () => ref
              .read(appRoleProvider.notifier)
              .setRole(AppRole.collector),
          child: const Row(
            children: [
              Icon(
                Icons.local_shipping_outlined,
                color: AppColors.primaryGreen,
                size: 26,
              ),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'পরিচ্ছন্নতাকর্মী মোডে প্রবেশ করুন',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'ফিল্ড কালেক্টর অ্যাপ UI ও রুট টেস্ট করুন',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.arrow_forward_ios_rounded,
                size: 16,
                color: AppColors.textMuted,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
