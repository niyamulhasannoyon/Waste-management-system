import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/models/route_stop.dart';
import '../../../../core/services/device_services.dart';
import '../../../../core/widgets/flat_card.dart';

Future<bool?> showQrScanSheet(BuildContext context, {required RouteStop stop}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _QrScanSheet(stop: stop),
  );
}

class _QrScanSheet extends ConsumerStatefulWidget {
  const _QrScanSheet({required this.stop});

  final RouteStop stop;

  @override
  ConsumerState<_QrScanSheet> createState() => _QrScanSheetState();
}

class _QrScanSheetState extends ConsumerState<_QrScanSheet> {
  MobileScannerController? _controller;
  String? _scanFeedback;
  bool _handledMatch = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final cameraEnabled = ref.read(qrCameraScannerEnabledProvider);
    if (cameraEnabled && _controller == null) {
      _controller = MobileScannerController(
        detectionSpeed: DetectionSpeed.noDuplicates,
      );
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  void _onBarcodeDetected(BarcodeCapture capture) {
    if (_handledMatch) return;
    for (final barcode in capture.barcodes) {
      final raw = barcode.rawValue?.trim();
      if (raw == null || raw.isEmpty) continue;

      final expected = widget.stop.expectedQrCode.trim();
      final matchesExpected =
          raw.toUpperCase() == expected.toUpperCase() ||
          raw.toUpperCase().contains(expected.toUpperCase());

      if (matchesExpected) {
        _handledMatch = true;
        if (mounted) {
          Navigator.of(context).pop(true);
        }
        return;
      }

      if (mounted) {
        setState(() {
          _scanFeedback =
              'স্ক্যানকৃত কোড ($raw) এই বাসার ট্যাগের ($expected) সাথে মেলেনি';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cameraEnabled = ref.watch(qrCameraScannerEnabledProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'বাসার QR কোড স্ক্যান করুন',
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              IconButton(
                onPressed: () => Navigator.of(context).pop(false),
                icon: const Icon(Icons.close_rounded),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${widget.stop.houseNumber} • ${widget.stop.roadName}',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.primaryGreenDark,
            ),
          ),
          const SizedBox(height: 12),
          FlatCard(
            padding: const EdgeInsets.all(16),
            color: AppColors.textPrimary,
            borderColor: AppColors.textPrimary,
            child: Column(
              children: [
                if (cameraEnabled && _controller != null)
                  SizedBox(
                    height: 210,
                    width: double.infinity,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          MobileScanner(
                            controller: _controller!,
                            onDetect: _onBarcodeDetected,
                          ),
                          Center(
                            child: SizedBox(
                              width: 150,
                              height: 150,
                              child: CustomPaint(painter: _QrFramePainter()),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  SizedBox(
                    width: 168,
                    height: 168,
                    child: CustomPaint(
                      painter: _QrFramePainter(),
                      child: const Center(
                        child: Icon(
                          Icons.qr_code_2_rounded,
                          size: 112,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
                Text(
                  'ট্যাগ কোড: ${widget.stop.expectedQrCode}',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _scanFeedback ?? 'বিনের গায়ে থাকা QR স্টিকার ফ্রেমের ভেতরে ধরুন',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: _scanFeedback != null
                        ? const Color(0xFFFCA5A5)
                        : AppColors.border,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 56,
            child: FilledButton.icon(
              onPressed: () => Navigator.of(context).pop(true),
              icon: const Icon(Icons.qr_code_scanner_rounded, size: 24),
              label: const Text(
                'QR যাচাই সম্পন্ন করুন',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QrFramePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF4ADE80)
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const corner = 26.0;
    // Top-left
    canvas.drawLine(Offset.zero, const Offset(corner, 0), paint);
    canvas.drawLine(Offset.zero, const Offset(0, corner), paint);
    // Top-right
    canvas.drawLine(
      Offset(size.width - corner, 0),
      Offset(size.width, 0),
      paint,
    );
    canvas.drawLine(
      Offset(size.width, 0),
      Offset(size.width, corner),
      paint,
    );
    // Bottom-left
    canvas.drawLine(
      Offset(0, size.height - corner),
      Offset(0, size.height),
      paint,
    );
    canvas.drawLine(
      Offset(0, size.height),
      Offset(corner, size.height),
      paint,
    );
    // Bottom-right
    canvas.drawLine(
      Offset(size.width - corner, size.height),
      Offset(size.width, size.height),
      paint,
    );
    canvas.drawLine(
      Offset(size.width, size.height - corner),
      Offset(size.width, size.height),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
