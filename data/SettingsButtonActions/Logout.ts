// data/SettingsButtonActions/Logout.ts
import { DeviceEventEmitter } from 'react-native';

export function logout(navigation: any) {
    (globalThis as any).currentAccountId = undefined;
    (globalThis as any).currentUsername = undefined;
    (globalThis as any).currentPassword = undefined;
    (globalThis as any).currentSecurityLevel = null;
    (globalThis as any).forceLoggedOut = true;
    (globalThis as any).authEpoch = ((globalThis as any).authEpoch || 0) + 1;

    try { DeviceEventEmitter.emit('app:forceLogout'); } catch {}
    // @ts-ignore
    navigation.replace?.('LoginScreen');
}