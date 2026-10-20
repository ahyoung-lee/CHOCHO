(function(root){
'use strict';
function create(host,{element,key,onChange,onReady,onError}){
 let map=null,loading=false,script=null,timer=null,attempt=0,updating=false,failed=false;
 let view={center:{lat:35.75,lng:128.25},zoom:6};
 const coords=p=>new host.naver.maps.LatLng(p.lat,p.lng);
 const fail=message=>{host.clearTimeout(timer);loading=false;failed=true;onError(message);};
 const api={
  get map(){return map;},
  load(){
   if(map&&!failed){api.resize();return;}
   if(loading)return;
   if(map){map.destroy();map=null;}
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
  resize(){if(map&&element.clientWidth&&element.clientHeight)map.setSize(new host.naver.maps.Size(element.clientWidth,element.clientHeight));}
 };
 return api;
}
if(typeof module!=='undefined')module.exports=create;else root.NAVER_MAP={create:options=>create(root,options)};
})(typeof window!=='undefined'?window:globalThis);
