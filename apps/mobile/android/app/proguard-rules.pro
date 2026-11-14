# Flutter wrapper & engine
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# Keep annotations and line numbers for crash diagnostics
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable

# Google Play Services & Firebase Core
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.auth.api.signin.** { *; }
-keep class io.flutter.plugins.googlesignin.** { *; }

# Firebase Authentication & Play Services Phone Login (SMS Retriever / SafetyNet / Play Integrity)
-keep class com.google.firebase.auth.** { *; }
-keep class com.google.firebase.auth.internal.** { *; }
-keep class com.google.android.gms.auth.api.phone.** { *; }
-keep class com.google.android.gms.tasks.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class io.flutter.plugins.firebase.auth.** { *; }
-keep class io.flutter.plugins.firebase.core.** { *; }

# AndroidX Credentials (used by modern Firebase Auth & Play Services)
-keep class androidx.credentials.** { *; }
-keep class androidx.credentials.playservices.** { *; }
-dontwarn androidx.credentials.**

# Google Play Services & ML Kit Barcode (unbundled)
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**

# Network & JSON Models / Serialization
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class org.json.** { *; }

# Flutter plugin implementations
-keep class com.baseflow.geolocator.** { *; }
-keep class io.flutter.plugins.imagepicker.** { *; }
-keep class io.flutter.plugins.urllauncher.** { *; }
-keep class io.flutter.plugins.sharedpreferences.** { *; }
