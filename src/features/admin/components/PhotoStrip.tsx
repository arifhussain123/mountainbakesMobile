import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { PhotoViewer } from '@/shared/ui';

interface Photo {
  id: string;
  url: string;
}

/** Attachments arrive loosely typed on some endpoints (`unknown[]`) — keep only the ones with a usable URL. */
export function toPhotos(list: unknown): Photo[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((p) => {
    const rec = p as { id?: unknown; url?: unknown } | null;
    return rec && typeof rec.url === 'string' && rec.url ? [{ id: String(rec.id ?? rec.url), url: rec.url }] : [];
  });
}

/** A titled row of photo thumbnails; tap one to view it full-screen. Renders nothing without photos. */
export function PhotoStrip({ title, photos }: { title: string; photos: unknown }) {
  const theme = useAppTheme();
  const [open, setOpen] = useState<string | null>(null);
  const list = toPhotos(photos);
  if (list.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {list.map((photo) => (
          <Pressable key={photo.id} accessibilityRole="imagebutton" accessibilityLabel={`Open ${title}`} onPress={() => setOpen(photo.url)}>
            <Image source={{ uri: photo.url }} style={[styles.thumb, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]} />
          </Pressable>
        ))}
      </ScrollView>
      <PhotoViewer visible={open !== null} uri={open} accessibilityLabel={title} onClose={() => setOpen(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, gap: 6 },
  row: { gap: 8 },
  thumb: { width: 72, height: 72, borderWidth: 1 },
});
