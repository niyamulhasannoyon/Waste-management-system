import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/models/hotspot_report.dart';
import '../../../../core/providers/citizen_state_provider.dart';
import '../../../../core/services/device_services.dart';
import '../../../../core/utils/bangla_formatters.dart';
import '../../../../core/widgets/flat_card.dart';

Future<void> showReportGarbageSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => const ReportGarbageSheet(),
  );
}

class ReportGarbageSheet extends ConsumerStatefulWidget {
  const ReportGarbageSheet({super.key});

  @override
  ConsumerState<ReportGarbageSheet> createState() => _ReportGarbageSheetState();
}

class _ReportGarbageSheetState extends ConsumerState<ReportGarbageSheet> {
  final TextEditingController _noteController = TextEditingController();
  final Set<ReportIssueCategory> _selectedCategories = {
    ReportIssueCategory.roadsideGarbage,
  };

  CapturedPhoto? _capturedPhoto;
  double? _liveLat;
  double? _liveLng;
  bool _isLocating = false;
  bool _isCapturingPhoto = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _refreshGps(silent: true));
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  double get _currentLat =>
      _liveLat ?? ref.read(citizenStateProvider).selectedWard.lat;

  double get _currentLng =>
      _liveLng ?? ref.read(citizenStateProvider).selectedWard.lng;

  void _toggleCategory(ReportIssueCategory category) {
    setState(() {
      if (_selectedCategories.contains(category)) {
        if (_selectedCategories.length > 1) {
          _selectedCategories.remove(category);
        }
      } else {
        _selectedCategories.add(category);
      }
    });
  }

  Future<void> _capturePhoto({bool fromGallery = false}) async {
    if (_isCapturingPhoto) return;
    setState(() => _isCapturingPhoto = true);
    try {
      final photo = await ref
          .read(deviceCameraServiceProvider)
          .captureCompressedPhoto(fromGallery: fromGallery);
      if (!mounted) return;
      if (photo != null) {
        setState(() => _capturedPhoto = photo);
      }
    } finally {
      if (mounted) {
        setState(() => _isCapturingPhoto = false);
      }
    }
  }

  Future<void> _refreshGps({bool silent = false}) async {
    if (_isLocating) return;
    setState(() => _isLocating = true);
    try {
      final fix = await ref.read(deviceLocationServiceProvider).getCurrentLocation();
      if (!mounted) return;
      if (fix != null) {
        setState(() {
          _liveLat = fix.lat;
          _liveLng = fix.lng;
        });
        unawaited(
          ref
              .read(citizenStateProvider.notifier)
              .selectWardByCoordinates(fix.lat, fix.lng),
        );
      } else if (!silent && mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(
              content: Text(
                'ডিভাইস জিপিএস পাওয়া যায়নি; নির্বাচিত ওয়ার্ডের অবস্থান ব্যবহার করা হচ্ছে।',
              ),
            ),
          );
      }
    } finally {
      if (mounted) {
        setState(() => _isLocating = false);
      }
    }
  }

  void _submitReport() {
    final categories = _selectedCategories.toList(growable: false);
    final code = ref.read(citizenStateProvider.notifier).submitHotspotReport(
          categories: categories,
          note: _noteController.text,
          lat: _currentLat,
          lng: _currentLng,
          hasPhoto: _capturedPhoto != null,
          photoMetaLabel: _capturedPhoto?.metaLabel,
          photoPath: _capturedPhoto?.path,
        );

    final messenger = ScaffoldMessenger.of(context);
    Navigator.of(context).pop();
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            'রিপোর্ট জমা হয়েছে ($code) • +১৫ সবুজ পয়েন্ট যোগ হয়েছে',
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final selectedWard = ref.watch(
      citizenStateProvider.select((state) => state.selectedWard),
    );
    final lat = _liveLat ?? selectedWard.lat;
    final lng = _liveLng ?? selectedWard.lng;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderStrong,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'রাস্তার ময়লা রিপোর্ট করুন',
                    style: TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                  tooltip: 'বন্ধ করুন',
                ),
              ],
            ),
            const SizedBox(height: 8),

            // 1. One-tap camera capture with device compression
            _CameraCaptureCard(
              photo: _capturedPhoto,
              isBusy: _isCapturingPhoto,
              onCaptureTap: () => unawaited(_capturePhoto()),
              onGalleryTap: () => unawaited(_capturePhoto(fromGallery: true)),
              onClearTap: () => setState(() => _capturedPhoto = null),
            ),
            const SizedBox(height: 12),

            // 2. Automatic GPS coordinates display
            FlatCard(
              padding: const EdgeInsets.all(12),
              color: AppColors.scaffoldBg,
              borderColor: AppColors.border,
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.primaryGreenTint,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppColors.primaryGreenBorder,
                        width: 1,
                      ),
                    ),
                    child: const Icon(
                      Icons.my_location_rounded,
                      color: AppColors.primaryGreen,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          BanglaFormatters.formatCoordinates(lat, lng),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          selectedWard.areaChipLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton.icon(
                    onPressed: _isLocating ? null : () => unawaited(_refreshGps()),
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: Text(_isLocating ? 'খুঁজছে...' : 'জিপিএস'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 3. Quick category chips in Bangla
            const Text(
              'সমস্যার ধরন বেছে নিন',
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final category in ReportIssueCategory.values)
                  _CategoryChip(
                    label: category.labelBn,
                    isSelected: _selectedCategories.contains(category),
                    onTap: () => _toggleCategory(category),
                  ),
              ],
            ),
            const SizedBox(height: 14),

            // 4. Short note input
            const Text(
              'সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)',
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _noteController,
              maxLines: 2,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                hintText: 'যেমন: ব্যাংক টাউন মসজিদ গলির মুখে ময়লা জমে আছে',
              ),
            ),
            const SizedBox(height: 16),

            // 5. Full-width submit button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: FilledButton.icon(
                onPressed: _submitReport,
                icon: const Icon(Icons.send_rounded, size: 20),
                label: const Text('রিপোর্ট জমা দিন'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CameraCaptureCard extends StatelessWidget {
  const _CameraCaptureCard({
    required this.photo,
    required this.isBusy,
    required this.onCaptureTap,
    required this.onGalleryTap,
    required this.onClearTap,
  });

  final CapturedPhoto? photo;
  final bool isBusy;
  final VoidCallback onCaptureTap;
  final VoidCallback onGalleryTap;
  final VoidCallback onClearTap;

  @override
  Widget build(BuildContext context) {
    if (photo == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FlatCard(
            onTap: isBusy ? null : onCaptureTap,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            color: AppColors.scaffoldBg,
            borderColor: AppColors.borderStrong,
            child: const Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: AppColors.primaryGreenTint,
                  child: Icon(
                    Icons.camera_alt_outlined,
                    size: 26,
                    color: AppColors.primaryGreen,
                  ),
                ),
                SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'এক ট্যাপে ছবি তুলুন (ক্যামেরা)',
                        style: TextStyle(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      SizedBox(height: 3),
                      Text(
                        'কম্প্রেসড ছবি (১২৮০ পিক্সেল • ~২৪০ KB) দ্রুত আপলোড হবে',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: AppColors.textSecondary,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: isBusy ? null : onGalleryTap,
              icon: const Icon(Icons.photo_library_outlined, size: 17),
              label: const Text('অথবা গ্যালারি থেকে ছবি দিন'),
            ),
          ),
        ],
      );
    }

    final photoPath = photo!.path;
    final hasLocalFile = photoPath != null && File(photoPath).existsSync();

    return FlatCard(
      padding: const EdgeInsets.all(12),
      color: AppColors.primaryGreenTint,
      borderColor: AppColors.primaryGreen,
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Container(
              width: 56,
              height: 56,
              color: AppColors.primaryGreenDark,
              child: hasLocalFile
                  ? Image.file(
                      File(photoPath),
                      fit: BoxFit.cover,
                    )
                  : const Icon(
                      Icons.photo_camera_back_rounded,
                      color: Colors.white,
                      size: 28,
                    ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'ছবি সংযুক্ত হয়েছে ✓',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryGreenDark,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${photo!.metaLabel} (জিও-ট্যাগড)',
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onCaptureTap,
            tooltip: 'আবার তুলুন',
            icon: const Icon(
              Icons.refresh_rounded,
              color: AppColors.primaryGreenDark,
            ),
          ),
          IconButton(
            onPressed: onClearTap,
            tooltip: 'মুছুন',
            icon: const Icon(
              Icons.delete_outline_rounded,
              color: AppColors.dangerRed,
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected ? AppColors.primaryGreenTint : AppColors.cardSurface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(
          color: isSelected ? AppColors.primaryGreen : AppColors.borderStrong,
          width: isSelected ? 1.5 : 1,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isSelected
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_unchecked_rounded,
                  size: 18,
                  color: isSelected
                      ? AppColors.primaryGreen
                      : AppColors.textMuted,
                ),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                    color: isSelected
                        ? AppColors.primaryGreenDark
                        : AppColors.textPrimary,
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
