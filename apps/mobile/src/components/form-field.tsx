import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { Input, type InputProps } from "@/components/ui/input";

type FormFieldProps<TFieldValues extends FieldValues> = Omit<
  InputProps,
  "value" | "onChangeText" | "onBlur" | "errorMessage"
> & {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
};

export const FormField = <TFieldValues extends FieldValues>({
  control,
  name,
  ...inputProps
}: FormFieldProps<TFieldValues>) => (
  <Controller
    control={control}
    name={name}
    render={({ field, fieldState }) => (
      <Input
        value={field.value ?? ""}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        errorMessage={fieldState.error?.message}
        {...inputProps}
      />
    )}
  />
);
