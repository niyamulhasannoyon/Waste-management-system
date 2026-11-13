import 'package:clean_savar_core/clean_savar_core.dart' as core;
import 'package:flutter/foundation.dart';
// ignore: deprecated_member_use
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
          child: Row(
            children: [
              Icon(
                citizen.pendingSyncCount > 0
                    ? Icons.cloud_upload_outlined
                    : Icons.cloud_done_outlined,
                color: citizen.pendingSyncCount > 0
                    ? AppColors.warningAmberDark
                    : AppColors.primaryGreen,
                size: 26,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      citizen.pendingSyncCount > 0
                          ? '${BanglaFormatters.formatInt(citizen.pendingSyncCount)}টি অফলাইন তথ্য সিঙ্কের অপেক্ষায়'
                          : 'সার্ভার সিঙ্ক অবস্থা',
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'অফলাইনে জমা দেওয়া রিপোর্ট ও পিকআপ নেট ফিরে এলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              OutlinedButton.icon(
                onPressed: citizen.isRefreshing
                    ? null
                    : () => ref.read(citizenStateProvider.notifier).refreshFromServer(),
                icon: const Icon(Icons.sync_rounded, size: 17),
                label: Text(citizen.isRefreshing ? 'চলছে' : 'সিঙ্ক'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _CitizenOtpAuthCard(
          phone: citizen.citizenPhone,
          isAuthenticated: citizen.isAuthenticated,
          isDemoPreview: citizen.isDemoPreview,
          otpPreview: citizen.otpPreview,
        ),
        if (citizen.isDemoPreview ||
            kDebugMode ||
            citizen.authenticatedRole == 'collector' ||
            citizen.authenticatedRole == 'admin') ...[
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
                        'ফিল্ড কালেক্টর অ্যাপ UI ও রুট দেখুন',
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
      ],
    );
  }
}

class _CitizenOtpAuthCard extends ConsumerStatefulWidget {
  const _CitizenOtpAuthCard({
    required this.phone,
    required this.isAuthenticated,
    required this.isDemoPreview,
    this.otpPreview,
  });

  final String phone;
  final bool isAuthenticated;
  final bool isDemoPreview;
  final String? otpPreview;

  @override
  ConsumerState<_CitizenOtpAuthCard> createState() => _CitizenOtpAuthCardState();
}

class _CitizenOtpAuthCardState extends ConsumerState<_CitizenOtpAuthCard> {
  late final TextEditingController _phoneCtrl;
  final TextEditingController _otpCtrl = TextEditingController();
  bool _sending = false;
  bool _verifying = false;
  bool _otpRequested = false;
  String? _statusMessage;

  @override
  void initState() {
    super.initState();
    _phoneCtrl = TextEditingController(text: widget.phone);
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    setState(() {
      _sending = true;
      _statusMessage = null;
    });
    try {
      final challenge = await ref
          .read(citizenStateProvider.notifier)
          .requestCitizenOtp(phone: _phoneCtrl.text.trim());
      if (!mounted) return;
      setState(() {
        _otpRequested = true;
        if (kDebugMode &&
            challenge.devOtpPreview != null &&
            challenge.devOtpPreview!.isNotEmpty) {
          _otpCtrl.text = challenge.devOtpPreview!;
          _statusMessage =
              'ডেভ OTP কোড: ${challenge.devOtpPreview} (যাচাই করতে নিচের বাটনে চাপ দিন)';
        } else {
          _statusMessage = 'আপনার ফোনে ৬ সংখ্যার OTP পাঠানো হয়েছে।';
        }
      });
    } on core.CleanSavarApiException catch (e) {
      if (mounted) {
        setState(() => _statusMessage = e.message);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _statusMessage = 'সার্ভারের সাথে সংযোগ পাওয়া যায়নি।');
      }
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  Future<void> _verifyOtp() async {
    setState(() {
      _verifying = true;
      _statusMessage = null;
    });
    try {
      await ref.read(citizenStateProvider.notifier).verifyCitizenOtp(
            phone: _phoneCtrl.text.trim(),
            otp: _otpCtrl.text.trim(),
          );
      if (mounted) {
        setState(() {
          _otpRequested = false;
          _statusMessage = 'যাচাইকৃত সেশন চালু হয়েছে ও সিঙ্ক সম্পন্ন হয়েছে।';
        });
      }
    } on core.CleanSavarApiException catch (e) {
      if (mounted) {
        setState(() => _statusMessage = e.message);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _statusMessage = 'OTP যাচাই করা যায়নি।');
      }
    } finally {
      if (mounted) {
        setState(() => _verifying = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FlatCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                widget.isAuthenticated ? Icons.verified_user_outlined : Icons.lock_outline_rounded,
                color: widget.isAuthenticated ? AppColors.primaryGreen : AppColors.textSecondary,
                size: 22,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  widget.isAuthenticated
                      ? 'নাগরিক অ্যাকাউন্ট যাচাইকৃত'
                      : 'লাইভ সার্ভার OTP লগইন',
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              if (widget.isAuthenticated || widget.isDemoPreview)
                TextButton(
                  onPressed: () =>
                      ref.read(citizenStateProvider.notifier).logoutCitizenAuth(),
                  child: Text(widget.isAuthenticated ? 'লগআউট' : 'লগইন পেজ'),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            widget.isAuthenticated
                ? 'সার্ভারে পিকআপ, রিপোর্ট এবং ছবি পাঠাতে আপনার সেশন সক্রিয় আছে।'
                : 'অনলাইন সার্ভারে পিকআপ রিকোয়েস্ট ও ময়লার ছবি পাঠাতে মোবাইল নম্বর OTP দিয়ে যাচাই করুন।',
            style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
          ),
          if (!widget.isAuthenticated) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      isDense: true,
                      labelText: 'মোবাইল নম্বর',
                      hintText: '01715-883210',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _sending ? null : _sendOtp,
                  child: Text(_sending ? 'পাঠাচ্ছে...' : 'OTP পাঠান'),
                ),
              ],
            ),
            if (_otpRequested) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _otpCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        isDense: true,
                        labelText: 'OTP কোড',
                        hintText: '৬ সংখ্যার কোড',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _verifying ? null : _verifyOtp,
                    child: Text(_verifying ? 'যাচাই হচ্ছে...' : 'যাচাই করুন'),
                  ),
                ],
              ),
            ],
          ],
          if (_statusMessage != null) ...[
            const SizedBox(height: 8),
            Text(
              _statusMessage!,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.primaryGreen,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
