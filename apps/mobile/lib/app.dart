import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/models/app_role.dart';
import 'core/providers/app_role_provider.dart';
import 'core/providers/citizen_state_provider.dart';
import 'core/theme/app_theme.dart';
import 'core/widgets/role_switcher_banner.dart';
import 'features/citizen/presentation/citizen_shell_screen.dart';
import 'features/collector/presentation/collector_home_screen.dart';

class CleanSavarApp extends StatelessWidget {
  const CleanSavarApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Clean Savar — ক্লিন সাভার',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.buildLightTheme(),
      home: const CleanSavarRootScreen(),
    );
  }
}

class CleanSavarRootScreen extends ConsumerWidget {
  const CleanSavarRootScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeRole = ref.watch(appRoleProvider);
    final authRole = ref.watch(
      citizenStateProvider.select((state) => state.authenticatedRole),
    );
    final showRoleSwitcher =
        kDebugMode || authRole == 'collector' || authRole == 'admin';

    return Column(
      children: [
        if (showRoleSwitcher) const RoleSwitcherBanner(),
        Expanded(
          child: activeRole == AppRole.citizen
              ? const CitizenShellScreen()
              : const CollectorHomeScreen(),
        ),
      ],
    );
  }
}
