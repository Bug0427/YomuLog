import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, GestureResponderEvent } from 'react-native';
import { GeneralStyles, FeedBackStyles, confirmationStyles } from '../../styles/global';

export type ConfirmOptions = {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean; // styles the confirm button as destructive
  // Optional overrides
  onCancelPress?: (e: GestureResponderEvent) => void;
  onConfirmPress?: (e: GestureResponderEvent) => void;
};

const ConfirmCtx = createContext<null | ((opts: ConfirmOptions) => Promise<boolean>)>(null);

export const ConfirmProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const resolver = useRef<((val: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options ?? {});
    setVisible(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const onCancel = useCallback((e: GestureResponderEvent) => {
    opts.onCancelPress?.(e);
    setVisible(false);
    resolver.current?.(false);
    resolver.current = null;
  }, [opts]);

  const onConfirm = useCallback((e: GestureResponderEvent) => {
    opts.onConfirmPress?.(e);
    setVisible(false);
    resolver.current?.(true);
    resolver.current = null;
  }, [opts]);

  const value = useMemo(() => confirm, [confirm]);

  const title = opts.title ?? 'Are you sure?';
  const message = opts.message ?? 'This action cannot be undone.';
  const confirmText = opts.confirmText ?? 'Confirm';
  const cancelText = opts.cancelText ?? 'X';

  return (
    <ConfirmCtx.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
        <View style={confirmationStyles.backdrop}>
          <View style={confirmationStyles.card}>
            <Pressable onPress={onCancel} style={[{alignItems:'flex-end'}]}>
              <Text style={[FeedBackStyles.item, { paddingVertical: 7 }]}>{cancelText}</Text>
            </Pressable>
            <Text style={[GeneralStyles.title, {fontSize:25, marginLeft: 70}]}>{title}</Text>
            <Text style={[GeneralStyles.h1, {fontSize:18, marginLeft: 20, paddingBottom: 30}]}>{message}</Text>
            
              <Pressable onPress={onConfirm}>
                <Text style={[FeedBackStyles.item, {width: 80, paddingVertical: 7, marginLeft: 110} ]}>{confirmText}</Text>
              </Pressable>
 
          </View>
        </View>
      </Modal>
    </ConfirmCtx.Provider>
  );
};

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
