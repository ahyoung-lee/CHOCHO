(function(root){
'use strict';
function create(host,{element,key,onChange,onReady,onError}){
 let map=null,loading=false,script=null,timer=null,attempt=0,updating=false,failed=false;
 let view={center:{lat:35.75,lng:128.25},zoom:6};
 const markers=new Map();let originMarker=null,originSignature='',selectMarker=()=>{};
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const coords=p=>new host.naver.maps.LatLng(p.lat,p.lng);
 const fail=message=>{host.clearTimeout(timer);loading=false;failed=true;onError(message);};
 const api={
  get map(){return map;},
  getMarker(id){return markers.get(id)?.marker;},
  load(){
   if(map&&!failed){api.resize();return;}
   if(loading)return;
   if(map){map.destroy();map=null;markers.clear();originMarker=null;originSignature='';}
   loading=true;failed=false;const version=++attempt;
   script?.remove();
   host.navermap_authFailure=()=>{if(version===attempt)fail('네이버 지도 인증에 실패했어요. Maps의 Client ID와 Web 서비스 URL 등록을 확인해 주세요.');};
   // The SDK callback can run before the script publishes window.naver.
   host.initChochoNaverMap=()=>host.setTimeout(()=>{
    if(version!==attempt||!loading)return;
    try{
     const n=host.naver.maps;
     map=new n.Map(element,{center:coords(view.center),zoom:view.zoom,minZoom:5,maxZoom:16,keyboardShortcuts:true,scaleControl:true,logoControl:true,mapDataControl:true});
     n.Event.addListener(map,'bounds_changed',()=>{if(!updating)onChange({center:{lat:map.getCenter().lat(),lng:map.getCenter().lng()},zoom:map.getZoom()});});
     host.clearTimeout(timer);loading=false;onReady();
    }catch(error){host.console?.error('Naver map initialization failed:',error);map=null;fail('네이버 지도를 시작하지 못했어요. 다시 시도해 주세요.');}
   },0);
   script=host.document.createElement('script');script.async=true;
   script.src='https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId='+encodeURIComponent(key)+'&callback=initChochoNaverMap';
   script.onerror=()=>{if(version===attempt)fail('네이버 지도를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');};
   timer=host.setTimeout(()=>{if(version===attempt)fail('네이버 지도 연결 시간이 초과됐어요. 다시 시도해 주세요.');},15000);
   host.document.head.appendChild(script);
  },
  setView(center,zoom){
   view={center:{...center},zoom};if(!map)return;
   const c=map.getCenter();
   if(Math.abs(c.lat()-center.lat)<1e-9&&Math.abs(c.lng()-center.lng)<1e-9&&map.getZoom()===zoom)return;
   updating=true;
   try{map.setOptions({center:coords(center),zoom});}finally{updating=false;}
  },
  project(point){if(!map)return null;const p=map.getProjection().fromCoordToOffset(coords(point));return {x:p.x,y:p.y};},
  syncMarkers(places,origin,selected,onSelect){
   if(!map)return false;
   const n=host.naver.maps,ids=new Set(places.map(p=>p.id));selectMarker=onSelect;
   for(const [id,entry]of markers)if(!ids.has(id)){entry.marker.setMap(null);markers.delete(id);}
   for(const p of places){
    const active=p.id===selected,zIndex=active?100000:100+p.number;
    const content=`<button type="button" class="native-marker${active?' selected':''}" data-marker="${escape(p.id)}" aria-label="${escape(p.name)}" aria-pressed="${active}"><svg width="44" height="54" viewBox="0 0 44 54" aria-hidden="true"><path d="M22 50C18 44 4 32 4 22a18 18 0 1 1 36 0c0 10-14 22-18 28Z" fill="${active?'#a6122d':'#d92d3a'}" stroke="${active?'#ffe1a3':'white'}" stroke-width="3"/><text x="22" y="27" text-anchor="middle" fill="white" font-size="15" font-weight="700">${p.number}</text></svg><span class="native-marker-label">${escape(p.name)}</span></button>`;
    const icon={content,size:new n.Size(44,54),anchor:new n.Point(22,50)};
    let entry=markers.get(p.id);
    if(!entry){
     const marker=new n.Marker({map,position:coords(p),icon,zIndex,title:p.name});
     n.Event.addListener(marker,'click',()=>selectMarker(p.id));
     entry={marker,content,lat:p.lat,lng:p.lng};markers.set(p.id,entry);
    }else{
     if(entry.lat!==p.lat||entry.lng!==p.lng){entry.marker.setPosition(coords(p));entry.lat=p.lat;entry.lng=p.lng;}
     if(entry.content!==content){entry.marker.setIcon(icon);entry.content=content;}
     entry.marker.setZIndex(zIndex);
    }
   }
   const signature=JSON.stringify([origin.name,origin.lat,origin.lng]);
   if(signature!==originSignature){
    const icon={content:`<div class="origin-marker native-origin"><b></b><span>${escape(origin.name)} 출발</span></div>`,size:new n.Size(16,16),anchor:new n.Point(8,8)};
    if(!originMarker)originMarker=new n.Marker({map,position:coords(origin),icon,zIndex:50,clickable:false,title:origin.name});
    else{originMarker.setPosition(coords(origin));originMarker.setIcon(icon);}
    originSignature=signature;
   }
   return true;
  },
  resize(){if(map&&element.clientWidth&&element.clientHeight)map.setSize(new host.naver.maps.Size(element.clientWidth,element.clientHeight));}
 };
 return api;
}
if(typeof module!=='undefined')module.exports=create;else root.NAVER_MAP={create:options=>create(root,options)};
})(typeof window!=='undefined'?window:globalThis);
