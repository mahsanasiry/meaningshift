import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthPage, isProtectedPath } from "@/lib/auth/routes";
import { getSupabaseEnv } from "./env";

const CACHE_HEADERS = ["cache-control", "expires", "pragma"];

// A redirect must carry the refreshed session cookies, or the user is signed out on the next request.
function redirectWithSession(request: NextRequest, source: NextResponse, destination: string) {
  const target = request.nextUrl.clone();
  target.pathname = destination;
  target.search = "";

  const response = NextResponse.redirect(target);
  for (const cookie of source.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  for (const header of CACHE_HEADERS) {
    const value = source.headers.get(header);
    if (value) {
      response.headers.set(header, value);
    }
  }
  return response;
}

export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!signedIn && isProtectedPath(pathname)) {
    return redirectWithSession(request, supabaseResponse, "/login");
  }
  if (signedIn && isAuthPage(pathname)) {
    return redirectWithSession(request, supabaseResponse, "/workspaces");
  }
  return supabaseResponse;
}
