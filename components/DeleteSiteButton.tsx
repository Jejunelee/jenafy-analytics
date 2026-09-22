"use client";

import { useState } from "react";
import { deleteWebsite } from "@/app/(dashboard)/sites/actions";
import { SubmitButton } from "@/components/SubmitButton";

export function DeleteSiteButton({ id, name }: { id: string; name: string }) {
  const [on, setOn] = useState(false);
  if (!on) {
    return (
      <button type="button" className="btn mt-3" onClick={() => setOn(true)}>
        Delete website
      </button>
    );
  }
  return (
    <form action={deleteWebsite} className="mt-3 space-y-2">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-deep">This permanently deletes analytics for {name}.</p>
      <div className="flex gap-2">
        <SubmitButton pendingLabel="Deleting">Confirm delete</SubmitButton>
        <button
          type="button"
          className="rounded-lg px-4 py-2 text-sm ring-1 ring-ink/15"
          onClick={() => setOn(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
