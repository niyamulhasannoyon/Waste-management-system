import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'app.dart';
import 'core/config/app_build_config.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint('Firebase.initializeApp note: $e');
  }
  try {
    await GoogleSignIn.instance.initialize(
      serverClientId: AppBuildConfig.googleServerClientId,
    );
  } catch (e) {
    debugPrint('GoogleSignIn.initialize note: $e');
  }
  runApp(const ProviderScope(child: CleanSavarApp()));
}
