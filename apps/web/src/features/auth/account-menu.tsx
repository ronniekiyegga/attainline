import { signOut, switchOrganisation } from "./auth.actions";

export type AccountOrganisations = {
  activeId: string;
  available: { id: string; name: string }[];
};

const controlClass =
  "inline-flex h-8 items-center justify-center rounded-md border border-gray-200 bg-background px-3 text-xs font-medium text-zinc-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AccountMenu({ organisations }: { organisations: AccountOrganisations }) {
  return (
    <div className="flex flex-col gap-2 px-1">
      {organisations.available.length > 1 && (
        <form action={switchOrganisation} className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="organisation-switch" className="block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              School
            </label>
            <select
              id="organisation-switch"
              name="organisationId"
              defaultValue={organisations.activeId}
              className="mt-1 h-8 w-full rounded-md border border-gray-200 bg-background px-2 text-xs"
            >
              {organisations.available.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={controlClass}>
            Switch
          </button>
        </form>
      )}
      <form action={signOut}>
        <button type="submit" className={`${controlClass} w-full`}>
          Sign out
        </button>
      </form>
    </div>
  );
}
