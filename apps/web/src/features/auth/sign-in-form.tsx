"use client";

import { BookUser, Briefcase, Loader, type LucideIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { signIn, type SignInState } from "./auth.actions";

type DemoRole = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  email: string;
};

const demoRoles: DemoRole[] = [
  {
    id: "leadership",
    label: "Senior Leader",
    description: "Head of year, pastoral, or school-wide leadership",
    icon: Briefcase,
    email: "morgan.vale@example.test",
  },
  {
    id: "teacher",
    label: "Teacher",
    description: "Classroom educator or form tutor",
    icon: BookUser,
    email: "sasha.wren@example.test",
  },
];

const fieldClass =
  "flex h-10 w-full rounded-md border border-gray-300 bg-background px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#600BEA] disabled:cursor-not-allowed disabled:opacity-50";

const initialState: SignInState = { email: demoRoles[0].email };

function RoleCard({
  role,
  selected,
  disabled,
  onSelect,
}: {
  role: DemoRole;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const Icon = role.icon;

  const card = (
    <label
      className={`relative flex h-full min-h-[120px] w-full cursor-pointer flex-col items-center justify-between overflow-hidden rounded-xl border bg-white p-4 transition-[transform,border-color] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.98] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring motion-reduce:transition-none ${
        selected ? "border-[#7c3aed]" : "border-gray-200"
      }`}
    >
      <input
        type="radio"
        name="demo-role"
        value={role.id}
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="mb-4 block">
        <Icon aria-hidden className="mx-auto h-5 w-5 text-black" strokeWidth={2} />
      </span>
      <span className="mb-1 block space-y-1">
        <span
          className={`block text-center text-base font-semibold transition-colors duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${
            selected ? "text-[#5b21b6]" : "text-[#111827]"
          }`}
        >
          {role.label}
        </span>
        <span className="block text-center text-xs text-zinc-500">{role.description}</span>
      </span>
    </label>
  );

  return (
    <div className="h-full">
      <div className="h-full min-h-[120px]">
        {selected ? (
          <div className="relative h-full cursor-pointer rounded-xl bg-[linear-gradient(160deg,#3976F5_16%,#3976F5_40%,#8415F4_60%,#6600CC_98%)] p-[.5px]">
            <div className="h-full rounded-xl bg-white shadow-lg">{card}</div>
          </div>
        ) : (
          <div className="h-full">{card}</div>
        )}
      </div>
    </div>
  );
}

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const [roleId, setRoleId] = useState(demoRoles[0].id);
  const [email, setEmail] = useState(state.email);
  const [submittedState, setSubmittedState] = useState(state);

  if (submittedState !== state) {
    setSubmittedState(state);
    setEmail(state.email);
  }

  function selectRole(role: DemoRole) {
    setRoleId(role.id);
    setEmail(role.email);
  }

  return (
    <>
      <fieldset className="mb-8">
        <legend className="sr-only">Demo account</legend>
        <div className="mb-6 grid h-[8rem] grid-cols-2 gap-2">
          {demoRoles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              selected={role.id === roleId}
              disabled={isPending}
              onSelect={() => selectRole(role)}
            />
          ))}
        </div>
      </fieldset>

      <form action={formAction} className="space-y-4" aria-describedby={state.error ? "sign-in-error" : undefined}>
        {state.error && (
          <p
            id="sign-in-error"
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {state.error}
          </p>
        )}
        <div className="mb-4 space-y-2">
          <label htmlFor="email" className="mb-3 block text-sm font-semibold text-gray-700">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            disabled={isPending}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@yourschool.org"
            className={`${fieldClass} py-3 shadow shadow-zinc-100`}
          />
        </div>

        <div className="mb-4 space-y-2">
          <label htmlFor="password" className="mb-3 block text-sm font-semibold text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isPending}
            className={`${fieldClass} h-[42px] py-5`}
          />
        </div>

        <div className="flex h-full items-center justify-center rounded-full bg-black/5 p-1">
          <button
            type="submit"
            disabled={isPending}
            className="flex h-12 w-full items-center justify-center rounded-full bg-linear-to-r/srgb from-blue-800 via-blue-500 to-violet-900 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:from-purple-800 hover:to-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader
                  aria-hidden
                  size={20}
                  className="shrink-0 animate-[spin_0.8s_linear_infinite] text-white motion-reduce:animate-none"
                />
                Signing in…
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </div>
      </form>
    </>
  );
}
