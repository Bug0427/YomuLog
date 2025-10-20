import React from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { AdminSearchBarStyles, AdminTabStyles } from '../../styles/global';
import { AdminFiltersStyles } from '../../styles/IndependentStyles/AdminFiltersStyles';

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
        <View style={AdminFiltersStyles.overlayCenter}>
          {/* dark overlay BEHIND the card */}
          <Pressable
            onPress={onClose}
            pointerEvents="box-only"
            style={AdminFiltersStyles.overlayDim}
          />

          {/* centered card (above overlay) */}
          <View pointerEvents="box-none" style={AdminFiltersStyles.organizerCard}>
            {/* Header row */}
            <View style={AdminFiltersStyles.headerRow}>
              <Text style={AdminTabStyles.text}>Organize By:</Text>
            </View>

            {/* Rows */}
            <ScrollView>
              {fields.map((f) => {
                const active = priority === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => { onChangePriority(f.key); onClose(); }}
                    style={[
                      AdminFiltersStyles.rowBase,
                      active && AdminFiltersStyles.rowActive,
                      f.key === fields[0].key && AdminFiltersStyles.rowFirst
                    ]}
                  >
                    <Text style={active ? AdminFiltersStyles.rowTextHeavy : AdminFiltersStyles.rowText}>{f.label}</Text>
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
        <View style={AdminFiltersStyles.overlayCenter}>
          {/* dark overlay BEHIND the card */}
          <Pressable
            onPress={onClose}
            pointerEvents="box-only"
            style={AdminFiltersStyles.overlayDim}
          />

          {/* centered card (above overlay) */}
          <View pointerEvents="box-none" style={AdminFiltersStyles.filtersCard}>
            {/* Header row */}
            <View style={AdminFiltersStyles.headerRow}>
              <Text style={AdminFiltersStyles.headerTitle}>Filters:</Text>
            </View>
            <ScrollView>
              {fields.map((f) => {
                const checked = selectedFields.includes(f.key);
                return (
                  <Pressable key={f.key} onPress={() => toggleField(f.key)} style={AdminFiltersStyles.filterRow}>
                    {/* square checkbox */}
                    <View style={[ AdminFiltersStyles.checkbox, checked && AdminFiltersStyles.checkboxChecked ]}>
                      {checked && <Text style={AdminFiltersStyles.checkText}>✓</Text>}
                    </View>
                    <Text style={AdminFiltersStyles.rowText}>{f.label}</Text>
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
