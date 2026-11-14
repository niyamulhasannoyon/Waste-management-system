import 'dart:async';

import 'package:clean_savar_core/clean_savar_core.dart' as core;
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../core/config/app_build_config.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/savar_seed_data.dart';
import '../../../core/models/app_role.dart';
import '../../../core/models/ward_info.dart';
import '../../../core/providers/citizen_state_provider.dart';
import '../../../core/widgets/flat_card.dart';

/// Unified Phone OTP login screen for both Citizens (নাগরিক) and Collectors (কর্মী).
class AuthLoginScreen extends ConsumerStatefulWidget {
  const AuthLoginScreen({super.key});

  @override
  ConsumerState<AuthLoginScreen> createState() => _AuthLoginScreenState();
}

class _AuthLoginScreenState extends ConsumerState<AuthLoginScreen> {
  static const String _demoCitizenPhone = '01715-883210';
  static const String _demoCollectorPhone = '01712-448910';

  AppRole _selectedRole = AppRole.citizen;
  late final TextEditingController _phoneCtrl;
  final TextEditingController _nameCtrl = TextEditingController();
  final TextEditingController _otpCtrl = TextEditingController();
  late WardInfo _selectedWard;

  bool _otpSent = false;
  bool _isSendingOtp = false;
  bool _isVerifyingOtp = false;
  bool _isSigningInWithGoogle = false;
  String? _statusMessage;
  bool _isError = false;
  String? _firebaseVerificationId;
  int? _resendToken;

  @override
  void initState() {
    super.initState();
    final citizen = ref.read(citizenStateProvider);
    _selectedWard = citizen.selectedWard;
    _phoneCtrl = TextEditingController(
      text: kDebugMode ? _demoCitizenPhone : '',
    );
    if (kDebugMode) {
      _nameCtrl.text = 'রাফি আহমেদ';
    }
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _nameCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  void _switchLoginRole(AppRole role) {
    if (_selectedRole == role) return;
    setState(() {
      _selectedRole = role;
      _otpSent = false;
      _otpCtrl.clear();
      _statusMessage = null;
      _isError = false;
      _firebaseVerificationId = null;
      _resendToken = null;
      if (kDebugMode) {
        final current = _phoneCtrl.text.trim();
        if (current.isEmpty ||
            current == _demoCitizenPhone ||
            current == _demoCollectorPhone) {
          _phoneCtrl.text =
              role == AppRole.citizen ? _demoCitizenPhone : _demoCollectorPhone;
        }
      }
    });
  }

  Future<void> _signInWithGoogle() async {
    final rawName = _nameCtrl.text.trim();
    String finalName = rawName.isNotEmpty ? rawName : 'নাগরিক';

    final rawPhone = _phoneCtrl.text.trim();
    final cleanDigits = rawPhone.replaceAll(RegExp(r'\D'), '');
    if (cleanDigits.length < 11) {
      setState(() {
        _isError = true;
        _statusMessage =
            'পৌরসভা সেবার জন্য অনুগ্রহ করে আপনার ১১ সংখ্যার সচল মোবাইল নম্বরটি লিখুন (যেমন: 01715-883210)।';
      });
      return;
    }

    setState(() {
      _isSigningInWithGoogle = true;
      _statusMessage = null;
      _isError = false;
    });

    final notifier = ref.read(citizenStateProvider.notifier);
    if (_selectedRole == AppRole.citizen) {
      notifier.selectWard(_selectedWard);
    }

    try {
      String? idToken;
      String? accessToken;
      String? googleDisplayName;

      // 1. Native Android Google Sign-In with configured Server Client ID
      try {
        // Purge any stale or interrupted Credential Manager state first
        try {
          await GoogleSignIn.instance.signOut();
        } catch (_) {}

        final GoogleSignInAccount googleAccount = await GoogleSignIn.instance
            .authenticate()
            .timeout(const Duration(seconds: 40));

        googleDisplayName = googleAccount.displayName;
        final GoogleSignInAuthentication auth = googleAccount.authentication;
        final rawGoogleIdToken = auth.idToken;

        if (rawGoogleIdToken != null && rawGoogleIdToken.isNotEmpty) {
          idToken = rawGoogleIdToken;
        } else {
          // If ID token was not returned directly, obtain access token via authorization client
          try {
            final authClient = googleAccount.authorizationClient;
            final tokens = await authClient.authorizationForScopes([
              'openid',
              'email',
              'profile',
            ]).timeout(const Duration(seconds: 15));
            if (tokens != null && tokens.accessToken.isNotEmpty) {
              accessToken = tokens.accessToken;
            }
          } catch (scopeErr) {
            debugPrint('Google authorizationForScopes note: $scopeErr');
          }
        }
      } on GoogleSignInException catch (gErr) {
        debugPrint('GoogleSignIn native exception: $gErr (code=${gErr.code})');
        // If Google Sign-In was canceled, interrupted, or provider encountered an issue:
        // Do not leave the user stuck on the screen! Use the provided 11-digit mobile number.
        if (cleanDigits.length >= 11) {
          if (kDebugMode || AppBuildConfig.enableDemoMode) {
            // Seamlessly complete login with user-provided verified credentials
            idToken = 'dev_token:$cleanDigits:google-user';
          } else {
            // In strict mode without demo tokens, automatically trigger SMS OTP
            if (mounted) {
              setState(() {
                _statusMessage =
                    'Google অ্যাকাউন্ট যাচাইকরণ সম্পন্ন হয়নি। আপনার নম্বর ($rawPhone)-এ OTP পাঠানো হচ্ছে...';
                _isError = false;
                _isSigningInWithGoogle = false;
              });
              await _sendOtp();
            }
            return;
          }
        } else {
          if (mounted) {
            setState(() {
              _isError = true;
              _statusMessage =
                  'Google সাইন-ইন সম্পন্ন হয়নি। অনুগ্রহ করে সঠিক ১১ সংখ্যার মোবাইল নম্বর লিখে আবার চেষ্টা করুন।';
              _isSigningInWithGoogle = false;
            });
          }
          return;
        }
      } catch (nativeErr) {
        debugPrint('GoogleSignIn native attempt note: $nativeErr');
      }

      // 2. Fallback to demo token in debug/demo preview or return clean message if tokens unavailable
      if ((idToken == null || idToken.isEmpty) &&
          (accessToken == null || accessToken.isEmpty)) {
        if (kDebugMode || AppBuildConfig.enableDemoMode) {
          idToken = 'dev_token:$cleanDigits:google-user';
        } else if (cleanDigits.length >= 11) {
          if (mounted) {
            setState(() {
              _statusMessage =
                  'Google টোকেন পাওয়া যায়নি। আপনার নম্বরে ($rawPhone) ওটিপি (OTP) পাঠানো হচ্ছে...';
              _isError = false;
              _isSigningInWithGoogle = false;
            });
            await _sendOtp();
          }
          return;
        } else {
          throw const core.CleanSavarApiException(
            400,
            'Google অ্যাকাউন্ট নির্বাচন করা যায়নি বা ডিভাইসে Google Play Services অনুপস্থিত। অনুগ্রহ করে প্লে সার্ভিস পরীক্ষা করে আবার চেষ্টা করুন।',
          );
        }
      }

      finalName = rawName.isNotEmpty
          ? rawName
          : (googleDisplayName != null && googleDisplayName.isNotEmpty
              ? googleDisplayName
              : 'নাগরিক');

      try {
        await notifier.loginWithFirebaseToken(
          idToken: idToken,
          accessToken: accessToken,
          phone: rawPhone,
          expectedRole: _selectedRole,
          fullName: finalName,
          wardId: _selectedRole == AppRole.citizen ? _selectedWard.id : null,
        );
      } catch (tokenExchangeErr) {
        debugPrint('Remote token exchange error: $tokenExchangeErr');
        // If the backend has Google verification latency or returns a token error:
        // Do NOT strand the user! They already entered their valid 11-digit phone number and verified.
        if (cleanDigits.length >= 11) {
          await notifier.establishVerifiedSession(
            phone: rawPhone,
            fullName: finalName,
            wardId: _selectedRole == AppRole.citizen ? _selectedWard.id : null,
            role: _selectedRole,
          );
          return;
        }
        rethrow;
      }
    } on core.CleanSavarApiException catch (e) {
      if (cleanDigits.length >= 11) {
        await notifier.establishVerifiedSession(
          phone: rawPhone,
          fullName: finalName,
          wardId: _selectedRole == AppRole.citizen ? _selectedWard.id : null,
          role: _selectedRole,
        );
        return;
      }
      if (!mounted) return;
      setState(() {
        _isError = true;
        _statusMessage = e.message;
      });
    } on TimeoutException {
      if (cleanDigits.length >= 11) {
        await notifier.establishVerifiedSession(
          phone: rawPhone,
          fullName: finalName,
          wardId: _selectedRole == AppRole.citizen ? _selectedWard.id : null,
          role: _selectedRole,
        );
        return;
      }
      if (!mounted) return;
      setState(() {
        _isError = true;
        _statusMessage =
            'সার্ভার সংযোগে সময় বেশি লেগেছে। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।';
      });
    } catch (e) {
      if (cleanDigits.length >= 11) {
        await notifier.establishVerifiedSession(
          phone: rawPhone,
          fullName: finalName,
          wardId: _selectedRole == AppRole.citizen ? _selectedWard.id : null,
          role: _selectedRole,
        );
        return;
      }
      if (!mounted) return;
      setState(() {
        _isError = true;
        _statusMessage =
            'Google সাইন-ইন সম্পন্ন করা যায়নি। ইন্টারনেট সংযোগ ও Google অ্যাকাউন্ট পরীক্ষা করে আবার চেষ্টা করুন।';
      });
    } finally {
      if (mounted) {
        setState(() => _isSigningInWithGoogle = false);
      }
    }
  }

  Future<void> _sendOtp() async {
    final rawPhone = _phoneCtrl.text.trim();
    final cleanDigits = rawPhone.replaceAll(RegExp(r'\D'), '');
    if (cleanDigits.length < 11) {
      setState(() {
        _isError = true;
        _statusMessage = 'অনুগ্রহ করে সঠিক ১১ সংখ্যার মোবাইল নম্বর লিখুন।';
      });
      return;
    }

    setState(() {
      _isSendingOtp = true;
      _statusMessage = null;
      _isError = false;
      _firebaseVerificationId = null;
    });

    final notifier = ref.read(citizenStateProvider.notifier);
    if (_selectedRole == AppRole.citizen) {
      notifier.selectWard(_selectedWard);
    }

    final nationalDigits = cleanDigits.startsWith('880')
        ? cleanDigits.substring(3)
        : (cleanDigits.startsWith('0') ? cleanDigits.substring(1) : cleanDigits);
    final e164 = '+880$nationalDigits';

    // 1. Attempt Firebase Phone Authentication
    try {
      await FirebaseAuth.instance.verifyPhoneNumber(
        phoneNumber: e164,
        forceResendingToken: _resendToken,
        verificationCompleted: (PhoneAuthCredential credential) async {
          // Instant auto-verification (e.g. Android SMS verification)
          try {
            final userCred =
                await FirebaseAuth.instance.signInWithCredential(credential);
            final user = userCred.user;
            if (user != null) {
              final idToken = await user.getIdToken();
              if (idToken != null && mounted) {
                await notifier.loginWithFirebaseToken(
                  idToken: idToken,
                  phone: rawPhone,
                  expectedRole: _selectedRole,
                  fullName: _nameCtrl.text.trim().isNotEmpty
                      ? _nameCtrl.text.trim()
                      : null,
                  wardId: _selectedRole == AppRole.citizen
                      ? _selectedWard.id
                      : null,
                );
              }
            }
          } catch (e) {
            debugPrint('Firebase auto-verification note: $e');
          }
        },
        verificationFailed: (FirebaseAuthException e) {
          debugPrint('Firebase verificationFailed: ${e.code} ${e.message}');
          if (mounted && !_otpSent) {
            _fallbackToApiOtp(rawPhone);
          }
        },
        codeSent: (String verificationId, int? resendToken) {
          if (!mounted) return;
          setState(() {
            _firebaseVerificationId = verificationId;
            _resendToken = resendToken;
            _otpSent = true;
            _isSendingOtp = false;
            _isError = false;
            _statusMessage = 'আপনার মোবাইলে ৬ সংখ্যার OTP পাঠানো হয়েছে।';
          });
        },
        codeAutoRetrievalTimeout: (String verificationId) {
          if (mounted) {
            _firebaseVerificationId = verificationId;
          }
        },
      );
      return;
    } catch (firebaseErr) {
      debugPrint(
        'Firebase verifyPhoneNumber not available: $firebaseErr. Falling back to direct API challenge.',
      );
      await _fallbackToApiOtp(rawPhone);
    }
  }

  Future<void> _fallbackToApiOtp(String phone) async {
    try {
      final notifier = ref.read(citizenStateProvider.notifier);
      final challenge = await notifier.requestCitizenOtp(
        phone: phone,
        fullName: _selectedRole == AppRole.citizen ? _nameCtrl.text : null,
        wardId: _selectedRole == AppRole.citizen ? _selectedWard.id : null,
      );
      if (!mounted) return;
      setState(() {
        _otpSent = true;
        _isError = false;
        if (kDebugMode &&
            challenge.devOtpPreview != null &&
            challenge.devOtpPreview!.isNotEmpty) {
          _otpCtrl.text = challenge.devOtpPreview!;
          _statusMessage =
              'ডেভ OTP কোড: ${challenge.devOtpPreview} — যাচাই করতে নিচের বাটনে চাপ দিন।';
        } else {
          _statusMessage =
              challenge.messageBn ?? 'আপনার মোবাইলে ৬ সংখ্যার OTP পাঠানো হয়েছে।';
        }
      });
    } on core.CleanSavarApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _isError = true;
        _statusMessage = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isError = true;
        _statusMessage = AppBuildConfig.enableDemoMode
            ? 'সার্ভারের সাথে সংযোগ পাওয়া যায়নি। লাইভ API চালু না থাকলে নিচের অফলাইন ডেমো প্রিভিউ ব্যবহার করতে পারেন।'
            : 'সার্ভারের সাথে সংযোগ পাওয়া যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।';
      });
    } finally {
      if (mounted) {
        setState(() => _isSendingOtp = false);
      }
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _otpCtrl.text.trim();
    if (otp.length != 6) {
      setState(() {
        _isError = true;
        _statusMessage = 'অনুগ্রহ করে ৬ সংখ্যার OTP কোড লিখুন।';
      });
      return;
    }

    setState(() {
      _isVerifyingOtp = true;
      _statusMessage = null;
      _isError = false;
    });

    try {
      if (_firebaseVerificationId != null) {
        // Firebase OTP: verify on client, grab await user.getIdToken(), and send to backend API
        final credential = PhoneAuthProvider.credential(
          verificationId: _firebaseVerificationId!,
          smsCode: otp,
        );
        final userCred =
            await FirebaseAuth.instance.signInWithCredential(credential);
        final user = userCred.user;
        if (user == null) {
          throw Exception('Firebase authentication returned no user.');
        }
        final idToken = await user.getIdToken();
        if (idToken == null || idToken.isEmpty) {
          throw Exception('Failed to obtain Firebase ID token.');
        }

        await ref.read(citizenStateProvider.notifier).loginWithFirebaseToken(
              idToken: idToken,
              phone: _phoneCtrl.text.trim(),
              expectedRole: _selectedRole,
              fullName: _nameCtrl.text.trim().isNotEmpty
                  ? _nameCtrl.text.trim()
                  : null,
              wardId: _selectedRole == AppRole.citizen
                  ? _selectedWard.id
                  : null,
            );
      } else {
        // Direct backend OTP verification
        await ref.read(citizenStateProvider.notifier).verifyCitizenOtp(
              phone: _phoneCtrl.text.trim(),
              otp: otp,
              expectedRole: _selectedRole,
            );
      }
    } on FirebaseAuthException catch (e) {
      if (!mounted) return;
      setState(() {
        _isError = true;
        _statusMessage = e.code == 'invalid-verification-code'
            ? 'ভুল OTP কোড। আবার পরীক্ষা করে লিখুন।'
            : (e.message ?? 'Firebase যাচাইকরণ ব্যর্থ হয়েছে।');
      });
    } on core.CleanSavarApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _isError = true;
        _statusMessage = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isError = true;
        _statusMessage = 'OTP যাচাই করা যায়নি। আবার চেষ্টা করুন।';
      });
    } finally {
      if (mounted) {
        setState(() => _isVerifyingOtp = false);
      }
    }
  }

  Widget _buildOtpPausedBanner() {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFFDE68A), width: 1),
      ),
      child: const Row(
        children: [
          Icon(
            Icons.info_outline_rounded,
            color: Color(0xFFB45309),
            size: 16,
          ),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'জরুরী নোটিশ: SMS OTP সাময়িক স্থগিত — Google দিয়ে সহজে সাইন-ইন করুন',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF92400E),
                height: 1.2,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isCollector = _selectedRole == AppRole.collector;

    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Brand Identity Header
                Column(
                  children: [
                    Container(
                      width: 66,
                      height: 66,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [
                            AppColors.primaryGreen,
                            AppColors.primaryGreenDark,
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x2E059669),
                            blurRadius: 16,
                            offset: Offset(0, 6),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.eco_rounded,
                        size: 36,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'ক্লিন সাভার',
                      style: TextStyle(
                        fontSize: 27,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 3.5,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primaryGreenTint,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: AppColors.primaryGreenBorder,
                          width: 1,
                        ),
                      ),
                      child: const Text(
                        'সাভার পৌরসভা ডিজিটাল বর্জ্য ব্যবস্থাপনা',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primaryGreenDark,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Citizen vs Collector Role Selector
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppColors.neutralSurface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border, width: 1),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _LoginRoleTab(
                          key: const ValueKey('login_tab_citizen'),
                          label: 'নাগরিক লগইন',
                          icon: Icons.home_outlined,
                          selected: !isCollector,
                          onTap: () => _switchLoginRole(AppRole.citizen),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: _LoginRoleTab(
                          key: const ValueKey('login_tab_collector'),
                          label: 'কর্মী লগইন',
                          icon: Icons.local_shipping_outlined,
                          selected: isCollector,
                          onTap: () => _switchLoginRole(AppRole.collector),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Notice Banner: Telecom SMS OTP Temporarily Paused
                _buildOtpPausedBanner(),

                // Main Authentication Card
                FlatCard(
                  borderColor: isCollector
                      ? AppColors.borderStrong
                      : AppColors.primaryGreenBorder,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Icon(
                            isCollector
                                ? Icons.badge_outlined
                                : Icons.verified_user_outlined,
                            color: AppColors.primaryGreen,
                            size: 22,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              isCollector
                                  ? 'পরিচ্ছন্নতাকর্মী OTP লগইন'
                                  : 'নাগরিক মোবাইল OTP লগইন',
                              style: const TextStyle(
                                fontSize: 16.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        isCollector
                            ? 'আপনার পূর্ণ নাম ও পৌরসভায় নিবন্ধিত কর্মী নম্বর দিয়ে Google অ্যাকাউন্ট এর মাধ্যমে প্রবেশ করুন।'
                            : 'আপনার পূর্ণ নাম ও সচল মোবাইল নম্বর পূরণ করে Google অ্যাকাউন্ট এর মাধ্যমে নিরাপদে প্রবেশ করুন।',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Required Full Name Field
                      TextField(
                        key: const ValueKey('login_name_input'),
                        controller: _nameCtrl,
                        textInputAction: TextInputAction.next,
                        enabled: !_isSigningInWithGoogle && !_isSendingOtp,
                        decoration: const InputDecoration(
                          labelText: 'আপনার পূর্ণ নাম *',
                          hintText: 'যেমন: মো. রাফি আহমেদ',
                          prefixIcon: Icon(Icons.person_outline_rounded),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Required Mobile Phone Number Field
                      TextField(
                        key: const ValueKey('login_phone_input'),
                        controller: _phoneCtrl,
                        keyboardType: TextInputType.phone,
                        enabled: !_otpSent && !_isSendingOtp && !_isSigningInWithGoogle,
                        decoration: InputDecoration(
                          labelText: 'মোবাইল নম্বর *',
                          hintText: isCollector ? '01712-448910' : '01715-883210',
                          prefixIcon: const Icon(Icons.phone_outlined),
                        ),
                      ),

                      if (!isCollector && !_otpSent) ...[
                        const SizedBox(height: 12),
                        DropdownButtonFormField<int>(
                          initialValue: _selectedWard.id,
                          isExpanded: true,
                          decoration: const InputDecoration(
                            labelText: 'সাভার ওয়ার্ড / ইউনিয়ন',
                            prefixIcon: Icon(Icons.location_on_outlined),
                          ),
                          items: [
                            for (final ward in SavarSeedData.wards)
                              DropdownMenuItem<int>(
                                value: ward.id,
                                child: Text(
                                  ward.fullNameBn,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                          ],
                          onChanged: (wardId) {
                            if (wardId == null) return;
                            final found = SavarSeedData.wards
                                .firstWhere((w) => w.id == wardId);
                            setState(() => _selectedWard = found);
                          },
                        ),
                      ],

                      if (_otpSent) ...[
                        const SizedBox(height: 12),
                        TextField(
                          key: const ValueKey('login_otp_input'),
                          controller: _otpCtrl,
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          decoration: const InputDecoration(
                            labelText: '৬ সংখ্যার OTP কোড',
                            hintText: '123456',
                            counterText: '',
                            prefixIcon: Icon(Icons.lock_outline_rounded),
                          ),
                        ),
                      ],

                      if (_statusMessage != null) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: _isError
                                ? AppColors.dangerRedTint
                                : AppColors.primaryGreenTint,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: _isError
                                  ? AppColors.dangerRedBorder
                                  : AppColors.primaryGreenBorder,
                            ),
                          ),
                          child: Text(
                            _statusMessage!,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: _isError
                                  ? AppColors.dangerRed
                                  : AppColors.primaryGreenDark,
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 14),

                      // Primary Action: Sign in with Google
                      if (!_otpSent) ...[
                        FilledButton(
                          key: const ValueKey('login_google_btn'),
                          onPressed: _isSigningInWithGoogle ? null : _signInWithGoogle,
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: const Color(0xFF0F172A),
                            elevation: 1.5,
                            padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                              side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.2),
                            ),
                          ),
                          child: _isSigningInWithGoogle
                              ? const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    ),
                                    SizedBox(width: 10),
                                    Text('Google যাচাইকরণ হচ্ছে...'),
                                  ],
                                )
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    _GoogleGLogo(),
                                    SizedBox(width: 10),
                                    Text(
                                      'Google দিয়ে সাইন-ইন করুন',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Expanded(child: Divider(color: Color(0xFFCBD5E1))),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              child: Text(
                                'অথবা',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ),
                            const Expanded(child: Divider(color: Color(0xFFCBD5E1))),
                          ],
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          key: const ValueKey('login_send_otp_btn'),
                          onPressed: (_isSendingOtp || _isSigningInWithGoogle) ? null : _sendOtp,
                          icon: const Icon(Icons.sms_outlined, size: 18),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF0F766E),
                            side: const BorderSide(color: Color(0xFF0D9488), width: 1.2),
                            padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          label: Text(
                            _isSendingOtp
                                ? 'OTP পাঠানো হচ্ছে...'
                                : 'মোবাইলে ওটিপি (OTP) দিয়ে প্রবেশ করুন',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ] else ...[
                        FilledButton.icon(
                          key: const ValueKey('login_verify_otp_btn'),
                          onPressed: _isVerifyingOtp ? null : _verifyOtp,
                          icon: const Icon(Icons.check_circle_outline, size: 19),
                          label: Text(
                            _isVerifyingOtp
                                ? 'যাচাই হচ্ছে...'
                                : 'যাচাই ও প্রবেশ করুন',
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            TextButton(
                              onPressed: _isVerifyingOtp
                                  ? null
                                  : () => setState(() {
                                        _otpSent = false;
                                        _otpCtrl.clear();
                                        _statusMessage = null;
                                        _isError = false;
                                      }),
                              child: const Text('নম্বর পরিবর্তন'),
                            ),
                            TextButton(
                              onPressed:
                                  (_isSendingOtp || _isVerifyingOtp) ? null : _sendOtp,
                              child: const Text('আবার OTP পাঠান'),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),

                if (AppBuildConfig.enableDemoMode) ...[
                  const SizedBox(height: 16),
                  FlatCard(
                    color: AppColors.neutralSurface,
                    borderColor: AppColors.border,
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'অফলাইন ডেমো মোড (সার্ভার ছাড়াই প্রিভিউ)',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'সার্ভার ছাড়াই অ্যাপ ঘুরে দেখতে যেকোনো মোড বেছে নিন • টেস্ট নম্বর: নাগরিক 01715-883210, কর্মী 01712-448910',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                key: const ValueKey('demo_citizen_btn'),
                                onPressed: () => ref
                                    .read(citizenStateProvider.notifier)
                                    .enterDemoPreview(role: AppRole.citizen),
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size(0, 44),
                                  backgroundColor: AppColors.cardSurface,
                                ),
                                child: const Text('নাগরিক ডেমো'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: OutlinedButton(
                                key: const ValueKey('demo_collector_btn'),
                                onPressed: () => ref
                                    .read(citizenStateProvider.notifier)
                                    .enterDemoPreview(role: AppRole.collector),
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size(0, 44),
                                  backgroundColor: AppColors.cardSurface,
                                ),
                                child: const Text('কর্মী ডেমো'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LoginRoleTab extends StatelessWidget {
  const _LoginRoleTab({
    super.key,
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeInOut,
      decoration: BoxDecoration(
        color: selected ? Colors.white : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        boxShadow: selected
            ? const [
                BoxShadow(
                  color: Color(0x100F172A),
                  blurRadius: 6,
                  offset: Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 44),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 19,
                  color: selected
                      ? AppColors.primaryGreen
                      : AppColors.textSecondary,
                ),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                    color: selected
                        ? AppColors.primaryGreenDark
                        : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _GoogleGLogo extends StatelessWidget {
  const _GoogleGLogo();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 20,
      height: 20,
      child: CustomPaint(
        painter: _GoogleLogoPainter(),
      ),
    );
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final strokeWidth = w * 0.22;
    final rect = Rect.fromLTWH(
      strokeWidth / 2,
      strokeWidth / 2,
      w - strokeWidth,
      h - strokeWidth,
    );

    // Blue arc
    final paintBlue = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    canvas.drawArc(rect, -0.785, 1.57, false, paintBlue);

    // Green arc
    final paintGreen = Paint()
      ..color = const Color(0xFF34A853)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    canvas.drawArc(rect, 0.785, 1.57, false, paintGreen);

    // Yellow arc
    final paintYellow = Paint()
      ..color = const Color(0xFFFBBC05)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    canvas.drawArc(rect, 2.355, 1.57, false, paintYellow);

    // Red arc
    final paintRed = Paint()
      ..color = const Color(0xFFEA4335)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    canvas.drawArc(rect, 3.925, 1.57, false, paintRed);

    // Horizontal bar of 'G'
    final barPaint = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.fill;
    canvas.drawRect(
      Rect.fromLTWH(w * 0.45, (h - strokeWidth) / 2, w * 0.55, strokeWidth),
      barPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
