import React, { useEffect, useState } from 'react';
import { View, TextInput } from 'react-native';
import { AdminSearchBarStyles, colors } from '../../styles/global';
import { OrganizerControl, ColumnFilterControl } from './AdminFilters';
import type { Field } from './AdminFilters';

import DropDownPicker from 'react-native-dropdown-picker';

export type AdminSearchBarProps = {
  /** Options for columns/fields */
  fields: Field[];
  /** Which columns are enabled (checkbox dropdown) */
  selectedFields: string[];
  onChangeFields: (keys: string[]) => void;

  /** Priority/organize-by single select */
  priority: string; // key
  onChangePriority: (key: string) => void;

  /** Query input */
  query: string;
  onChangeQuery: (text: string) => void;
  onSubmit?: () => void; // optional submit on keyboard search

  /** Optional: restrict search to a specific field */
  activeField?: string; // 'all' or a field key
  onChangeActiveField?: (key: string) => void;
};

export default function AdminSearchBar({
  fields,
  selectedFields,
  onChangeFields,
  priority,
  onChangePriority,
  query,
  onChangeQuery,
  onSubmit,
  activeField,
  onChangeActiveField,
}: AdminSearchBarProps) {
  const [fieldOpen, setFieldOpen] = useState(false);
  const [fieldValue, setFieldValue] = useState<string | null>(activeField ?? 'all');
  const [fieldItems, setFieldItems] = useState(
    [{ label: 'All', value: 'all' }, ...fields.map(f => ({ label: f.label, value: f.key }))]
  );

  // Central controller so only one popup is open at a time
  const [activePopup, setActivePopup] = useState<null | 'organizer' | 'filter'>(null);
  const toggleOrganizer = () => setActivePopup(p => (p === 'organizer' ? null : 'organizer'));
  const toggleFilter = () => setActivePopup(p => (p === 'filter' ? null : 'filter'));
  const closePopups = () => setActivePopup(null);

  // Keep local value in sync if parent changes activeField
  useEffect(() => {
    setFieldValue(activeField ?? 'all');
  }, [activeField]);

  // Emit changes to parent when dropdown value changes
  useEffect(() => {
    if (onChangeActiveField && fieldValue) onChangeActiveField(fieldValue);
  }, [fieldValue, onChangeActiveField]);

  return (
    <View style={AdminSearchBarStyles.wrap}>

      {/* Row: Organizer, Query and field picker, Column filter */}
      <View style={AdminSearchBarStyles.queryRow}>
        <OrganizerControl
          fields={fields}
          priority={priority}
          onChangePriority={onChangePriority}
          open={activePopup === 'organizer'}
          onToggle={toggleOrganizer}
          onClose={closePopups}
        />

        <View style={AdminSearchBarStyles.queryBox}>
          <View style={AdminSearchBarStyles.fieldRow}>
            {/* Left inline field dropdown */}
            <View style={AdminSearchBarStyles.fieldPickerWrap}>
              <DropDownPicker
                open={fieldOpen}
                value={fieldValue}
                items={fieldItems}
                setOpen={setFieldOpen}
                setValue={setFieldValue as any}
                setItems={setFieldItems}
                placeholder="All"
                searchable={false}
                listMode="SCROLLVIEW"
                zIndex={3000}
                zIndexInverse={1000}
                style={[AdminSearchBarStyles.dropdown, { minHeight: 34 }]}
                dropDownContainerStyle={AdminSearchBarStyles.dropdown}
                textStyle={AdminSearchBarStyles.ddText}
                placeholderStyle={AdminSearchBarStyles.ddPlaceholder}
                selectedItemContainerStyle={AdminSearchBarStyles.ddSelectedContainer}
                selectedItemLabelStyle={AdminSearchBarStyles.ddSelectedLabel}
                closeAfterSelecting
              />
            </View>

            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder="Query"
              placeholderTextColor={colors.placeholderText}
              style={AdminSearchBarStyles.input}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={onSubmit}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        <ColumnFilterControl
          fields={fields}
          selectedFields={selectedFields}
          onChangeFields={onChangeFields}
          open={activePopup === 'filter'}
          onToggle={toggleFilter}
          onClose={closePopups}
        />
      </View>

    </View>
  );
}
