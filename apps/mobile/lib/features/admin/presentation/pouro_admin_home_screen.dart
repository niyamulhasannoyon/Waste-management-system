import 'dart:async';

import 'package:clean_savar_core/clean_savar_core.dart' as core;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/models/app_role.dart';
import '../../../../core/models/hotspot_report.dart';
import '../../../../core/models/pickup_request.dart';
import '../../../../core/providers/app_role_provider.dart';
import '../../../../core/providers/citizen_state_provider.dart';
import '../../../../core/services/device_services.dart';
import '../../../../core/utils/bangla_formatters.dart';
import '../../../../core/utils/phone_caller.dart';
import '../../../../core/widgets/flat_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../../citizen/presentation/screens/citizen_live_map_screen.dart';

class PouroAdminHomeScreen extends ConsumerStatefulWidget {
  const PouroAdminHomeScreen({super.key});

  @override
  ConsumerState<PouroAdminHomeScreen> createState() =>
      _PouroAdminHomeScreenState();
}

class _PouroAdminHomeScreenState extends ConsumerState<PouroAdminHomeScreen> {
  int _activeNavIndex = 0;
  List<core.CollectorVehicleItem> _vehicles = [];
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _fetchAdminData();
    _refreshTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      _fetchAdminData();
      ref.read(citizenStateProvider.notifier).refreshFromServer();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchAdminData() async {
    try {
      final client = ref.read(apiClientProvider);
      final vList = await client.fetchVehicles();
      if (mounted) {
        setState(() => _vehicles = vList);
      }
    } catch (_) {}
  }

  Future<void> _cleanDemoData() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.cleaning_services_rounded, color: AppColors.dangerRed),
            SizedBox(width: 8),
            Text('সব ডেমো ডেটা মুছবেন?'),
          ],
        ),
        content: const Text(
          'সার্ভার ও অ্যাপের সকল পরীক্ষামূলক পিকআপ এবং ডেমো ময়লা রিপোর্ট মুছে ফেলা হবে। শুধু অনুমোদিত কর্মী ও ওয়ার্ড তালিকা অপরিবর্তিত থাকবে।',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('বাতিল'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.dangerRed),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('হ্যাঁ, মুছে ফেলুন'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('ডেমো ডেটা সফলভাবে মুছে ফেলা হয়েছে।'),
          backgroundColor: AppColors.primaryGreen,
        ),
      );
      await ref.read(citizenStateProvider.notifier).refreshFromServer();
    }
  }

  @override
  Widget build(BuildContext context) {
    final citizen = ref.watch(citizenStateProvider);

    final pendingPickups = citizen.pickups
        .where((p) => p.status == PickupStatus.pending)
        .length;
    final activeHotspots = citizen.hotspots
        .where((h) => h.status != HotspotStatus.cleared)
        .length;
    final activeVehiclesCount = _vehicles
        .where((v) => v.status == 'en_route' || v.status == 'active')
        .length;

    Widget body;
    switch (_activeNavIndex) {
      case 0:
        body = _buildOverviewTab(
          citizen: citizen,
          pendingPickups: pendingPickups,
          activeHotspots: activeHotspots,
          activeVehicles: activeVehiclesCount,
        );
        break;
      case 1:
        body = const CitizenLiveMapScreen();
        break;
      case 2:
        body = _buildRequestsManagerTab(citizen);
        break;
      default:
        body = _buildAdminSettingsTab(citizen);
        break;
    }

    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: const Icon(
                Icons.admin_panel_settings_rounded,
                color: Color(0xFF1D4ED8),
                size: 20,
              ),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'সাভার পৌর প্রশাসন',
                  style: TextStyle(
                    fontSize: 16.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  'ডিজিটাল নিয়ন্ত্রণ ও কমান্ড সেন্টার',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {
              ref.read(citizenStateProvider.notifier).refreshFromServer();
              _fetchAdminData();
            },
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'রিফ্রেশ',
          ),
          IconButton(
            onPressed: () =>
                ref.read(citizenStateProvider.notifier).logoutCitizenAuth(),
            icon: const Icon(Icons.logout_rounded, color: AppColors.dangerRed),
            tooltip: 'লগআউট',
          ),
        ],
      ),
      body: body,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _activeNavIndex,
        onDestinationSelected: (idx) => setState(() => _activeNavIndex = idx),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard_rounded),
            label: 'ড্যাশবোর্ড',
          ),
          NavigationDestination(
            icon: Icon(Icons.map_outlined),
            selectedIcon: Icon(Icons.map_rounded),
            label: 'লাইভ ম্যাপ',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment_rounded),
            label: 'রিকোয়েস্ট ও ময়লা',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings_rounded),
            label: 'অ্যাডমিন',
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab({
    required CitizenState citizen,
    required int pendingPickups,
    required int activeHotspots,
    required int activeVehicles,
  }) {
    return RefreshIndicator(
      onRefresh: () async {
        await ref.read(citizenStateProvider.notifier).refreshFromServer();
        await _fetchAdminData();
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        children: [
          // Municipal Emergency Notice Bar
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Row(
              children: [
                Icon(Icons.shield_rounded, color: Colors.white, size: 28),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'পৌর বর্জ্য কমান্ড নিয়ন্ত্রণ সক্রিয়',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'সাভার পৌরসভার ১৫টি ওয়ার্ড ও ইউনিয়ন সার্বক্ষণিক পর্যবেক্ষণ করা হচ্ছে',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: Color(0xFFDBEAFE),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Key Stats Grid
          Row(
            children: [
              Expanded(
                child: _AdminStatCard(
                  title: 'অপেক্ষমান পিকআপ',
                  count: BanglaFormatters.formatInt(pendingPickups),
                  icon: Icons.pending_actions_rounded,
                  color: const Color(0xFFF59E0B),
                  bgColor: const Color(0xFFFEF3C7),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _AdminStatCard(
                  title: 'ময়লার হটস্পট',
                  count: BanglaFormatters.formatInt(activeHotspots),
                  icon: Icons.delete_outline_rounded,
                  color: const Color(0xFFDC2626),
                  bgColor: const Color(0xFFFEE2E2),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _AdminStatCard(
                  title: 'অন-ডিউটি গাড়ি',
                  count: BanglaFormatters.formatInt(activeVehicles),
                  icon: Icons.local_shipping_rounded,
                  color: const Color(0xFF059669),
                  bgColor: const Color(0xFFD1FAE5),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _AdminStatCard(
                  title: 'মোট রিকোয়েস্ট',
                  count: BanglaFormatters.formatInt(citizen.pickups.length),
                  icon: Icons.assignment_turned_in_rounded,
                  color: const Color(0xFF2563EB),
                  bgColor: const Color(0xFFDBEAFE),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Quick Actions for Admin
          const Text(
            'দ্রুত পৌর ব্যবস্থাপনা কার্যক্রম',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => setState(() => _activeNavIndex = 1),
                  icon: const Icon(Icons.map_rounded, size: 18),
                  label: const Text('লাইভ ম্যাপ'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _cleanDemoData,
                  icon: const Icon(Icons.cleaning_services_rounded,
                      size: 18, color: AppColors.dangerRed),
                  label: const Text(
                    'ডেমো ডেটা মুছুন',
                    style: TextStyle(color: AppColors.dangerRed),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.dangerRedBorder),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Collector Fleet Status List
          Row(
            children: [
              const Expanded(
                child: Text(
                  'পৌর পরিচ্ছন্নতাকর্মী ও গাড়ি মনিটর',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Text(
                'মোট ${_vehicles.length}টি',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_vehicles.isEmpty)
            const FlatCard(
              padding: EdgeInsets.all(16),
              child: Center(
                child: Text('কোনো কর্মী গাড়ি লোড হয়নি বা অফলাইন রয়েছে।'),
              ),
            )
          else
            for (final v in _vehicles)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: FlatCard(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.local_shipping_rounded,
                          color: AppColors.primaryGreenDark,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${v.code} • ${v.driverNameBn}',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'ওয়ার্ড ${BanglaFormatters.formatInt(v.wardId)} • ${v.driverPhone}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      StatusBadge(
                        label: v.status == 'en_route'
                            ? 'চলছে'
                            : (v.status == 'active' ? 'সক্রিয়' : 'অফলাইন'),
                        tone: v.status == 'offline'
                            ? BadgeTone.neutral
                            : BadgeTone.green,
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: () => PhoneCaller.call(
                          context,
                          phoneNumber: v.driverPhone,
                          contactName: v.driverNameBn,
                        ),
                        icon: const Icon(Icons.call,
                            size: 18, color: AppColors.primaryGreen),
                        tooltip: 'কল',
                      ),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }

  Widget _buildRequestsManagerTab(CitizenState citizen) {
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          Container(
            color: Colors.white,
            child: const TabBar(
              labelColor: AppColors.primaryGreenDark,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.primaryGreen,
              tabs: [
                Tab(text: 'পিকআপ রিকোয়েস্ট'),
                Tab(text: 'ময়লার হটস্পট রিপোর্ট'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                // Pickups List
                citizen.pickups.isEmpty
                    ? const Center(
                        child: Text('কোনো নতুন পিকআপ রিকোয়েস্ট নেই'),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(14),
                        itemCount: citizen.pickups.length,
                        itemBuilder: (context, idx) {
                          final p = citizen.pickups[idx];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: FlatCard(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        p.trackingCode,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      const Spacer(),
                                      StatusBadge(
                                        label: p.status.labelBn,
                                        tone: switch (p.status) {
                                          PickupStatus.pending =>
                                            BadgeTone.amber,
                                          PickupStatus.assigned ||
                                          PickupStatus.inProgress =>
                                            BadgeTone.blue,
                                          PickupStatus.collected =>
                                            BadgeTone.green,
                                        },
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    '${p.category.labelBn} • ${p.addressLine}',
                                    style: const TextStyle(fontSize: 13),
                                  ),
                                  if (p.notes.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      'নির্দেশনা: ${p.notes}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),

                // Reports List
                citizen.hotspots.isEmpty
                    ? const Center(
                        child: Text('কোনো সক্রিয় ময়লা রিপোর্ট নেই'),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(14),
                        itemCount: citizen.hotspots.length,
                        itemBuilder: (context, idx) {
                          final h = citizen.hotspots[idx];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: FlatCard(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        h.trackingCode,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      const Spacer(),
                                      StatusBadge(
                                        label: h.status.labelBn,
                                        tone: switch (h.status) {
                                          HotspotStatus.reported =>
                                            BadgeTone.red,
                                          HotspotStatus.verified ||
                                          HotspotStatus.dispatched =>
                                            BadgeTone.amber,
                                          HotspotStatus.cleared =>
                                            BadgeTone.green,
                                        },
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    '${h.primaryTitleBn} • ${h.landmark}',
                                    style: const TextStyle(fontSize: 13),
                                  ),
                                  if (h.note.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      'বিবরণ: ${h.note}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdminSettingsTab(CitizenState citizen) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        FlatCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Color(0xFFDBEAFE),
                    child: Icon(Icons.security_rounded,
                        color: Color(0xFF1D4ED8)),
                  ),
                  SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'সাভার পৌর প্রশাসক',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        'ফোন: 01711-240100',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Divider(),
              const SizedBox(height: 8),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.cleaning_services_rounded,
                    color: AppColors.dangerRed),
                title: const Text('সব ডেমো ও পরীক্ষামূলক ডেটা মুছুন'),
                subtitle: const Text(
                    'পরীক্ষামূলক পিকআপ ও ময়লা রিপোর্ট ডেটাবেস থেকে মুছে ফেলুন'),
                onTap: _cleanDemoData,
              ),
              const Divider(),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.switch_account_rounded,
                    color: AppColors.primaryGreen),
                title: const Text('নাগরিক অ্যাপ মোডে যান'),
                subtitle: const Text('নাগরিক ইন্টারফেসের প্রিভিউ দেখুন'),
                onTap: () {
                  ref.read(appRoleProvider.notifier).setRole(AppRole.citizen);
                },
              ),
              const Divider(),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading:
                    const Icon(Icons.logout_rounded, color: AppColors.dangerRed),
                title: const Text('অ্যাডমিন লগআউট'),
                onTap: () {
                  ref.read(citizenStateProvider.notifier).logoutCitizenAuth();
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _AdminStatCard extends StatelessWidget {
  const _AdminStatCard({
    required this.title,
    required this.count,
    required this.icon,
    required this.color,
    required this.bgColor,
  });

  final String title;
  final String count;
  final IconData icon;
  final Color color;
  final Color bgColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x080F172A),
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  count,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
