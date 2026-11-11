/// Active mode for unified testing inside Clean Savar mobile app.
enum AppRole {
  citizen(
    labelBn: 'নাগরিক অ্যাপ',
    subtitleBn: 'বাসাবাড়ি ও এলাকা',
  ),
  collector(
    labelBn: 'কর্মী অ্যাপ',
    subtitleBn: 'ফিল্ড সংগ্রহ',
  );

  const AppRole({
    required this.labelBn,
    required this.subtitleBn,
  });

  final String labelBn;
  final String subtitleBn;
}
