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
}
