// Classify only explicit food/drink business names in the dated pet-friendly register.
// General restaurant registration alone cannot distinguish a cafe, restaurant or bar.
function classifyDining(row){
 if(row.indutyNm!=='일반음식점')return null;
 const name=row.bsshNm;
 if(/맥줏집|혼술바|바크바|Bar Bam Bar|Records Bar|양조장|^술인$|포차|탈안주/i.test(name))return 'bar';
 if(/누들|분식|장칼|램\(|타코|치킨|피자|부엌|쌈밥|만두|칼국수|갈비|솥밥|냉면|통닭|오스테리아|닭발|버거|닭강정|식당|스테이크|막회|브런치|더치킨|수제갈비/i.test(name))return 'restaurant';
 return null;
}
module.exports={classifyDining};
