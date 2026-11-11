/// Bangla numeral and domain formatting helpers without heavy intl overhead.
abstract final class BanglaFormatters {
  static const Map<String, String> _digitMap = {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯',
  };

  static String toBanglaDigits(String input) {
    final buffer = StringBuffer();
    for (var i = 0; i < input.length; i++) {
      final char = input[i];
      buffer.write(_digitMap[char] ?? char);
    }
    return buffer.toString();
  }

  static String formatInt(int value) => toBanglaDigits(value.toString());

  static String formatWeightKg(double weightKg) {
    final formatted = weightKg == weightKg.roundToDouble()
        ? weightKg.toInt().toString()
        : weightKg.toStringAsFixed(1);
    return '${toBanglaDigits(formatted)} কেজি';
  }

  static String formatCoordinates(double lat, double lng) {
    return '${lat.toStringAsFixed(4)}° N, ${lng.toStringAsFixed(4)}° E';
  }

  static String formatPendingSyncBadge(int count) {
    if (count <= 0) {
      return 'সব তথ্য সিঙ্ক সম্পন্ন';
    }
    return '${formatInt(count)}টি তথ্য আপলোডের অপেক্ষায়';
  }

  /// Parses numbers typed with either ASCII (0-9) or Bangla (০-৯) digits.
  static double? parseBanglaDouble(String input) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) {
      return null;
    }

    const banglaToAscii = {
      '০': '0',
      '১': '1',
      '২': '2',
      '৩': '3',
      '৪': '4',
      '৫': '5',
      '৬': '6',
      '৭': '7',
      '৮': '8',
      '৯': '9',
    };

    final buffer = StringBuffer();
    for (var i = 0; i < trimmed.length; i++) {
      final ch = trimmed[i];
      buffer.write(banglaToAscii[ch] ?? ch);
    }
    return double.tryParse(buffer.toString());
  }
}
