import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/app_role.dart';

class AppRoleNotifier extends Notifier<AppRole> {
  @override
  AppRole build() => AppRole.citizen;

  void setRole(AppRole role) {
    if (state != role) {
      state = role;
    }
  }
}

final appRoleProvider = NotifierProvider<AppRoleNotifier, AppRole>(
  AppRoleNotifier.new,
);
