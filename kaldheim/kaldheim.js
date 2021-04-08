"use strict";
///////////////////////////////// TO TEST, RUN ON LOCAL SERVER //////////////////////////////////
// python -m http.server (in console)
// http://localhost:8000/path

///////////////////////////////// CREATE HTML WITH LOOP //////////////////////////////////
let KaldheimHTMLGeneration = new HTMLGeneration();

let mainWindow = document.getElementById("main_window");
KaldheimHTMLGeneration.createPackHTML(mainWindow);

//Element naming convention not used because these variables are not directly reference anywhere, accessed though elemenetPoolColArray
let poolZeroCmcCol = document.getElementById("zero_cmc");
let poolOneCmcCol = document.getElementById("one_cmc");
let poolTwoCmcCol = document.getElementById("two_cmc");
let poolThreeCmcCol = document.getElementById("three_cmc");
let poolFourCmcCol = document.getElementById("four_cmc");
let poolFiveCmcCol = document.getElementById("five_cmc");
let poolSixCmcCol = document.getElementById("six_cmc");
let poolSideboardCol = document.getElementById("sideboard");

let elementPoolColArray = [poolZeroCmcCol, poolOneCmcCol, poolTwoCmcCol, poolThreeCmcCol, poolFourCmcCol, poolFiveCmcCol, poolSixCmcCol, poolSideboardCol];

KaldheimHTMLGeneration.createPoolHTML(elementPoolColArray);

///////////////////////////////// DEFINING GLOBAL VARIABLES //////////////////////////////////
// Fetching relevant cards by class, defining global variables
let elementDisplayedPack = document.getElementsByClassName("pack-card-image");
let elementDisplayedPackDiv = document.getElementsByClassName("pack-card-image-div");

let elementScoreHTML = document.getElementById("score");
let elementFeedbackHTML = document.getElementById("feedback");
let elementLoadingSpinner = document.getElementById("loadingSpinner");
let elementRestartIcon = document.getElementById("restartIcon")
let elementPoolToggle = document.getElementById("pool-toggler");

let elementResetPool = document.getElementById("resetSideboard");
let elementToggleFeedback = document.getElementById("toggleFeedback");
let elementRestart = document.getElementById("resetDraft")

//Element naming convention not used because these variables are not directly reference anywhere, accessed though elemenetPoolArray
let poolZeroCmc = document.getElementsByClassName("0-cmc-image");
let poolOneCmc = document.getElementsByClassName("1-cmc-image");
let poolTwoCmc = document.getElementsByClassName("2-cmc-image");
let poolThreeCmc = document.getElementsByClassName("3-cmc-image");
let poolFourCmc = document.getElementsByClassName("4-cmc-image");
let poolFiveCmc = document.getElementsByClassName("5-cmc-image");
let poolSixCmc = document.getElementsByClassName("6-cmc-image");

let elementPoolArray = [poolZeroCmc, poolOneCmc, poolTwoCmc, poolThreeCmc, poolFourCmc, poolFiveCmc, poolSixCmc];
let elementSideboardArray = document.getElementsByClassName("7-cmc-image");

//////////////////////////////// KALDHEIM UNIQUE VARIABLES //////////////////////////////

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

const setSize = 280;
const inputSize = 574;
const oddsRare = 0.875;

////////////////////////////////// IMPORT ////////////////////////////////////
let KaldheimDraftPackage = new DraftSimPackage("Kaldheim", setSize, inputSize, oddsRare, landSlot);

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
  elementDisplayedPack[i].addEventListener("click", KaldheimDraftPackage.humanMakesPick);
}

for (let j = 0; j < elementPoolArray.length; j++){
  for (let i = 0; i < elementPoolArray[j].length; i++) {
    elementPoolArray[j][i].addEventListener("click", KaldheimDraftPackage.displayPoolAfterSideboard)
  }
}

for (let i = 0; i < 30; i++) {
  elementSideboardArray[i].addEventListener("click", KaldheimDraftPackage.moveSideboardToPool);
}

elementResetPool.addEventListener("click", KaldheimDraftPackage.displayPoolAfterReset);
elementToggleFeedback.addEventListener("click", KaldheimDraftPackage.displayFeedbackToggle);
elementRestart.addEventListener("click", KaldheimDraftPackage.resetDraft);
elementPoolToggle.addEventListener("click", KaldheimDraftPackage.updatePoolToggled);
elementRestartIcon.addEventListener("click", KaldheimDraftPackage.resetDraft);