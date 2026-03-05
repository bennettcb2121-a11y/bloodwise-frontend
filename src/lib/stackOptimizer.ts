export function analyzeStack(stack:string){

if(!stack){
return {
issues:[],
currentCost:0,
optimizedCost:0,
savings:0
}
}

const supplements = stack
.toLowerCase()
.split(',')
.map((s)=>s.trim())

const issues:string[] = []

let currentCost = 0
let optimizedCost = 0

const costDatabase:any = {

creatine:15,
magnesium:12,
bcaa:25,
"vitamin d":10,
ashwagandha:18,
iron:12,
b12:10,
multivitamin:15

}

/* Calculate baseline cost */

supplements.forEach((supp:string)=>{

const cost = costDatabase[supp] || 15

currentCost += cost
optimizedCost += cost

})

/* Detect unnecessary supplements */

if(supplements.includes("bcaa")){

issues.push("BCAAs are usually unnecessary if protein intake is adequate.")

optimizedCost -= 25

}

/* Detect duplicate magnesium */

const magnesiumCount = supplements.filter(
(s)=>s==="magnesium"
).length

if(magnesiumCount > 1){

issues.push("Multiple magnesium supplements detected.")

optimizedCost -= 12

}

/* Creatine dosage guidance */

if(supplements.includes("creatine")){

issues.push("Creatine works best at ~5g per day.")

}

/* Calculate savings */

const savings = currentCost - optimizedCost

return {

issues,
currentCost,
optimizedCost,
savings

}

}