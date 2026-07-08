import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, GestureResponderEvent } from 'react-native';
import { GeneralStyles, FeedbackStyles, confirmationStyles } from '../../styles/global';

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

type ConfirmProviderProps = { children?: React.ReactNode };
export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [visible, setVisible] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const resolver = useRef<((val: boolean) => void) | null>(null);
  const isShowing = useRef(false);
  const pendingPromise = useRef<Promise<boolean> | null>(null);
  const openTimer = useRef<NodeJS.Timeout | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    // If already showing, just return the existing promise
    if (isShowing.current && pendingPromise.current) {
      return pendingPromise.current;
    }

    // Create or reuse a single in-flight promise for this request
    if (!pendingPromise.current) {
      pendingPromise.current = new Promise<boolean>((resolve) => {
        resolver.current = resolve;
      });
    }

    // Mark showing *immediately* to avoid re-entrant opens in the same render pass
    isShowing.current = true;

    // Avoid scheduling multiple timers
    if (openTimer.current) {
      return pendingPromise.current;
    }

    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      setOpts(options ?? {});
      setVisible(true);
    }, 0);

    return pendingPromise.current;
  }, []);

  const onCancel = useCallback((e: GestureResponderEvent) => {
    opts.onCancelPress?.(e);
    setVisible(false);
    resolver.current?.(false);
    resolver.current = null;
    isShowing.current = false;
    pendingPromise.current = null;
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
  }, [opts]);

  const onConfirm = useCallback((e: GestureResponderEvent) => {
    opts.onConfirmPress?.(e);
    setVisible(false);
    resolver.current?.(true);
    resolver.current = null;
    isShowing.current = false;
    pendingPromise.current = null;
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
  }, [opts]);

  const value = useMemo(() => confirm, [confirm]);

  const title = opts.title ?? 'Are you sure?';
  const message = opts.message ?? 'This action cannot be undone.';
  const confirmText = opts.confirmText ?? 'Confirm';
  const cancelText = opts.cancelText ?? 'X';

  return (
    <ConfirmCtx.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
        <View style={confirmationStyles.backdrop}>
          <View style={confirmationStyles.card}>
            <Pressable onPress={onCancel} style={confirmationStyles.alignEnd}>
              <Text style={[FeedbackStyles.item, confirmationStyles.cancelTextPad]}>{cancelText}</Text>
            </Pressable>
            <Text style={[GeneralStyles.title, confirmationStyles.titleDelta]}>{title}</Text>
            <Text style={[GeneralStyles.h1, confirmationStyles.messageDelta]}>{message}</Text>
            
              <Pressable onPress={onConfirm}>
                <Text style={[FeedbackStyles.item, confirmationStyles.confirmTextDelta]}>{confirmText}</Text>
              </Pressable>
 
          </View>
        </View>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
