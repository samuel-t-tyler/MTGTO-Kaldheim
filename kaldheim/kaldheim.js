"use strict";
///////////////////////////////// TO TEST, RUN ON LOCAL SERVER //////////////////////////////////
// python -m http.server (in console)
// http://localhost:8000/path

///////////////////////////////// KALDHEIM UNIQUE VARIABLES //////////////////////////////////
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

const setSize = 280
const inputSize = 574
const oddsRare = 0.875

///////////////////////////////// FETCH CLASS WITH METHODS  //////////////////////////////////
let KaldheimDraftPackage = new DraftSimPackage("Kaldheim", setSize, inputSize, oddsRare, landSlot);

///////////////////////////////// CREATE HTML WITH LOOP //////////////////////////////////
let mainWindow = document.getElementById("main_window");

KaldheimDraftPackage.createPackHTML(mainWindow);

let poolZeroCmcCol = document.getElementById("zero_cmc");
let poolOneCmcCol = document.getElementById("one_cmc");
let poolTwoCmcCol = document.getElementById("two_cmc");
let poolThreeCmcCol = document.getElementById("three_cmc");
let poolFourCmcCol = document.getElementById("four_cmc");
let poolFiveCmcCol = document.getElementById("five_cmc");
let poolSixCmcCol = document.getElementById("six_cmc");
let poolSideboardCol = document.getElementById("sideboard");
let poolColArray = [poolZeroCmcCol, poolOneCmcCol, poolTwoCmcCol, poolThreeCmcCol, poolFourCmcCol, poolFiveCmcCol, poolSixCmcCol, poolSideboardCol];

KaldheimDraftPackage.createPoolHTML(poolColArray);

///////////////////////////////// DEFINING GLOBAL VARIABLES //////////////////////////////////
// Fetching relevant cards by class, defining global variables
let displayedPack = document.getElementsByClassName("pack-card-image");
let displayedPackDiv = document.getElementsByClassName("pack-card-image-div");

let scoreHTML = document.getElementById("score");
let feedbackHTML = document.getElementById("feedback");
let loadingText = document.getElementById("loadingText");
let loadingSpinner = document.getElementById("loadingSpinner");
let restartText = document.getElementById("restartText")
let restartIcon = document.getElementById("restartIcon")
let poolToggle = document.getElementById("pool-toggler");
let poolWindow = document.getElementById("pool_window");

let resetSideboardButton = document.getElementById("resetSideboard");
let toggleFeedbackButton = document.getElementById("toggleFeedback");
let resetDraftButton = document.getElementById("resetDraft")

let poolZeroCmc = document.getElementsByClassName("0-cmc-image");
let poolOneCmc = document.getElementsByClassName("1-cmc-image");
let poolTwoCmc = document.getElementsByClassName("2-cmc-image");
let poolThreeCmc = document.getElementsByClassName("3-cmc-image");
let poolFourCmc = document.getElementsByClassName("4-cmc-image");
let poolFiveCmc = document.getElementsByClassName("5-cmc-image");
let poolSixCmc = document.getElementsByClassName("6-cmc-image");
let poolArray = [poolZeroCmc, poolOneCmc, poolTwoCmc, poolThreeCmc, poolFourCmc, poolFiveCmc, poolSixCmc];

let poolSideboardImg = document.getElementsByClassName("7-cmc-image");

////////////////////////////////// IMPORT ////////////////////////////////////

Promise.all([
  tf.loadLayersModel("./kaldheim/tfjs_model/model.json"),
  fetch("./kaldheim/data/output_master_hash.txt"),
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
    /////////////////////////////////// SETUP ////////////////////////////////////
    KaldheimDraftPackage.setupAfterPromise(data);
    console.log(KaldheimDraftPackage.masterHash);
  })
  .catch(function (error) {
    // if there's an error, log it
    console.log(error);
  });

////////////////////////////////// EVENT LISTENERS //////////////////////////////////// 

for (let i = 0; i < 15; i++) {
  displayedPack[i].addEventListener("click", KaldheimDraftPackage.humanMakesPick);
}

for (let j = 0; j < poolArray.length; j++){
  for (let i = 0; i < poolArray[j].length; i++) {
    poolArray[j][i].addEventListener("click", KaldheimDraftPackage.displayPoolAfterSideboard)
  }
}

// for (let i = 0; i < 30; i++) {
//   poolSideboardImg[i].addEventListener("click", KaldheimDraftPackage.moveSideboardToPool);
// }

resetSideboardButton.addEventListener("click", KaldheimDraftPackage.displayPoolAfterReset);
toggleFeedbackButton.addEventListener("click", KaldheimDraftPackage.displayFeedbackToggle);
resetDraftButton.addEventListener("click", KaldheimDraftPackage.resetDraft);
poolToggle.addEventListener("click", KaldheimDraftPackage.updatePoolToggled);
restartIcon.addEventListener("click", KaldheimDraftPackage.resetDraft);