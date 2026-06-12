/**
 * riwayat.tsx — Tab Riwayat.
 *
 * REFACTOR:
 *   - State + logic → useRiwayat hook
 *   - renderItem → TransaksiRow komponen
 *   - BottomSheet content → TransaksiDetail komponen
 *
 * PERUBAHAN (FINISHING):
 *   - PULL-TO-REFRESH: FlatList kini punya RefreshControl (Audit B5 — beranda
 *     sudah punya, riwayat belum). State refreshing + onRefresh dari useRiwayat.
 */
import { useWindowDimensions, RefreshControl } from 'react-native';
import { FlatList } from 'react-native';
import { Colors, Spacing } from '../../constants/colors';
import { useRiwayat } from '../../hooks/use-riwayat';
import { hitungStrukFont } from '../../lib/printer/struk';

import ScreenLayout from '../../components/ui/screen-layout';
import BottomSheet from '../../components/ui/bottom-sheet';
import Icon from '../../components/ui/icon';
import EmptyState from '../../components/ui/empty-state';
import TransaksiRow from '../../components/riwayat/transaksi-row';
import TransaksiDetail from '../../components/riwayat/transaksi-detail';
import Badge from '../../components/ui/badge';
import { Text, StyleSheet, Pressable } from 'react-native';
import { FontSize } from '../../constants/colors';
import type { Transaksi } from '../../lib/db/database';

// Padding untuk hitung font struk: paddingHorizontal lg*2 + kertas md*2
const STRUK_PADDING = Spacing.lg * 2 + Spacing.md * 2;

function labelStatus(s: Transaksi['status']): string {
  if (s === 'void') return 'VOID';
  if (s === 'refund') return 'REFUND';
  return '';
}

export default function RiwayatScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const rv = useRiwayat();

  const fontMetrics = hitungStrukFont(
    rv.config?.paper_width ?? 58,
    windowWidth - STRUK_PADDING
  );

  const detailVisible = !!rv.detail;

  return (
    <ScreenLayout
      title="Riwayat"
      subtitle={`${rv.riwayat.length} transaksi tercatat`}
      bodyPadding={0}
    >
      <FlatList
        data={rv.riwayat}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={rv.refreshing}
            onRefresh={() => { void rv.onRefresh(); }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <TransaksiRow
            item={item}
            onPress={() => { void rv.bukaDetail(item); }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="receipt"
            judul="Belum ada transaksi"
            deskripsi="Transaksi yang Anda simpan di kasir akan muncul di sini."
          />
        }
      />

      <BottomSheet
        visible={detailVisible}
        onClose={rv.tutupDetail}
        scrollable={false}
        title={
          rv.refundMode ? 'Refund Transaksi' : rv.detail?.nomor_order
        }
        headerRight={
          rv.refundMode ? (
            <Pressable
              onPress={() => rv.setRefundMode(false)}
              hitSlop={8}
              style={styles.kembaliRow}
            >
              <Icon name="chevron-left" size={18} color={Colors.primary} />
              <Text style={styles.kembaliLink}>Detail</Text>
            </Pressable>
          ) : rv.detail && rv.detail.status !== 'completed' ? (
            <Badge
              variant={rv.detail.status === 'refund' ? 'warning' : 'danger'}
              label={labelStatus(rv.detail.status)}
            />
          ) : undefined
        }
      >
        <TransaksiDetail
          detail={rv.detail}
          detailItems={rv.detailItems}
          config={rv.config}
          fontMetrics={fontMetrics}
          refundMode={rv.refundMode}
          refundAlasan={rv.refundAlasan}
          voidLoading={rv.voidLoading}
          mencetak={rv.mencetak}
          refundLoading={rv.refundLoading}
          onTutup={rv.tutupDetail}
          onVoid={rv.handleVoid}
          onCetak={() => { void rv.cetakUlang(); }}
          onSubmitRefund={() => { void rv.submitRefund(); }}
          setRefundMode={rv.setRefundMode}
          setRefundAlasan={rv.setRefundAlasan}
        />
      </BottomSheet>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  kembaliRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  kembaliLink: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
});
