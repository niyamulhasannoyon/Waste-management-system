# Clean Savar Mobile (`apps/mobile`)

Unified Flutter mobile application for **Clean Savar (ক্লিন সাভার)** targeting Android & iOS with both **Citizen Mode (নাগরিক অ্যাপ)** and **Collector Mode (কর্মী অ্যাপ)** accessible via a top role switcher for testing.

## Architecture

Feature-first modular layout built with `flutter_riverpod`:

- `lib/core/` — Design tokens (`#F8FAFC`, `#FFFFFF`, `#E2E8F0`, `#15803D`), `Hind Siliguri` Material 3 theme, domain models, Riverpod providers, Savar ward/route seed data, and flat UI primitives.
- `lib/features/citizen/` — Citizen Home (`নাগরিক হোম`), Pickup Request sheet (`বাসার ময়লা দিন`), Geo-tagged Garbage Report sheet (`রাস্তার ময়লা রিপোর্ট করুন`), Requests tracker (`রিকোয়েস্ট`), Savar Hotspot map (`ম্যাপ`), and Profile (`প্রোফাইল`).
- `lib/features/collector/` — High-contrast outdoor Collector screen (`পরিচ্ছন্নতাকর্মী অ্যাপ`) with Online/Offline duty toggle, Offline Sync queue badge (`৩টি তথ্য আপলোডের অপেক্ষায়`), QR verification modal, weight input (`কেজি`), and 52px+ route completion targets.

## Running Locally

From `apps/mobile`:

```bash
flutter create --platforms=android,ios --org bd.gov.savar --project-name clean_savar_mobile .
flutter pub get
flutter test
flutter run
```

> Note: On Android release builds, ensure `<uses-permission android:name="android.permission.INTERNET" />` and `<queries>` for `tel:` links are present in `android/app/src/main/AndroidManifest.xml`, and `LSApplicationQueriesSchemes` (`tel`) is included in `ios/Runner/Info.plist`.
