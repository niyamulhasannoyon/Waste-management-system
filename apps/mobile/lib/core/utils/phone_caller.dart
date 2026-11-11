import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

/// Launches the native phone dialer with safe fallback for emulators/simulators.
abstract final class PhoneCaller {
  static Future<void> call(
    BuildContext context, {
    required String phoneNumber,
    String? contactName,
  }) async {
    final cleanPhone = phoneNumber.replaceAll(RegExp(r'[^0-9+]'), '');
    final uri = Uri(scheme: 'tel', path: cleanPhone);

    var launched = false;
    try {
      if (await canLaunchUrl(uri)) {
        launched = await launchUrl(uri);
      }
    } catch (_) {
      launched = false;
    }

    if (!launched && context.mounted) {
      await Clipboard.setData(ClipboardData(text: phoneNumber));
      if (!context.mounted) return;
      final label = contactName != null ? '$contactName ($phoneNumber)' : phoneNumber;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text('ডায়ালার চালু করা যায়নি — নম্বর কপি হয়েছে: $label'),
            duration: const Duration(seconds: 3),
          ),
        );
    }
  }
}
