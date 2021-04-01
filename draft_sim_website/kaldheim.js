"use strict";
///////////////////////////////// TO TEST, RUN ON LOCAL SERVER //////////////////////////////////
// python -m http.server (in console)
// http://localhost:8000/path

let landSlot = [
  "Snow-Covered Mountain",
  "Snow-Covered Island",
  "Snow-Covered Swamp",
  "Snow-Covered Forest",
  "Snow-Covered Plains",
  "Alpine Meadow",
  "Arctic Treeline",
  "Glacial Floodplain",
  "Highland Forest",
  "Ice Tunnel",
  "Rimewood Falls",
  "Snowfield Sinkhole",
  "Sulfurous Mire",
  "Volatile Fjord",
  "Woodland Chasm",
];

///////////////////////////////// FETCH CLASS WITH METHODS  //////////////////////////////////
let DraftMethods = new DraftSimPackage("Kaldheim", 280, 574, 0.875, landSlot);
///////////////////////////////// DEFINING GLOBAL VARIABLES //////////////////////////////////
// Fetching relevant cards by class, defining global variables
let displayedPack = document.getElementsByClassName("pack-card-image");

let scoreHTML = document.getElementById("score");
let feedbackHTML = document.getElementById("feedback");
let loadingText = document.getElementById("loadingText");
let loadingSpinner = document.getElementById("loadingSpinner");
let restartText = document.getElementById("restartText")
let restartIcon = document.getElementById("restartIcon")
let poolToggle = document.getElementById("pool-toggler");

let resetSideboardButton = document.getElementById("resetSideboard");
let toggleFeedbackButton = document.getElementById("toggleFeedback");
let resetDraftButton = document.getElementById("resetDraft")

let poolOneCmc = document.getElementsByClassName("one-cmc-image");
let poolTwoCmc = document.getElementsByClassName("two-cmc-image");
let poolThreeCmc = document.getElementsByClassName("three-cmc-image");
let poolFourCmc = document.getElementsByClassName("four-cmc-image");
let poolFiveCmc = document.getElementsByClassName("five-cmc-image");
let poolSixCmc = document.getElementsByClassName("six-cmc-image");
let poolArray = [poolOneCmc, poolTwoCmc, poolThreeCmc, poolFourCmc, poolFiveCmc, poolSixCmc];

////////////////////////////////// IMPORT ////////////////////////////////////

Promise.all([
  tf.loadLayersModel("./draft_sim_website/tfjs_4/model.json"),
  fetch("./draft_sim_website/data/output_dict.txt"),
  fetch("./draft_sim_website/data/output_master_hash.txt"),
])
  .then(function (responses) {
    // Get a JSON object from each of the responses
    let model = responses[0];
    let json_response = responses.slice(1 - 2).map(function (response) {
      return response.json();
    });
    return Promise.all([model, json_response[0], json_response[1]]);
  })
  .then(function (data) {
    DraftMethods.setupAfterPromise(data);
/////////////////////////////////// SETUP ////////////////////////////////////
  })
  .catch(function (error) {
    // if there's an error, log it
    console.log(error);
  });

////////////////////////////////// EVENT LISTENERS //////////////////////////////////// 

for (let i = 0; i < 15; i++) {
  displayedPack[i].addEventListener("click", DraftMethods.humanMakesPick);
}

for (let j = 0; j < poolArray.length; j++){
  for (let i = 0; i < poolArray[j].length; i++) {
    poolArray[j][i].addEventListener("click", DraftMethods.displayPoolAfterSideboard)
  }
}

resetSideboardButton.addEventListener("click", DraftMethods.displayPoolAfterReset);
toggleFeedbackButton.addEventListener("click", DraftMethods.displayFeedbackToggle);
resetDraftButton.addEventListener("click", DraftMethods.resetDraft)
poolToggle.addEventListener("click", DraftMethods.updatePoolToggled)
restartIcon.addEventListener("click", DraftMethods.resetDraft)