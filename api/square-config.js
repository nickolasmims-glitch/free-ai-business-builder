export default function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"GET only"});
  const environment=String(process.env.SQUARE_ENVIRONMENT||"sandbox").toLowerCase()==="production"?"production":"sandbox";
  const applicationId=process.env.SQUARE_APPLICATION_ID||"";
  const locationId=process.env.SQUARE_LOCATION_ID||"";
  const ready=Boolean(applicationId&&locationId);
  return res.status(200).json({ready,environment,applicationId,locationId});
}