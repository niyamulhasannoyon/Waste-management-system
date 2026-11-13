# Clean Savar Mobile (`apps/mobile`)

Unified Flutter mobile application for **Clean Savar (ক্লিন সাভার)** targeting Android & iOS with both **Citizen Mode (নাগরিক অ্যাপ)** and **Collector Mode (কর্মী অ্যাপ)** — debug role switcher in dev builds, OTP role-gated in release builds.

## Architecture

Feature-first modular layout built with `flutter_riverpod`:

- `lib/core/` — Design tokens (`#F8FAFC`, `#FFFFFF`, `#E2E8F0`, `#15803D`), `Hind Siliguri` Material 3 theme, domain models, Riverpod providers, Savar ward/route seed data, and flat UI primitives.
- `lib/features/citizen/` — Citizen Home (`নাগরিক হোম`), Pickup Request sheet (`বাসার ময়লা দিন`), Geo-tagged Garbage Report sheet (`রাস্তার ময়লা রিপোর্ট করুন`), Requests tracker (`রিকোয়েস্ট`), Savar Hotspot map (`ম্যাপ`), and Profile (`প্রোফাইল`).
- `lib/features/collector/` — High-contrast outdoor Collector screen (`পরিচ্ছন্নতাকর্মী অ্যাপ`) with Online/Offline duty toggle, Offline Sync queue badge (`৩টি তথ্য আপলোডের অপেক্ষায়`), QR verification modal, weight input (`কেজি`), and 52px+ route completion targets.

## Running Locally

From `apps/mobile`:

```bash
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080/api/v1

# Size-optimized Android release APKs (per-ABI + R8 shrinking + Dart symbol split)
flutter build apk --release --split-per-abi --obfuscate --split-debug-info=build/app/outputs/symbols

# Strict production APK without offline demo preview buttons
flutter build apk --release --split-per-abi --obfuscate --split-debug-info=build/app/outputs/symbols --dart-define=ENABLE_DEMO_MODE=false

# Installable iOS/Android PWA bundle (Add to Home Screen in Safari/Chrome)
flutter build web --release
```

## Downloadable Android & iOS Builds

- **Android (`.apk`)**: Built locally under `build/app/outputs/flutter-apk/` (`app-arm64-v8a-release.apk` for modern phones, `app-armeabi-v7a-release.apk` for older 32-bit Android phones, `app-x86_64-release.apk` for emulators).
- **iOS (`.ipa`)**: Compiling a native iOS `.ipa` requires macOS with full **Xcode + CocoaPods** (and Apple code signing or AltStore/Sideloadly/TestFlight to install on an iPhone). Use [`.github/workflows/mobile-builds.yml`](../../.github/workflows/mobile-builds.yml) (`workflow_dispatch`) to build and download both `clean-savar-android-apks` and `clean-savar-ios-ipa` (`CleanSavar-ios-unsigned.ipa`) via GitHub Actions `macos-latest`.
- **iOS Instant Install (PWA)**: Serve `build/web` over HTTPS (or local network during testing) and tap **Share -> Add to Home Screen** in iPhone Safari.

> Notes:
> - Native `android/` and `ios/` runners (`bd.gov.savar.clean_savar_mobile`) are generated and pre-configured with required permissions:
>   - `android/app/src/main/AndroidManifest.xml`: `INTERNET`, `CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, and `<queries>` for `tel:` links (with cleartext HTTP enabled in `debug` builds for `10.0.2.2`).
>   - `ios/Runner/Info.plist`: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSLocationWhenInUseUsageDescription`, and `LSApplicationQueriesSchemes` (`tel`).
> - Shared domain models, Ward `1–9` & Union `101–106` seeds, and OTP/track API contracts live in `packages/clean_savar_core`.
