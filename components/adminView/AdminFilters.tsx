import React from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { AdminSearchBarStyles } from '../../styles/global';

export type Field = { key: string; label: string };

// LEFT: Organizer (single-select priority)
export function OrganizerControl({
  fields,
  priority,
  onChangePriority,
  open,
  onToggle,
  onClose,
}: {
  fields: Field[];
  priority: string;
  onChangePriority: (key: string) => void;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <Pressable
        accessibilityLabel="Toggle organizer"
        onPress={onToggle}
        style={AdminSearchBarStyles.iconBtn}
      >
        <View style={AdminSearchBarStyles.hLine} />
        <View style={AdminSearchBarStyles.hLine} />
        <View style={AdminSearchBarStyles.hLine} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {/* dark overlay BEHIND the card */}
          <Pressable
            onPress={onClose}
            pointerEvents="box-only"
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 1 }}
          />

          {/* centered card (above overlay) */}
          <View pointerEvents="box-none" style={{ zIndex: 2, width: '82%', maxHeight: '70%', backgroundColor: '#bfb9deff', borderColor: '#412d5cff', borderWidth: 2 }}>
            {/* Header row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, borderColor: '#412d5cff' }}>
              <Text style={{ fontSize: 16, color: '#412d5cff', fontWeight: '700' }}>Organize By:</Text>
            </View>

            {/* Rows */}
            <ScrollView>
              {fields.map((f) => {
                const active = priority === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => { onChangePriority(f.key); onClose(); }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      backgroundColor: active ? '#bfb9deff' : 'transparent',
                      borderTopWidth: f.key === fields[0].key ? 0 : (active ? 2 : 0),
                      borderBottomWidth: active ? 2 : 0,
                      borderLeftWidth: active ? 2 : 0,
                      borderRightWidth: active ? 2 : 0,
                      borderColor: '#412d5cff',
                    }}
                  >
                    <Text style={{ fontSize: 14, color: '#412d5cff', fontWeight: active ? '900' : '500' }}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// RIGHT: Column filter (multi-select)
export function ColumnFilterControl({
  fields,
  selectedFields,
  onChangeFields,
  open,
  onToggle,
  onClose,
}: {
  fields: Field[];
  selectedFields: string[];
  onChangeFields: (keys: string[]) => void;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const toggleField = (key: string) => {
    const set = new Set(selectedFields);
    if (set.has(key)) set.delete(key); else set.add(key);
    onChangeFields(Array.from(set));
  };

  return (
    <>
      <Pressable
        accessibilityLabel="Toggle filters"
        onPress={onToggle}
        style={AdminSearchBarStyles.iconBtn}
      >
        <Text style={AdminSearchBarStyles.checkText}>✓</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {/* dark overlay BEHIND the card */}
          <Pressable
            onPress={onClose}
            pointerEvents="box-only"
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 1 }}
          />

          {/* centered card (above overlay) */}
          <View pointerEvents="box-none" style={{ zIndex: 2, width: 180, backgroundColor: '#bfb9deff', borderColor: '#412d5cff', borderWidth: 2 }}>
            {/* Header row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, borderColor: '#412d5cff' }}>
              <Text style={{ fontSize: 16, color: '#412d5cff', fontWeight: '700' }}>Filters:</Text>
            </View>
            <ScrollView>
              {fields.map((f) => {
                const checked = selectedFields.includes(f.key);
                return (
                  <Pressable key={f.key} onPress={() => toggleField(f.key)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0, borderColor: '#412d5cff' }}>
                    {/* square checkbox */}
                    <View style={{ width: 18, height: 18, marginRight: 10, borderWidth: 2, borderColor: '#412d5cff', backgroundColor: checked ? '#412d5cff' : 'transparent' }}>
                      {checked && <Text style={{ color: '#bfb9deff', textAlign: 'center', lineHeight: 16, marginTop: -1 }}>✓</Text>}
                    </View>
                    <Text style={{ fontSize: 14, color: '#412d5cff', fontWeight: checked ? '500' : '500' }}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
