import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/models/route_stop.dart';
import '../../../../core/widgets/flat_card.dart';

Future<bool?> showQrScanSheet(BuildContext context, {required RouteStop stop}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _QrScanSheet(stop: stop),
  );
}

class _QrScanSheet extends StatelessWidget {
  const _QrScanSheet({required this.stop});

  final RouteStop stop;

  @override
  Widget build(BuildContext context) {
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
            '${stop.houseNumber} • ${stop.roadName}',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.primaryGreenDark,
            ),
          ),
          const SizedBox(height: 12),
          FlatCard(
            padding: const EdgeInsets.all(20),
            color: AppColors.textPrimary,
            borderColor: AppColors.textPrimary,
            child: Column(
              children: [
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
                  'ট্যাগ কোড: ${stop.expectedQrCode}',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'বিনের গায়ে থাকা QR স্টিকার ফ্রেমের ভেতরে ধরুন',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.border,
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
