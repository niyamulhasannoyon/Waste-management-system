import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../constants/app_colors.dart';
import '../models/app_role.dart';
import '../providers/app_role_provider.dart';
import '../providers/citizen_state_provider.dart';

/// Unified top role switcher allowing instant testing between Citizen & Collector modes.
class RoleSwitcherBanner extends ConsumerWidget {
  const RoleSwitcherBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentRole = ref.watch(appRoleProvider);
    final authenticatedRole = ref.watch(
      citizenStateProvider.select((s) => s.authenticatedRole),
    );
    final canSwitchToCollector = kDebugMode ||
        authenticatedRole == 'collector' ||
        authenticatedRole == 'admin';

    return Material(
      color: AppColors.cardSurface,
      child: SafeArea(
        bottom: false,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: const BoxDecoration(
            color: AppColors.cardSurface,
            border: Border(
              bottom: BorderSide(color: AppColors.border, width: 1),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
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
                  size: 18,
                  color: AppColors.primaryGreen,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'ক্লিন সাভার',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        height: 1.2,
                      ),
                    ),
                    Text(
                      canSwitchToCollector ? 'মোড পরিবর্তন করুন' : 'নাগরিক সেবা',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textMuted,
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
              if (canSwitchToCollector)
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: AppColors.neutralSurface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border, width: 1),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _RoleSegmentButton(
                        label: AppRole.citizen.labelBn,
                        icon: Icons.home_outlined,
                        isSelected: currentRole == AppRole.citizen,
                        onTap: () => ref
                            .read(appRoleProvider.notifier)
                            .setRole(AppRole.citizen),
                      ),
                      const SizedBox(width: 4),
                      _RoleSegmentButton(
                        label: AppRole.collector.labelBn,
                        icon: Icons.local_shipping_outlined,
                        isSelected: currentRole == AppRole.collector,
                        onTap: () => ref
                            .read(appRoleProvider.notifier)
                            .setRole(AppRole.collector),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleSegmentButton extends StatelessWidget {
  const _RoleSegmentButton({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected ? AppColors.primaryGreen : Colors.transparent,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 38),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: isSelected ? Colors.white : AppColors.textSecondary,
                ),
                const SizedBox(width: 5),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : AppColors.textSecondary,
                    height: 1.2,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
