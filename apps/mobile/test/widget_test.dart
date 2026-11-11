import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:clean_savar_mobile/app.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('Citizen home displays required Savar sections and nav tabs', (
    tester,
  ) async {
    await tester.pumpWidget(const ProviderScope(child: CleanSavarApp()));
    await tester.pumpAndSettle();

    expect(find.text('শুভ সকাল, রাফি'), findsOneWidget);
    expect(find.text('ব্যাংক টাউন, সাভার - ওয়ার্ড ৩'), findsOneWidget);
    expect(
      find.text('পরবর্তী ময়লা সংগ্রহ: আগামীকাল সকাল ৯:০০ - ১০:০০'),
      findsOneWidget,
    );
    expect(find.text('বাসার ময়লা দিন'), findsOneWidget);
    expect(find.text('রাস্তার ময়লা রিপোর্ট করুন'), findsOneWidget);

    expect(find.text('হোম'), findsOneWidget);
    expect(find.text('রিকোয়েস্ট'), findsOneWidget);
    expect(find.text('ম্যাপ'), findsOneWidget);
    expect(find.text('প্রোফাইল'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('১২০ পয়েন্ট'),
      180,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('১২০ পয়েন্ট'), findsOneWidget);
    expect(find.text('পচনশীল'), findsOneWidget);
    expect(find.text('সবুজ বিন'), findsOneWidget);
    expect(find.text('রিসাইকেলযোগ্য'), findsOneWidget);
    expect(find.text('নীল বিন'), findsOneWidget);
  });

  testWidgets('Report Garbage bottom sheet opens and submits report', (
    tester,
  ) async {
    await tester.pumpWidget(const ProviderScope(child: CleanSavarApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('রাস্তার ময়লা রিপোর্ট করুন'));
    await tester.pumpAndSettle();

    expect(find.text('এক ট্যাপে ছবি তুলুন (ক্যামেরা)'), findsOneWidget);
    expect(find.text('রাস্তার পাশে ময়লা'), findsOneWidget);
    expect(find.text('ড্রেন জ্যাম'), findsOneWidget);
    expect(find.text('ডাস্টবিন উপচে পড়ছে'), findsOneWidget);
    expect(find.text('দুর্গন্ধ'), findsOneWidget);

    await tester.tap(find.text('এক ট্যাপে ছবি তুলুন (ক্যামেরা)'));
    await tester.pump();
    expect(find.text('ছবি সংযুক্ত হয়েছে ✓'), findsOneWidget);

    await tester.ensureVisible(find.text('ড্রেন জ্যাম'));
    await tester.tap(find.text('ড্রেন জ্যাম'));
    await tester.pump();

    await tester.ensureVisible(find.text('রিপোর্ট জমা দিন'));
    await tester.tap(find.text('রিপোর্ট জমা দিন'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('১৩৫ পয়েন্ট'),
      180,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('১৩৫ পয়েন্ট'), findsOneWidget);
  });

  testWidgets('Role switcher toggles to Collector Mode with high-contrast UI', (
    tester,
  ) async {
    await tester.pumpWidget(const ProviderScope(child: CleanSavarApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('কর্মী অ্যাপ'));
    await tester.pumpAndSettle();

    expect(find.text('পরিচ্ছন্নতাকর্মী অ্যাপ'), findsOneWidget);
    expect(find.text('কাজ শুরু করুন'), findsOneWidget);
    expect(find.text('৩টি তথ্য আপলোডের অপেক্ষায়'), findsOneWidget);

    await tester.tap(find.text('কাজ শুরু করুন'));
    await tester.pump();
    expect(find.text('অনলাইন • ডিউটি চালু আছে'), findsOneWidget);

    await tester.tap(find.text('সিঙ্ক করুন'));
    await tester.pump();
    expect(find.text('সব তথ্য সিঙ্ক সম্পন্ন'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('বাসা ১৪'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('QR স্ক্যান করুন'), findsWidgets);
    expect(find.text('সংগ্রহ সম্পন্ন'), findsWidgets);

    await tester.ensureVisible(find.text('সংগ্রহ সম্পন্ন').first);
    await tester.tap(find.text('সংগ্রহ সম্পন্ন').first);
    await tester.pump();
    expect(find.textContaining('সংগ্রহ সম্পন্ন •'), findsWidgets);
  });
}
