export function buildReportSummary(report:any[]){

const deficient = report
.filter(m=>m.status==="deficient")
.map(m=>m.marker)

const suboptimal = report
.filter(m=>m.status==="suboptimal")
.map(m=>m.marker)

if(deficient.length===0 && suboptimal.length===0){
return "Your biomarkers appear within optimal ranges."
}

let text = ""

if(deficient.length>0){
text += `Your bloodwork shows deficiencies in ${deficient.join(", ")}. `
}

if(suboptimal.length>0){
text += `Some markers are below optimal including ${suboptimal.join(", ")}. `
}

text += "Addressing these markers may improve recovery, performance, and overall health."

return text

}