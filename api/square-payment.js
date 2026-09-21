export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST only"});
  const environment=String(process.env.SQUARE_ENVIRONMENT||"sandbox").toLowerCase()==="production"?"production":"sandbox";
  const accessToken=process.env.SQUARE_ACCESS_TOKEN||"";
  const locationId=process.env.SQUARE_LOCATION_ID||"";
  if(!accessToken||!locationId) return res.status(503).json({error:"Square payment credentials are not configured yet."});
  try{
    const body=req.body||{};
    const sourceId=String(body.sourceId||"");
    const amount=Math.round(Number(body.amount||0)*100);
    const email=String(body.email||"").trim().slice(0,200);
    const name=String(body.name||"").trim().slice(0,200);
    const verificationToken=String(body.verificationToken||"").trim();
    if(!sourceId) return res.status(400).json({error:"Missing Square payment token."});
    if(!Number.isInteger(amount)||amount<100||amount>100000000) return res.status(400).json({error:"Payment amount must be between $1 and $1,000,000."});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:"Enter a valid customer email address."});
    const endpoint=environment==="production"?"https://connect.squareup.com/v2/payments":"https://connect.squareupsandbox.com/v2/payments";
    const idempotencyKey=crypto.randomUUID();
    const payload={
      idempotency_key:idempotencyKey,
      source_id:sourceId,
      amount_money:{amount,currency:"USD"},
      location_id:locationId,
      autocomplete:true,
      reference_id:"AI-Business-Builder-"+Date.now()
    };
    if(verificationToken) payload.verification_token=verificationToken;
    if(name) payload.note=("AI Business Builder payment for "+name).slice(0,500);
    const r=await fetch(endpoint,{method:"POST",headers:{"Square-Version":"2026-09-16","Authorization":"Bearer "+accessToken,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(payload)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      const detail=data?.errors?.map(x=>x.detail||x.code).filter(Boolean).join("; ");
      return res.status(r.status).json({error:detail||"Square could not process the payment.",squareErrors:data?.errors||[]});
    }
    const p=data?.payment||{};
    return res.status(200).json({ok:true,paymentId:p.id||"",status:p.status||"COMPLETED",amount:(Number(p.amount_money?.amount||amount)/100).toFixed(2),environment});
  }catch(e){
    return res.status(500).json({error:e?.message||"Square payment request failed."});
  }
}