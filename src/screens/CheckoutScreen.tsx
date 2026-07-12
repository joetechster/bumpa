import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePaystack } from 'react-native-paystack-webview';

import { makeTransactionReference } from '../checkout/reference';
import PriceTag from '../components/PriceTag';
import { PAYSTACK_PUBLIC_KEY } from '../config/env';
import { koboToWholeNairaForPaystack, lineTotalKobo } from '../domain/money';
import type { RootStackParamList } from '../navigation/types';
import { cartTotalKobo, useCartStore } from '../store/cartStore';
import { colors, radii, shadows, spacing, type } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

// Checkout phases. `cancelled` is deliberately NOT an error (paystack skill):
// the user backed out - return them to the form with the cart intact and a
// neutral note. `error` keeps the cart and offers a retry with a FRESH
// reference (the failed attempt's reference is spent).
type CheckoutPhase =
  | { step: 'form'; cancelled: boolean }
  | { step: 'paying' }
  | { step: 'success'; reference: string }
  | { step: 'error'; message: string };

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export default function CheckoutScreen({ navigation }: Props) {
  const lines = useCartStore((s) => s.lines);
  const clearCart = useCartStore((s) => s.clear);
  const { popup } = usePaystack();

  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<CheckoutPhase>({ step: 'form', cancelled: false });

  const totalKobo = cartTotalKobo(lines);
  const emailValid = EMAIL_PATTERN.test(email.trim());

  if (PAYSTACK_PUBLIC_KEY === '') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Checkout is not configured</Text>
        <Text style={styles.body}>
          Missing EXPO_PUBLIC_PAYSTACK_KEY. Copy .env.example to .env, add your pk_test_ key and
          restart the dev server.
        </Text>
      </View>
    );
  }

  if (phase.step === 'success') {
    return (
      <View style={styles.centered}>
        <Text style={styles.successTitle}>Payment successful 🎉</Text>
        <Text style={styles.body}>Your order is on its way to your inbox.</Text>
        <Text style={styles.reference}>Reference: {phase.reference}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to browsing"
          onPress={() => navigation.popToTop()}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>Back to browsing</Text>
        </Pressable>
      </View>
    );
  }

  if (phase.step === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Payment failed</Text>
        <Text style={styles.body}>{phase.message}</Text>
        <Text style={styles.bodyMuted}>Your cart is untouched - you can try again.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try payment again"
          onPress={() => setPhase({ step: 'form', cancelled: false })}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const startPayment = () => {
    setPhase({ step: 'paying' });
    popup.checkout({
      email: email.trim(),
      // MAJOR units: the installed wrapper multiplies by 100 internally.
      amount: koboToWholeNairaForPaystack(totalKobo),
      reference: makeTransactionReference(),
      onSuccess: (res) => {
        // No backend, so this client callback is trusted as-is - a real
        // integration verifies server-side with the secret key. Stated in
        // the README under Known Limitations.
        clearCart();
        setPhase({ step: 'success', reference: res.reference });
      },
      onCancel: () => setPhase({ step: 'form', cancelled: true }),
      onError: (err) =>
        setPhase({
          step: 'error',
          message:
            typeof err?.message === 'string' && err.message !== ''
              ? err.message
              : 'The payment could not be completed.',
        }),
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {phase.step === 'form' && phase.cancelled && (
          <Text style={styles.cancelledNote} accessibilityLiveRegion="polite">
            Payment cancelled - your cart is untouched.
          </Text>
        )}

        <Text style={styles.heading}>Order summary</Text>
        {lines.map((line) => (
          <View key={line.book.id} style={styles.summaryRow}>
            <Text style={styles.summaryTitle} numberOfLines={1}>
              {line.book.title} × {line.quantity}
            </Text>
            <PriceTag priceKobo={lineTotalKobo(line.book.priceKobo, line.quantity)} />
          </View>
        ))}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <PriceTag priceKobo={totalKobo} size="large" />
        </View>

        <Text style={styles.heading}>Your email</Text>
        <Text style={styles.bodyMuted}>Paystack sends the receipt here.</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Email for receipt"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pay with Paystack"
          accessibilityState={{ disabled: !emailValid || lines.length === 0 || phase.step === 'paying' }}
          disabled={!emailValid || lines.length === 0 || phase.step === 'paying'}
          onPress={startPayment}
          style={({ pressed }) => [
            styles.primaryButton,
            (!emailValid || lines.length === 0 || phase.step === 'paying') && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {phase.step === 'paying' ? 'Opening Paystack…' : 'Pay with Paystack'}
          </Text>
        </Pressable>
        <Text style={styles.testNote}>
          Test mode - no real money moves. Use Paystack’s test card 4084 0840 8408 4081.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  heading: { ...type.heading, color: colors.text, marginTop: spacing.sm },
  body: { ...type.body, color: colors.text, textAlign: 'center' },
  bodyMuted: { ...type.caption, color: colors.textMuted },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTitle: { ...type.body, color: colors.text, flex: 1, marginRight: spacing.sm },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: { ...type.heading, color: colors.text },
  input: {
    ...type.body,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    ...shadows.card,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    alignSelf: 'stretch',
    ...shadows.card,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  primaryButtonText: { ...type.body, fontWeight: '700', color: colors.surface },
  successTitle: { ...type.title, color: colors.success, textAlign: 'center' },
  errorTitle: { ...type.title, color: colors.danger, textAlign: 'center' },
  reference: { ...type.caption, color: colors.textMuted },
  cancelledNote: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    textAlign: 'center',
  },
  testNote: { ...type.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
});
