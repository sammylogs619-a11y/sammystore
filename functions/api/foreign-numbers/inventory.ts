import{Env,buildProviders,findBestProvider}from'../../lib/providers/registry';
import{jsonResponse,errorResponse,getSupabaseAdmin}from'../../lib/supabase';
import{resolvePricingConfig,calculateFinalPriceNgn,getExchangeRate}from'../../lib/pricing';
export const onRequestGet:PagesFunction<Env>=async({request,env})=>{
  const url=new URL(request.url);
  const country=url.searchParams.get('country'),service=url.searchParams.get('service');
  if(!country||!service)return errorResponse('Missing country or service');
  const rate=getExchangeRate(env);
  const best=await findBestProvider(buildProviders(env),country,service,rate);
  if(!best)return jsonResponse({available:false,message:'No stock available'});
  const admin=getSupabaseAdmin(env);
  const config=await resolvePricingConfig(admin,country,service);
  const price=calculateFinalPriceNgn(best.priceUsd,rate,config);
  const{data:delivery}=await admin.from('fn_delivery_stats').select('avg_delivery_seconds,sample_size').eq('country_code',country).eq('service_slug',service).maybeSingle();
  return jsonResponse({
    available:true,
    price_ngn:price,
    price_usd:best.priceUsd,
    stock:best.stock,
    provider_slug:best.provider.slug,
    estimated_wait_seconds:delivery?.avg_delivery_seconds??null,
    delivery_sample_size:delivery?.sample_size??0,
  });
};
export const onRequestOptions:PagesFunction=async()=>new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type'}});
