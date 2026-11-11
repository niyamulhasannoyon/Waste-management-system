import 'dart:io';

import 'package:clean_savar_core/clean_savar_core.dart' as core;
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

class CapturedPhoto {
  const CapturedPhoto({
    this.path,
    required this.metaLabel,
    this.sizeBytes,
  });

  final String? path;
  final String metaLabel;
  final int? sizeBytes;
}

class GeoFix {
  const GeoFix({
    required this.lat,
    required this.lng,
    this.isLiveFix = true,
  });

  final double lat;
  final double lng;
  final bool isLiveFix;
}

abstract class DeviceCameraService {
  Future<CapturedPhoto?> captureCompressedPhoto({bool fromGallery = false});
}

class ImagePickerCameraService implements DeviceCameraService {
  ImagePickerCameraService({ImagePicker? picker})
      : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  @override
  Future<CapturedPhoto?> captureCompressedPhoto({bool fromGallery = false}) async {
    try {
      final XFile? file = await _picker.pickImage(
        source: fromGallery ? ImageSource.gallery : ImageSource.camera,
        maxWidth: 1280,
        maxHeight: 1280,
        imageQuality: 78,
      );
      if (file == null) return null;

      int sizeBytes = 0;
      try {
        sizeBytes = await File(file.path).length();
      } catch (_) {}

      final kb = sizeBytes > 0 ? (sizeBytes / 1024).round() : 220;
      return CapturedPhoto(
        path: file.path,
        metaLabel: '১২৮০px • $kb KB JPEG',
        sizeBytes: sizeBytes > 0 ? sizeBytes : null,
      );
    } on MissingPluginException {
      return null;
    } on PlatformException {
      return null;
    }
  }
}

abstract class DeviceLocationService {
  Future<GeoFix?> getCurrentLocation();
}

class GeolocatorLocationService implements DeviceLocationService {
  @override
  Future<GeoFix?> getCurrentLocation() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return null;

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return null;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 6),
        ),
      );
      return GeoFix(lat: pos.latitude, lng: pos.longitude, isLiveFix: true);
    } on MissingPluginException {
      return null;
    } on PlatformException {
      return null;
    } catch (_) {
      return null;
    }
  }
}

final apiClientProvider = Provider<core.CleanSavarApiClient>(
  (ref) => core.CleanSavarApiClient(),
);

final deviceCameraServiceProvider = Provider<DeviceCameraService>(
  (ref) => ImagePickerCameraService(),
);

final deviceLocationServiceProvider = Provider<DeviceLocationService>(
  (ref) => GeolocatorLocationService(),
);

/// Controls whether live `MobileScanner` camera view mounts (overridden in headless tests).
final qrCameraScannerEnabledProvider = Provider<bool>((ref) => true);
