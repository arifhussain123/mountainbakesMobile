import { useEffect, useState } from 'react';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';

export function useLoginForm() {
  const rememberedEmail = useAuthStore((state) => state.rememberedEmail);
  const login = useAuthStore((state) => state.login);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (rememberedEmail) setIdentifier(rememberedEmail);
  }, [rememberedEmail]);

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !isSubmitting;

  const submit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await login(identifier.trim(), password, rememberMe);
    } catch (error) {
      setErrorMessage(mapErrorToMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    isSubmitting,
    errorMessage,
    canSubmit,
    submit,
  };
}
