(function(root){
'use strict';
// Keep content visible when motion is reduced or observation is unsupported.
if(!root.IntersectionObserver||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
const observer=new root.IntersectionObserver(entries=>{
 for(const entry of entries){
  if(!entry.isIntersecting)continue;
  entry.target.classList.add('is-revealed');
  observer.unobserve(entry.target);
 }
},{threshold:0,rootMargin:'0px 0px -24px 0px'});
root.document.querySelectorAll('main > :not(.explorer), .list-panel, .map-panel, footer').forEach(section=>{
 section.classList.add('reveal-section');
 observer.observe(section);
});
})(window);
