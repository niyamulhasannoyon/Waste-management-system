// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/models/route_stop.dart';
import '../../../../core/providers/collector_state_provider.dart';
import '../../../../core/utils/bangla_formatters.dart';
import '../../../../core/utils/phone_caller.dart';
import '../../../../core/widgets/flat_card.dart';
import '../../../../core/widgets/status_badge.dart';
import 'qr_scan_sheet.dart';

class RouteStopCard extends ConsumerStatefulWidget {
  const RouteStopCard({
    super.key,
    required this.stop,
    required this.orderNumber,
  });

  final RouteStop stop;
  final int orderNumber;

  @override
  ConsumerState<RouteStopCard> createState() => _RouteStopCardState();
}

class _RouteStopCardState extends ConsumerState<RouteStopCard> {
  static const List<double> _quickWeights = [2.0, 5.0, 10.0];

  late final TextEditingController _weightController;

  @override
  void initState() {
    super.initState();
    _weightController = TextEditingController(
      text: widget.stop.weightKg != null
          ? _formatPlainWeight(widget.stop.weightKg!)
          : '',
    );
  }

  @override
  void didUpdateWidget(covariant RouteStopCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.stop.id != widget.stop.id) {
      _weightController.text = widget.stop.weightKg != null
          ? _formatPlainWeight(widget.stop.weightKg!)
          : '';
    }
  }

  @override
  void dispose() {
    _weightController.dispose();
    super.dispose();
  }

  String _formatPlainWeight(double value) {
    return value == value.roundToDouble()
        ? value.toInt().toString()
        : value.toStringAsFixed(1);
  }

  double? _parseValidWeight() {
    final parsed = BanglaFormatters.parseBanglaDouble(_weightController.text);
    if (parsed != null && parsed > 0) {
      return parsed;
    }
    if (widget.stop.weightKg != null && widget.stop.weightKg! > 0) {
      return widget.stop.weightKg;
    }
    return null;
  }

  void _setQuickWeight(double kg) {
    _weightController.text = _formatPlainWeight(kg);
    ref
        .read(collectorStateProvider.notifier)
        .updateStopWeight(widget.stop.id, kg);
  }

  Future<void> _handleQrScan() async {
    final verified = await showQrScanSheet(context, stop: widget.stop);
    if (verified == true && mounted) {
      ref.read(collectorStateProvider.notifier).verifyStopQr(widget.stop.id);
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(
              '${widget.stop.houseNumber}-এর QR (${widget.stop.expectedQrCode}) যাচাই হয়েছে ✓',
            ),
          ),
        );
    }
  }

  void _handleComplete() {
    final weight = _parseValidWeight();
    if (weight == null) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text(
              'অনুগ্রহ করে আনুমানিক ওজন (কেজি) লিখুন বা দ্রুত ওজন বাটন চাপুন।',
            ),
          ),
        );
      return;
    }
    _weightController.text = _formatPlainWeight(weight);
    ref.read(collectorStateProvider.notifier).completeStop(
          widget.stop.id,
          weightKg: weight,
        );

    final isOnline = ref.read(collectorStateProvider).isNetworkOnline;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            isOnline
                ? '${widget.stop.houseNumber} সংগ্রহ সম্পন্ন (${BanglaFormatters.formatWeightKg(weight)})'
                : '${widget.stop.houseNumber} অফলাইন কিউতে সংরক্ষিত হয়েছে',
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final stop = widget.stop;

    return FlatCard(
      padding: const EdgeInsets.all(14),
      color: stop.isCompleted
          ? AppColors.primaryGreenTint
          : AppColors.cardSurface,
      borderColor: stop.isCompleted
          ? AppColors.primaryGreen
          : AppColors.borderStrong,
      borderWidth: 1.5,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top row: Order badge + House Number & Road + Call Button
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: stop.isCompleted
                      ? AppColors.primaryGreen
                      : AppColors.textPrimary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: stop.isCompleted
                    ? const Icon(Icons.check_rounded, color: Colors.white)
                    : Text(
                        BanglaFormatters.formatInt(widget.orderNumber),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      stop.houseNumber,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        height: 1.25,
                      ),
                    ),
                    Text(
                      stop.roadName,
                      style: const TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textSecondary,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${stop.residentName} • ${stop.areaLabel}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // High-contrast Citizen Phone Call Button (min 52px)
          Semantics(
            button: true,
            label: '${stop.residentName}-কে ফোন করুন ${stop.residentPhone}',
            child: SizedBox(
              height: 52,
              child: OutlinedButton.icon(
                onPressed: () => PhoneCaller.call(
                  context,
                  phoneNumber: stop.residentPhone,
                  contactName: stop.residentName,
                ),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 52),
                  backgroundColor: AppColors.infoBlueTint,
                  foregroundColor: AppColors.infoBlueDark,
                  side: const BorderSide(color: AppColors.infoBlue, width: 1.5),
                ),
                icon: const Icon(Icons.call, size: 22),
                label: Text(
                  'নাগরিককে কল করুন (${stop.residentPhone})',
                  style: const TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),

          if (stop.isCompleted) ...[
            Row(
              children: [
                StatusBadge(
                  label:
                      'সংগ্রহ সম্পন্ন • ${BanglaFormatters.formatWeightKg(stop.weightKg ?? 0)}',
                  tone: BadgeTone.green,
                  icon: Icons.check_circle_rounded,
                  fontSize: 13.5,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: StatusBadge(
                    label: stop.syncedToServer
                        ? 'আপলোড সম্পন্ন'
                        : 'আপলোডের অপেক্ষায়',
                    tone: stop.syncedToServer
                        ? BadgeTone.blue
                        : BadgeTone.amber,
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 52,
              child: OutlinedButton.icon(
                onPressed: () => ref
                    .read(collectorStateProvider.notifier)
                    .reopenStop(stop.id),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 52),
                  backgroundColor: AppColors.cardSurface,
                ),
                icon: const Icon(Icons.edit_outlined, size: 20),
                label: const Text('তথ্য পরিবর্তন করুন'),
              ),
            ),
          ] else ...[
            // QR Scan Button (min 52px) + Weight Input (কেজি)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 11,
                  child: SizedBox(
                    height: 54,
                    child: OutlinedButton.icon(
                      onPressed: _handleQrScan,
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(48, 54),
                        backgroundColor: stop.qrVerified
                            ? AppColors.primaryGreenTint
                            : AppColors.cardSurface,
                        foregroundColor: stop.qrVerified
                            ? AppColors.primaryGreenDark
                            : AppColors.textPrimary,
                        side: BorderSide(
                          color: stop.qrVerified
                              ? AppColors.primaryGreen
                              : AppColors.textPrimary,
                          width: 1.5,
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                      ),
                      icon: Icon(
                        stop.qrVerified
                            ? Icons.verified_rounded
                            : Icons.qr_code_scanner_rounded,
                        size: 22,
                      ),
                      label: Text(
                        stop.qrVerified ? 'QR যাচাই ✓' : 'QR স্ক্যান করুন',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 9,
                  child: SizedBox(
                    height: 54,
                    child: TextField(
                      controller: _weightController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      onChanged: (value) {
                        final parsed = BanglaFormatters.parseBanglaDouble(value);
                        ref
                            .read(collectorStateProvider.notifier)
                            .updateStopWeight(stop.id, parsed);
                      },
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'ওজন',
                        hintText: '০.০',
                        suffixText: 'কেজি',
                        suffixStyle: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textSecondary,
                        ),
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 14,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Quick 1-tap weight chips for low-literacy field speed
            Row(
              children: [
                const Text(
                  'দ্রুত ওজন:',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(width: 8),
                for (var i = 0; i < _quickWeights.length; i++) ...[
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _setQuickWeight(_quickWeights[i]),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(48, 52),
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        backgroundColor: AppColors.scaffoldBg,
                      ),
                      child: Text(
                        BanglaFormatters.formatWeightKg(_quickWeights[i]),
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  if (i < _quickWeights.length - 1) const SizedBox(width: 6),
                ],
              ],
            ),
            const SizedBox(height: 12),

            // Swipe / Tap Complete Button (min 56px height)
            _SwipeOrTapCompleteButton(onComplete: _handleComplete),
          ],
        ],
      ),
    );
  }
}

class _SwipeOrTapCompleteButton extends StatefulWidget {
  const _SwipeOrTapCompleteButton({required this.onComplete});

  final VoidCallback onComplete;

  @override
  State<_SwipeOrTapCompleteButton> createState() =>
      _SwipeOrTapCompleteButtonState();
}

class _SwipeOrTapCompleteButtonState extends State<_SwipeOrTapCompleteButton> {
  double _dragDistance = 0;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onHorizontalDragUpdate: (details) {
        if (details.delta.dx > 0) {
          _dragDistance += details.delta.dx;
        }
      },
      onHorizontalDragEnd: (details) {
        final velocity = details.primaryVelocity ?? 0;
        if (_dragDistance > 52 || velocity > 280) {
          widget.onComplete();
        }
        _dragDistance = 0;
      },
      onHorizontalDragCancel: () => _dragDistance = 0,
      child: Material(
        color: AppColors.primaryGreen,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: widget.onComplete,
          borderRadius: BorderRadius.circular(12),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 56),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.check_circle_outline_rounded,
                    color: Colors.white,
                    size: 24,
                  ),
                  SizedBox(width: 10),
                  Text(
                    'সংগ্রহ সম্পন্ন',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(width: 10),
                  Icon(
                    Icons.arrow_forward_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
