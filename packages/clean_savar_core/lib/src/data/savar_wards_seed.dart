import '../models/savar_models.dart';

const List<SavarWard> savarWardsSeed = [
  SavarWard(
    id: 1,
    code: 'WARD-01',
    nameBn: 'ওয়ার্ড ১ — গেন্ডা ও থানা স্ট্যান্ড',
    zoneLabelBn: 'থানা স্ট্যান্ড',
    supervisorName: 'মোঃ রফিকুল ইসলাম',
    supervisorPhone: '01711-240101',
    centroidLat: 23.845,
    centroidLng: 90.258,
  ),
  SavarWard(
    id: 2,
    code: 'WARD-02',
    nameBn: 'ওয়ার্ড ২ — সাভার বাজার ও নয়া বাজার',
    zoneLabelBn: 'সাভার বাজার',
    supervisorName: 'আব্দুল করিম',
    supervisorPhone: '01711-240102',
    centroidLat: 23.855,
    centroidLng: 90.255,
  ),
  SavarWard(
    id: 3,
    code: 'WARD-03',
    nameBn: 'ওয়ার্ড ৩ — ব্যাংক টাউন ও নামা বাজার',
    zoneLabelBn: 'ব্যাংক টাউন',
    supervisorName: 'নাজমুল হক',
    supervisorPhone: '01711-240103',
    centroidLat: 23.855,
    centroidLng: 90.266,
  ),
  SavarWard(
    id: 4,
    code: 'WARD-04',
    nameBn: 'ওয়ার্ড ৪ — সিআরপি রোড ও ছায়াবিথী',
    zoneLabelBn: 'সিআরপি রোড',
    supervisorName: 'ফারহানা আক্তার',
    supervisorPhone: '01711-240104',
    centroidLat: 23.865,
    centroidLng: 90.258,
  ),
  SavarWard(
    id: 5,
    code: 'WARD-05',
    nameBn: 'ওয়ার্ড ৫ — রেডিও কলোনি ও উলাইল',
    zoneLabelBn: 'রেডিও কলোনি',
    supervisorName: 'কামরুল হাসান',
    supervisorPhone: '01711-240105',
    centroidLat: 23.846,
    centroidLng: 90.271,
  ),
  SavarWard(
    id: 6,
    code: 'WARD-06',
    nameBn: 'ওয়ার্ড ৬ — তালবাগ ও আড়াপাড়া',
    zoneLabelBn: 'তালবাগ',
    supervisorName: 'শাহীন আলম',
    supervisorPhone: '01711-240106',
    centroidLat: 23.859,
    centroidLng: 90.247,
  ),
  SavarWard(
    id: 7,
    code: 'WARD-07',
    nameBn: 'ওয়ার্ড ৭ — রাজাশন ও কর্ণপাড়া',
    zoneLabelBn: 'রাজাশন',
    supervisorName: 'জাহাঙ্গীর কবির',
    supervisorPhone: '01711-240107',
    centroidLat: 23.867,
    centroidLng: 90.272,
  ),
  SavarWard(
    id: 8,
    code: 'WARD-08',
    nameBn: 'ওয়ার্ড ৮ — ডগরমোড়া ও জামসিং',
    zoneLabelBn: 'ডগরমোড়া',
    supervisorName: 'সোহেল রানা',
    supervisorPhone: '01711-240108',
    centroidLat: 23.877,
    centroidLng: 90.259,
  ),
  SavarWard(
    id: 9,
    code: 'WARD-09',
    nameBn: 'ওয়ার্ড ৯ — জাহাঙ্গীরনগর সংলগ্ন ও ইসলামনগর',
    zoneLabelBn: 'ইসলামনগর',
    supervisorName: 'মাহমুদুর রহমান',
    supervisorPhone: '01711-240109',
    centroidLat: 23.883,
    centroidLng: 90.274,
  ),
];

SavarWard resolveNearestWardOffline(double lat, double lng) {
  var best = savarWardsSeed.first;
  var bestDist = double.infinity;
  for (final w in savarWardsSeed) {
    final dLat = w.centroidLat - lat;
    final dLng = w.centroidLng - lng;
    final d = dLat * dLat + dLng * dLng;
    if (d < bestDist) {
      bestDist = d;
      best = w;
    }
  }
  return best;
}
