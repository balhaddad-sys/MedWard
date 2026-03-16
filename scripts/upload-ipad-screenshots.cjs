const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

const KEY_ID = '2NCWU63ZAC';
const ISSUER_ID = '5988b726-9289-48c6-ac37-4c603d29fa6a';
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg5szXwtMKAkHyGKe2
cR0m/XSMDVscGVg9Aoiz2knfGH6gCgYIKoZIzj0DAQehRANCAARgMVNnxn1kvnFN
RsbVstWLSYZgtpdFkWWu97iomJ1596eKK9WAVV11HaDE84JETPF7icKZQYWwxjUA
jSxZ1LSE
-----END PRIVATE KEY-----`;

function base64url(buf) { return buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''); }
function makeJWT() {
  const h=base64url(Buffer.from(JSON.stringify({alg:'ES256',kid:KEY_ID,typ:'JWT'})));
  const now=Math.floor(Date.now()/1000);
  const p=base64url(Buffer.from(JSON.stringify({iss:ISSUER_ID,iat:now,exp:now+1200,aud:'appstoreconnect-v1'})));
  const toSign=`${h}.${p}`;
  const sign=crypto.createSign('SHA256'); sign.update(toSign);
  const der=sign.sign(PRIVATE_KEY);
  let o=2; if(der[1]&0x80) o+=der[1]&0x7f;
  o++; let rl=der[o]; o++; let r=der.slice(o,o+rl); o+=rl;
  o++; let sl=der[o]; o++; let s=der.slice(o,o+sl);
  while(r.length<32) r=Buffer.concat([Buffer.from([0]),r]);
  while(s.length<32) s=Buffer.concat([Buffer.from([0]),s]);
  if(r.length>32) r=r.slice(r.length-32); if(s.length>32) s=s.slice(s.length-32);
  return `${toSign}.${base64url(Buffer.concat([r,s]))}`;
}
function curlReq(method, path, body) {
  const jwt=makeJWT();
  const url=`https://api.appstoreconnect.apple.com${path}`;
  const args=['-s','-w','\nHTTP_STATUS:%{http_code}','-H',`Authorization: Bearer ${jwt}`];
  if(body){args.push('-X',method,'-H','Content-Type: application/json','-d',JSON.stringify(body));}
  else if(method!=='GET'){args.push('-X',method);}
  args.push(url);
  const out=execFileSync('curl',args,{maxBuffer:5*1024*1024}).toString();
  const status=parseInt((out.match(/\nHTTP_STATUS:(\d+)$/)||[])[1]||0);
  try{return{status,data:JSON.parse(out.replace(/\nHTTP_STATUS:\d+$/,''))};}
  catch(e){return{status,data:out.replace(/\nHTTP_STATUS:\d+$/,'')};}
}

function uploadScreenshot(fileData, fileName, setId) {
  const fileSize = fileData.length;
  const checksum = crypto.createHash('md5').update(fileData).digest('base64');

  const reserveRes = curlReq('POST', '/v1/appScreenshots', {
    data: {
      type: 'appScreenshots',
      attributes: { fileSize, fileName },
      relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } }
    }
  });
  if (reserveRes.status !== 201) {
    console.log('  Reserve failed:', reserveRes.status, reserveRes.data?.errors?.[0]?.detail);
    return false;
  }

  const { id: screenshotId, attributes: { uploadOperations } } = reserveRes.data.data;

  for (const op of uploadOperations) {
    const chunk = fileData.slice(op.offset, op.offset + op.length);
    const tmpFile = `C:/Users/balha/AppData/Local/Temp/ipad2_${Date.now()}.bin`;
    fs.writeFileSync(tmpFile, chunk);
    const headers = op.requestHeaders.map(h => ['-H', `${h.name}: ${h.value}`]).flat();
    const out = execFileSync('curl', ['-s','-w','\nHTTP_STATUS:%{http_code}','-X',op.method,...headers,'--data-binary',`@${tmpFile}`,op.url], {maxBuffer:1024*1024}).toString();
    fs.unlinkSync(tmpFile);
    const upStatus = parseInt((out.match(/\nHTTP_STATUS:(\d+)$/)||[])[1]||0);
    if (upStatus >= 300) { console.log('  Upload failed:', upStatus); return false; }
  }

  const commitRes = curlReq('PATCH', `/v1/appScreenshots/${screenshotId}`, {
    data: { type:'appScreenshots', id:screenshotId, attributes:{ uploaded:true, sourceFileChecksum:checksum } }
  });
  return commitRes.status === 200;
}

const IPAD_SET_ID = '401257c9-4312-4cb3-b025-28c80f403c09';

// Delete old black screenshots
console.log('Deleting old iPad screenshots...');
const existing = curlReq('GET', `/v1/appScreenshotSets/${IPAD_SET_ID}/appScreenshots?fields%5BappScreenshots%5D=fileName`);
const oldScreenshots = existing.data?.data || [];
console.log(`Found ${oldScreenshots.length} to delete`);
for (const sc of oldScreenshots) {
  const del = curlReq('DELETE', `/v1/appScreenshots/${sc.id}`);
  console.log(`  Deleted ${sc.attributes?.fileName}: HTTP ${del.status}`);
}

// Upload new ones
const files = ['1-patients','2-patient-detail','3-labs','4-tasks','5-handover'];
console.log('\nUploading proper iPad screenshots...');
for (const name of files) {
  const fileData = fs.readFileSync(`screenshots/ipad/${name}.png`);
  console.log(`Uploading ${name} (${Math.round(fileData.length/1024)}KB)...`);
  const ok = uploadScreenshot(fileData, `${name}.png`, IPAD_SET_ID);
  console.log(ok ? `  ✅` : `  ❌`);
}

console.log('\nAll done!');
