export function classifyUser(profile:any){

const { age, sex, sport, trainingVolume, diet } = profile

let athleteType = "general"

if(sport === "Running" || sport === "Cycling" || sport === "Triathlon"){
athleteType = "endurance"
}

if(sport === "Strength Training"){
athleteType = "strength"
}

if(sport === "Ball Sports"){
athleteType = "mixed"
}

let trainingLevel = "low"

if(trainingVolume >= 6) trainingLevel = "high"
else if(trainingVolume >= 3) trainingLevel = "moderate"

let dietType = diet || "omnivore"

return {

athleteType,
trainingLevel,
dietType,
sex,
age

}

}