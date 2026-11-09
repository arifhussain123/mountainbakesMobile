import { useEffect } from 'react';
import { Keyboard } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/shared/forms';
import { useAuthStore } from '@/state';
import { loginFormSchema, type LoginFormValues } from '../loginSchema';
import { useLogin } from './useLogin';

/**
 * React Hook Form wiring for the Login screen: Zod validation on submit,
 * re-validation as the user types once a field has failed, the remembered
 * email pre-filled with "Remember me" ticked, and the mutation from `useLogin`.
 */
export function useLoginForm() {
  const rememberedEmail = useAuthStore(state => state.rememberedEmail);
  const { submit, isPending, errorMessage, clearError } = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: rememberedEmail ?? '',
      password: '',
      rememberMe: rememberedEmail != null,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // The remembered email is loaded during bootstrap, before this screen can
  // mount — this only matters if it changes while the screen is open.
  useEffect(() => {
    if (rememberedEmail && !form.getValues('email')) {
      form.setValue('email', rememberedEmail);
      form.setValue('rememberMe', true);
    }
  }, [form, rememberedEmail]);

  const onSubmit = form.handleSubmit(values => {
    if (isPending) return;
    Keyboard.dismiss();
    submit(values);
  });

  return { form, onSubmit, isPending, errorMessage, clearError };
}
