const fs=require('node:fs'),path=require('node:path');
function validate(data){
 const errors=[],seen=new Set();
 if(!data||!Array.isArray(data.places)||!data.origins)throw new Error('places 배열과 origins 객체가 필요합니다.');
 for(const p of data.places){
  const prefix=p.id||'(id 미입력)';
  if(!/^[a-z][a-z0-9-]*$/.test(p.id)||seen.has(p.id))errors.push(`${prefix}: id가 잘못되었거나 중복입니다.`);seen.add(p.id);
  for(const key of ['name','area','region','address','phone','position','positionNote','petArea','dogRule','yard','hours','hoursNote','fee','evidence','checkedAt'])if(typeof p[key]!=='string'||!p[key].trim())errors.push(`${prefix}: ${key}가 필요합니다.`);
  if(!/^[0-9-]{8,20}$/.test(p.phone))errors.push(`${prefix}: 전화번호는 숫자와 하이픈만 가능합니다.`);
  if(p.category==='companion'&&p.playground===true)errors.push(`${prefix}: 운동장 확인 장소의 유형을 다시 확인하세요.`);
  if(!['playground','companion'].includes(p.category))errors.push(`${prefix}: category는 playground 또는 companion입니다.`);
  if(p.companionModes!==undefined&&(!Array.isArray(p.companionModes)||p.companionModes.some(mode=>!['packing','harness'].includes(mode))||new Set(p.companionModes).size!==p.companionModes.length))errors.push(`${prefix}: companionModes는 packing/harness 배열이며 중복 없이 입력합니다.`);
  if(!['listed','closed','unverified'].includes(p.status))errors.push(`${prefix}: status는 listed/closed/unverified입니다.`);
  if(p.category==='playground'&&p.playground!==true)errors.push(`${prefix}: 운동장 카페는 운동장 확인 근거가 필요합니다.`);
  for(const key of ['playground','parking','indoor','outdoor','terrace'])if(p[key]!==undefined&&p[key]!==null&&typeof p[key]!=='boolean')errors.push(`${prefix}: ${key}는 true/false/null입니다.`);
  if(p.weightLimit!==null&&(!Number.isFinite(p.weightLimit)||p.weightLimit<=0))errors.push(`${prefix}: weightLimit이 잘못되었습니다.`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(p.checkedAt))errors.push(`${prefix}: 확인일은 YYYY-MM-DD 형식입니다.`);
  if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||p.lat< -85||p.lat>85||p.lng< -180||p.lng>180)errors.push(`${prefix}: 지도 좌표가 잘못되었습니다.`);
  if(!Array.isArray(p.checks)||!p.checks.length)errors.push(`${prefix}: 재확인 항목이 필요합니다.`);
  if(!Array.isArray(p.sources)||!p.sources.length)errors.push(`${prefix}: 출처가 필요합니다.`);
  for(const s of p.sources||[])try{if(new URL(s.url).protocol!=='https:')throw new Error();}catch(_){errors.push(`${prefix}: 출처는 https URL이어야 합니다.`);}
  for(const key of Object.keys(data.origins)){const t=p.times?.[key];if(!Array.isArray(t)||t.length!==2||!t.every(n=>Number.isFinite(n)&&n>=0)||t[1]<t[0])errors.push(`${prefix}: ${key} 이동시간 범위가 잘못되었습니다.`);}
  if(p.schedule!==null&&(!Array.isArray(p.schedule)||p.schedule.length!==7||p.schedule.some(s=>s!==null&&(!Array.isArray(s)||s.length!==2||!s.every(n=>Number.isFinite(n)&&n>=0&&n<=2880)||s[1]<s[0]))))errors.push(`${prefix}: 요일별 일정이 잘못되었습니다.`);
 }
 if(errors.length)throw new Error(errors.join('\n'));return data;
}
module.exports={validate};
if(require.main===module){validate(JSON.parse(fs.readFileSync(path.join(__dirname,'../data/venues.json'),'utf8')));console.log('카페 데이터 검증 통과');}
