import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import type { z } from 'zod';

/**
 * A React Hook Form resolver backed by a Zod schema — the ~20 lines of
 * `@hookform/resolvers/zod` this app actually uses, written here so the
 * locked dependency list does not grow by a package for it.
 *
 * The first issue per field wins, so a field with two failing rules shows one
 * message, the way the forms expect.
 */
export function zodResolver<TValues extends FieldValues>(
  schema: z.ZodType<TValues, any>,
): Resolver<TValues> {
  return async values => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data, errors: {} };

    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.map(String).join('.');
      if (!key || errors[key]) continue;
      errors[key] = { type: issue.code, message: issue.message };
    }
    return { values: {}, errors: errors as FieldErrors<TValues> };
  };
}
