import { Env, buildProviders } from '../../lib/providers/registry';
import { jsonResponse, errorResponse } from '../../lib/supabase';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const header = request.headers.get('x-sync-secret');
  if (!header || header !== env.SYNC_SECRET) {
    return errorResponse('Unauthorized', 401);
  }

  const providers = buildProviders(env);
  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      try {
        const balance = await provider.getBalance();
        return {
          provider: provider.slug,
          ok: true,
          balance,
        };
      } catch (error) {
        return {
          provider: provider.slug,
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  return jsonResponse({
    providers: results.map((result, index) => {
      if (result.status === 'fulfilled') return result.value;
      return {
        provider: providers[index]?.slug,
        ok: false,
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      };
    }),
  });
};

export const onRequestOptions: PagesFunction = async () => new Response(null, {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-sync-secret',
  },
});
