import { biomarkerDatabase } from "./biomarkerDatabase"

export function analyzeBiomarkers(bloodwork:any, profile:any){

const results:any[] = []

Object.entries(biomarkerDatabase).forEach(([marker,data]:any)=>{

const value = Number(bloodwork[marker])

if(value === undefined || isNaN(value)) return

let status = "optimal"

if(value < data.deficient){
status = "deficient"
}
else if(value < data.suboptimal){
status = "suboptimal"
}

results.push({

marker,
value,
status,

...data

})

})

return results

}