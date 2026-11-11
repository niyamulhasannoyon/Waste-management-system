import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/providers/citizen_state_provider.dart';
import 'screens/citizen_home_screen.dart';
import 'screens/citizen_hotspots_screen.dart';
import 'screens/citizen_profile_screen.dart';
import 'screens/citizen_requests_screen.dart';

class CitizenShellScreen extends ConsumerWidget {
  const CitizenShellScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeTab = ref.watch(
      citizenStateProvider.select((state) => state.activeTabIndex),
    );

    final body = switch (activeTab) {
      0 => const CitizenHomeScreen(),
      1 => const CitizenRequestsScreen(),
      2 => const CitizenHotspotsScreen(),
      _ => const CitizenProfileScreen(),
    };

    return Scaffold(
      body: body,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: AppColors.border, width: 1),
          ),
        ),
        child: NavigationBar(
          selectedIndex: activeTab,
          onDestinationSelected: (index) =>
              ref.read(citizenStateProvider.notifier).setTab(index),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'হোম',
            ),
            NavigationDestination(
              icon: Icon(Icons.receipt_long_outlined),
              selectedIcon: Icon(Icons.receipt_long_rounded),
              label: 'রিকোয়েস্ট',
            ),
            NavigationDestination(
              icon: Icon(Icons.map_outlined),
              selectedIcon: Icon(Icons.map_rounded),
              label: 'ম্যাপ',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline_rounded),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'প্রোফাইল',
            ),
          ],
        ),
      ),
    );
  }
}
