import 'package:flutter/foundation.dart';
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/config/app_build_config.dart';
import 'core/models/app_role.dart';
import 'core/providers/app_role_provider.dart';
import 'core/providers/citizen_state_provider.dart';
import 'core/theme/app_theme.dart';
import 'core/widgets/role_switcher_banner.dart';
import 'features/auth/presentation/auth_login_screen.dart';
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
    final isAuthenticated = ref.watch(
      citizenStateProvider.select((state) => state.isAuthenticated),
    );
    final isDemoPreview = ref.watch(
      citizenStateProvider.select((state) => state.isDemoPreview),
    );
    final authRole = ref.watch(
      citizenStateProvider.select((state) => state.authenticatedRole),
    );
    final hasSession =
        isAuthenticated || (AppBuildConfig.enableDemoMode && isDemoPreview);
    final showRoleSwitcher = isDemoPreview ||
        kDebugMode ||
        authRole == 'collector' ||
        authRole == 'admin';

    final appContent = !hasSession
        ? const AuthLoginScreen()
        : Column(
            children: [
              if (showRoleSwitcher) const RoleSwitcherBanner(),
              Expanded(
                child: activeRole == AppRole.citizen
                    ? const CitizenShellScreen()
                    : const CollectorHomeScreen(),
              ),
            ],
          );

    if (kIsWeb) {
      return ColoredBox(
        color: const Color(0xFFE2E8F0),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Container(
              decoration: const BoxDecoration(
                border: Border.symmetric(
                  vertical: BorderSide(
                    color: Color(0xFFCBD5E1),
                    width: 1,
                  ),
                ),
              ),
              child: appContent,
            ),
          ),
        ),
      );
    }

    return appContent;
  }
}
