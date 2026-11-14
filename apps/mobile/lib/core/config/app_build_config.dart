/// Compile-time build flags for the Clean Savar mobile app.
class AppBuildConfig {
  const AppBuildConfig._();

  /// Enables offline Citizen & Collector demo preview from the login screen.
  ///
  /// Defaults to `true` so evaluation/preview APKs and IPAs work without a live
  /// backend server. Pass `--dart-define=ENABLE_DEMO_MODE=false` for strict
  /// production store builds where only verified OTP sessions are allowed.
  static const bool enableDemoMode = bool.fromEnvironment(
    'ENABLE_DEMO_MODE',
    defaultValue: true,
  );

  /// Google OAuth Web Client ID (used as serverClientId for Google Play Services ID token exchange)
  static const String googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue:
        '969714135854-1hd9ek2mkkv7m6s1617jm16pd4e55mhe.apps.googleusercontent.com',
  );

  /// Google OAuth Android Client ID (configured with package name & SHA-1 fingerprint)
  static const String googleAndroidClientId = String.fromEnvironment(
    'GOOGLE_ANDROID_CLIENT_ID',
    defaultValue:
        '969714135854-c3abr34d896uvqb90ekgjhhpmndkmgsu.apps.googleusercontent.com',
  );
}
