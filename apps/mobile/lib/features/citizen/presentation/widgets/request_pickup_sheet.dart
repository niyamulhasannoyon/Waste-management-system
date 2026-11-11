import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/models/pickup_request.dart';
import '../../../../core/providers/citizen_state_provider.dart';
import '../../../../core/utils/bangla_formatters.dart';

Future<void> showRequestPickupSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => const RequestPickupSheet(),
  );
}

class RequestPickupSheet extends ConsumerStatefulWidget {
  const RequestPickupSheet({super.key});

  @override
  ConsumerState<RequestPickupSheet> createState() => _RequestPickupSheetState();
}

class _RequestPickupSheetState extends ConsumerState<RequestPickupSheet> {
  late final TextEditingController _addressController;
  final TextEditingController _notesController = TextEditingController();

  WasteCategory _selectedCategory = WasteCategory.household;
  PickupSlot _selectedSlot = PickupSlot.morning;
  int _estimatedBags = 2;

  @override
  void initState() {
    super.initState();
    _addressController = TextEditingController(
      text: ref.read(citizenStateProvider).defaultAddress,
    );
  }

  @override
  void dispose() {
    _addressController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _submitPickup() {
    final code = ref.read(citizenStateProvider.notifier).submitPickupRequest(
          addressLine: _addressController.text,
          category: _selectedCategory,
          slot: _selectedSlot,
          estimatedBags: _estimatedBags,
          notes: _notesController.text,
        );

    final earnedPoints = (_selectedCategory == WasteCategory.organic ||
            _selectedCategory == WasteCategory.recyclable)
        ? 20
        : 10;

    final messenger = ScaffoldMessenger.of(context);
    Navigator.of(context).pop();
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            'পিকআপ বুকিং সফল ($code) • +${BanglaFormatters.formatInt(earnedPoints)} পয়েন্ট',
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderStrong,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'বাসার ময়লা দিন (পিকআপ)',
                    style: TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                  tooltip: 'বন্ধ করুন',
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Text(
              'ময়লার ধরন',
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final category in WasteCategory.values)
                  ChoiceChip(
                    label: Text(category.labelBn),
                    selected: _selectedCategory == category,
                    selectedColor: AppColors.primaryGreenTint,
                    side: BorderSide(
                      color: _selectedCategory == category
                          ? AppColors.primaryGreen
                          : AppColors.borderStrong,
                    ),
                    labelStyle: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: _selectedCategory == category
                          ? AppColors.primaryGreenDark
                          : AppColors.textPrimary,
                    ),
                    onSelected: (_) => setState(() => _selectedCategory = category),
                  ),
              ],
            ),
            const SizedBox(height: 14),
            const Text(
              'সংগ্রহের সময়',
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final slot in PickupSlot.values)
                  ChoiceChip(
                    label: Text(slot.labelBn),
                    selected: _selectedSlot == slot,
                    selectedColor: AppColors.primaryGreenTint,
                    side: BorderSide(
                      color: _selectedSlot == slot
                          ? AppColors.primaryGreen
                          : AppColors.borderStrong,
                    ),
                    labelStyle: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: _selectedSlot == slot
                          ? AppColors.primaryGreenDark
                          : AppColors.textPrimary,
                    ),
                    onSelected: (_) => setState(() => _selectedSlot = slot),
                  ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'আনুমানিক ব্যাগ / বালতি সংখ্যা',
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                IconButton.outlined(
                  onPressed: _estimatedBags > 1
                      ? () => setState(() => _estimatedBags -= 1)
                      : null,
                  icon: const Icon(Icons.remove_rounded),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    '${BanglaFormatters.formatInt(_estimatedBags)}টি',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                IconButton.outlined(
                  onPressed: _estimatedBags < 10
                      ? () => setState(() => _estimatedBags += 1)
                      : null,
                  icon: const Icon(Icons.add_rounded),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _addressController,
              decoration: const InputDecoration(
                labelText: 'বাসার ঠিকানা',
                hintText: 'বাসা নম্বর, রোড ও এলাকা লিখুন',
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'অতিরিক্ত নির্দেশনা (ঐচ্ছিক)',
                hintText: 'যেমন: নিচতলার গেটের পাশে রাখা আছে',
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: FilledButton.icon(
                onPressed: _submitPickup,
                icon: const Icon(Icons.check_circle_outline_rounded, size: 20),
                label: const Text('পিকআপ রিকোয়েস্ট পাঠান'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
