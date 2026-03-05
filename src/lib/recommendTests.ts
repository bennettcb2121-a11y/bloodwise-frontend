export function recommendTests(profile:any){

let tests = [
"Ferritin",
"Vitamin D",
"Magnesium",
"Vitamin B12",
"CRP",
"Glucose",
"Insulin"
]

if(profile.sport === "Running"){
tests.push("Iron Saturation")
tests.push("Hemoglobin")
}

if(profile.sport === "Cycling"){
tests.push("Hemoglobin")
}

if(profile.sex === "Male"){
tests.push("Testosterone")
}

if(profile.sex === "Female"){
tests.push("Iron Saturation")
}

if(profile.diet === "Vegan"){
tests.push("Vitamin B12")
tests.push("Ferritin")
}

if(profile.trainingVolume > 10){
tests.push("Cortisol")
}

return [...new Set(tests)]

}