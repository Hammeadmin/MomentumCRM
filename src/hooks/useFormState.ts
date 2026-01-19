import { useState, useCallback, useMemo } from 'react';

/**
 * Form field configuration
 */
interface FieldConfig<T> {
    required?: boolean;
    validate?: (value: T[keyof T], formValues: T) => string | undefined;
    transform?: (value: any) => any;
}

/**
 * Form state with validation and change tracking
 */
interface FormState<T> {
    values: T;
    errors: Partial<Record<keyof T, string>>;
    touched: Partial<Record<keyof T, boolean>>;
    isDirty: boolean;
    isValid: boolean;
    isSubmitting: boolean;
}

/**
 * Form actions returned by the hook
 */
interface FormActions<T> {
    setValue: <K extends keyof T>(field: K, value: T[K]) => void;
    setValues: (values: Partial<T>) => void;
    setError: (field: keyof T, error: string | undefined) => void;
    setTouched: (field: keyof T, touched?: boolean) => void;
    reset: (values?: T) => void;
    validate: () => boolean;
    handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => (e?: React.FormEvent) => Promise<void>;
    getFieldProps: <K extends keyof T>(field: K) => {
        value: T[K];
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
        onBlur: () => void;
        error?: string;
        touched: boolean;
    };
}

type FieldConfigs<T> = Partial<Record<keyof T, FieldConfig<T>>>;

/**
 * useFormState - A comprehensive form state management hook
 * 
 * @param initialValues - Initial form values
 * @param fieldConfigs - Optional validation and transformation config per field
 * 
 * @example
 * const { values, errors, setValue, handleSubmit, getFieldProps } = useFormState({
 *   name: '',
 *   email: '',
 *   age: 0
 * }, {
 *   email: { 
 *     required: true, 
 *     validate: (v) => v.includes('@') ? undefined : 'Invalid email' 
 *   }
 * });
 */
export function useFormState<T extends Record<string, any>>(
    initialValues: T,
    fieldConfigs: FieldConfigs<T> = {}
): [FormState<T>, FormActions<T>] {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [initialSnapshot] = useState<T>(initialValues);

    // Check if form has been modified
    const isDirty = useMemo(() => {
        return Object.keys(values).some(
            (key) => values[key as keyof T] !== initialSnapshot[key as keyof T]
        );
    }, [values, initialSnapshot]);

    // Check if form is valid (no errors)
    const isValid = useMemo(() => {
        return Object.keys(errors).every((key) => !errors[key as keyof T]);
    }, [errors]);

    // Validate a single field
    const validateField = useCallback(
        (field: keyof T, value: T[keyof T]): string | undefined => {
            const config = fieldConfigs[field];
            if (!config) return undefined;

            if (config.required && (value === '' || value === null || value === undefined)) {
                return 'Detta fält är obligatoriskt';
            }

            if (config.validate) {
                return config.validate(value, values);
            }

            return undefined;
        },
        [fieldConfigs, values]
    );

    // Set a single field value
    const setValue = useCallback(
        <K extends keyof T>(field: K, value: T[K]) => {
            const config = fieldConfigs[field];
            const transformedValue = config?.transform ? config.transform(value) : value;

            setValues((prev) => ({ ...prev, [field]: transformedValue }));

            // Validate on change if field has been touched
            if (touched[field]) {
                const error = validateField(field, transformedValue);
                setErrors((prev) => ({ ...prev, [field]: error }));
            }
        },
        [fieldConfigs, touched, validateField]
    );

    // Set multiple field values at once
    const setValuesAction = useCallback((newValues: Partial<T>) => {
        setValues((prev) => ({ ...prev, ...newValues }));
    }, []);

    // Set error for a specific field
    const setError = useCallback((field: keyof T, error: string | undefined) => {
        setErrors((prev) => ({ ...prev, [field]: error }));
    }, []);

    // Mark field as touched
    const setTouchedAction = useCallback((field: keyof T, isTouched = true) => {
        setTouched((prev) => ({ ...prev, [field]: isTouched }));

        if (isTouched) {
            const error = validateField(field, values[field]);
            setErrors((prev) => ({ ...prev, [field]: error }));
        }
    }, [validateField, values]);

    // Reset form to initial or new values
    const reset = useCallback(
        (newValues?: T) => {
            setValues(newValues ?? initialValues);
            setErrors({});
            setTouched({});
            setIsSubmitting(false);
        },
        [initialValues]
    );

    // Validate all fields
    const validate = useCallback((): boolean => {
        const newErrors: Partial<Record<keyof T, string>> = {};
        let hasErrors = false;

        Object.keys(values).forEach((key) => {
            const field = key as keyof T;
            const error = validateField(field, values[field]);
            if (error) {
                newErrors[field] = error;
                hasErrors = true;
            }
        });

        setErrors(newErrors);
        // Mark all fields as touched when validating
        const allTouched = Object.keys(values).reduce(
            (acc, key) => ({ ...acc, [key]: true }),
            {} as Record<keyof T, boolean>
        );
        setTouched(allTouched);

        return !hasErrors;
    }, [validateField, values]);

    // Handle form submission
    const handleSubmit = useCallback(
        (onSubmit: (values: T) => Promise<void> | void) =>
            async (e?: React.FormEvent) => {
                e?.preventDefault();

                if (!validate()) {
                    return;
                }

                setIsSubmitting(true);
                try {
                    await onSubmit(values);
                } finally {
                    setIsSubmitting(false);
                }
            },
        [validate, values]
    );

    // Get field props for easy binding to inputs
    const getFieldProps = useCallback(
        <K extends keyof T>(field: K) => ({
            value: values[field],
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                const value = e.target.type === 'checkbox'
                    ? (e.target as HTMLInputElement).checked
                    : e.target.type === 'number'
                        ? parseFloat(e.target.value) || 0
                        : e.target.value;
                setValue(field, value as T[K]);
            },
            onBlur: () => setTouchedAction(field),
            error: touched[field] ? errors[field] : undefined,
            touched: !!touched[field],
        }),
        [values, errors, touched, setValue, setTouchedAction]
    );

    const state: FormState<T> = {
        values,
        errors,
        touched,
        isDirty,
        isValid,
        isSubmitting,
    };

    const actions: FormActions<T> = {
        setValue,
        setValues: setValuesAction,
        setError,
        setTouched: setTouchedAction,
        reset,
        validate,
        handleSubmit,
        getFieldProps,
    };

    return [state, actions];
}

export default useFormState;
