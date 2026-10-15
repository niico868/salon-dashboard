import { Alert, Platform } from 'react-native';

// In a browser, show Alert messages with the browser's own pop-ups
if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    const cancel = buttons.find((b) => b.style === 'cancel') ?? buttons[0];
    const action = buttons.find((b) => b !== cancel) ?? buttons[buttons.length - 1];
    if (window.confirm(text)) action.onPress?.(); else cancel.onPress?.();
  };
}