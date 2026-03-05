export function buildTopActions(report:any[]){

return report
.filter(m=>m.status!=="optimal")
.sort((a,b)=>b.weight-a.weight)
.slice(0,3)

}