export function calculateScore(report:any[]){

let score = 100

report.forEach(marker=>{

if(marker.status==="deficient"){
score -= marker.weight
}

if(marker.status==="suboptimal"){
score -= marker.weight/2
}

})

return Math.max(Math.round(score),0)

}