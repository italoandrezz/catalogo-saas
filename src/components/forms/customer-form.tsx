"use client";

import { useEffect, useState } from "react";
import { formatCustomerPhone, isValidCustomerEmail, isValidCustomerPhone } from "@/lib/customer-format";
import type { Customer, CustomerPayload } from "@/types";

type CustomerFormProps = {
  initialCustomer: Customer | null;
  isSubmitting: boolean;
  onSubmit: (payload: CustomerPayload) => Promise<void>;
  onCancelEdit: () => void;
};

type CustomerFormState = {
  name: string;
  email: string;
  phone: string;
};

function getInitialState(customer: Customer | null): CustomerFormState {
  return {
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: formatCustomerPhone(customer?.phone ?? ""),
  };
}

export function CustomerForm({
  initialCustomer,
  isSubmitting,
  onSubmit,
  onCancelEdit,
}: CustomerFormProps) {
  const [formState, setFormState] = useState<CustomerFormState>(() => getInitialState(initialCustomer));

  useEffect(() => {
    setFormState(getInitialState(initialCustomer));
  }, [initialCustomer]);

  const isFormValid =
    formState.name.trim().length > 0 &&
    formState.email.trim().length > 0 &&
    formState.phone.trim().length > 0 &&
    isValidCustomerEmail(formState.email) &&
    isValidCustomerPhone(formState.phone);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid) return;

    const payload: CustomerPayload = {
      name: formState.name.trim(),
      email: formState.email.trim().toLowerCase(),
      phone: formState.phone.trim(),
    };

    await onSubmit(payload);

    if (!initialCustomer) {
      setFormState(getInitialState(null));
    }
  }

  const isEditing = Boolean(initialCustomer);

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <h3 className="text-lg font-semibold text-slate-900">
        {isEditing ? "Edit customer" : "Create customer"}
      </h3>

      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
          Name
          <input
            value={formState.name}
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Email
          <input
            type="email"
            value={formState.email}
            onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
            placeholder="cliente@email.com"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Phone
          <input
            value={formState.phone}
            onFocus={() => {
              setFormState((prev) => ({
                ...prev,
                phone: prev.phone ? formatCustomerPhone(prev.phone) : "+55 (",
              }));
            }}
            onChange={(event) => setFormState((prev) => ({ ...prev, phone: formatCustomerPhone(event.target.value) }))}
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
            placeholder="+55 (11) 91234-5678"
            inputMode="tel"
            maxLength={19}
            required
          />
        </label>

        <div className="md:col-span-2 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : isEditing ? "Update customer" : "Create customer"}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
