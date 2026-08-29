import React from 'react';

import { MBInput } from '@/common/ui';

export interface RequiredDateFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  /** The field's own message. Null while it has nothing to say. */
  error: string | null;
  editable?: boolean;
  testID?: string;
}

/**
 * The date this delivery is needed, and the only field on screen 20.
 *
 * ---------------------------------------------------------------------------
 * It gates Submit and nothing else
 * ---------------------------------------------------------------------------
 * Save draft works without it, deliberately: a branch part-way through building
 * a demand has a basket long before it has a delivery date, and a draft that
 * refused to save without one would simply not be used.
 *
 * Submit is the other way round. `CreateProductionOrderSchema.requiredDate` is
 * required server-side and is **not** defaulted there — a demand with no
 * required date is exactly what the field exists to prevent, and defaulting it
 * would file a made-up commitment under the branch's name.
 *
 * ---------------------------------------------------------------------------
 * Its own error state
 * ---------------------------------------------------------------------------
 * The message belongs on the field rather than in the footer with the others.
 * A footer alert about a date sends the reader looking for the date; an error
 * under the box they have to fix is already pointing at it. The footer keeps the
 * messages that are about the demand as a whole — an empty basket, a closed
 * order window, a write that failed.
 *
 * Free text rather than a picker: this is typed once per demand next to a field
 * the same shape everywhere else in the app, and `YYYY-MM-DD` is what the API
 * takes end to end (a Postgres `date`, never parsed into a `Date` here — that
 * would drag the Karachi offset into a value with no time of day to offset).
 */
export function RequiredDateField({
  value,
  onChangeText,
  error,
  editable = true,
  testID,
}: RequiredDateFieldProps): React.ReactElement {
  return (
    <MBInput
      label="Required by"
      required
      value={value}
      onChangeText={onChangeText}
      placeholder="YYYY-MM-DD"
      autoCapitalize="none"
      autoCorrect={false}
      hint="The date this delivery is needed"
      {...(error ? { error } : {})}
      editable={editable}
      testID={testID}
    />
  );
}
