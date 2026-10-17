import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { darkColors, radii, spacing, typography } from '@/shared/theme';
import { logger } from '@/shared/utils';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort catch for a crash during bootstrap/render that would otherwise
 * leave a blank/frozen screen with no way back in — the same symptom class
 * as the bootsplash hang, just caused by a thrown error instead of a bundle
 * that never loads. "Restart" re-mounts the subtree by clearing the error.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('root error boundary caught a render error', error, { componentStack: info.componentStack });
  }

  private handleRestart = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message || 'An unexpected error occurred.'}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
            <Text style={styles.buttonText}>Restart</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: darkColors.background },
  title: { ...typography.sectionTitle, color: darkColors.text, marginBottom: spacing.sm, textAlign: 'center' },
  message: { ...typography.body, color: darkColors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  button: { backgroundColor: darkColors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radii.md },
  buttonText: { ...typography.cardTitle, color: darkColors.primaryText },
});
