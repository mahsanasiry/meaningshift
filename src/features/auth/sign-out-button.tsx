"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  const signOut = useMutation({
    mutationFn: async () => {
      const { error } = await createClient().auth.signOut();
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      router.replace("/login");
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" loading={signOut.isPending} onClick={() => signOut.mutate()}>
        {signOut.isPending ? "Signing out…" : "Sign out"}
      </Button>
      {signOut.isError ? (
        <p role="alert" className="text-sm font-medium text-danger">
          Could not sign out. Try again.
        </p>
      ) : null}
    </div>
  );
}
