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
let elements = {};

elements["DisplayedPack"] = document.getElementsByClassName("pack-card-image");
elements["DisplayedPackDiv"] = document.getElementsByClassName("pack-card-image-div");

elements["ScoreHTML"] = document.getElementById("score");
elements["FeedbackHTML"] = document.getElementById("feedback");
elements["LoadingSpinner"] = document.getElementById("loadingSpinner");
elements["RestartIcon"] = document.getElementById("restartIcon")
elements["PoolToggle"] = document.getElementById("pool-toggler");

elements["ResetPool"] = document.getElementById("resetSideboard");
elements["ToggleFeedback"] = document.getElementById("toggleFeedback");
elements["Restart"] = document.getElementById("resetDraft")

//Element naming convention not used because these variables are not directly reference anywhere, accessed though elemenetPoolArray
let poolZeroCmc = document.getElementsByClassName("0-cmc-image");
let poolOneCmc = document.getElementsByClassName("1-cmc-image");
let poolTwoCmc = document.getElementsByClassName("2-cmc-image");
let poolThreeCmc = document.getElementsByClassName("3-cmc-image");
let poolFourCmc = document.getElementsByClassName("4-cmc-image");
let poolFiveCmc = document.getElementsByClassName("5-cmc-image");
let poolSixCmc = document.getElementsByClassName("6-cmc-image");

elements["PoolArray"] = [poolZeroCmc, poolOneCmc, poolTwoCmc, poolThreeCmc, poolFourCmc, poolFiveCmc, poolSixCmc];
elements["SideboardArray"] = document.getElementsByClassName("7-cmc-image");

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
let StrixhavenDraftPackage = new DraftSimPackage("Strixhaven", setSize, inputSize, oddsRare, landSlot, elements);

Promise.all([
  tf.loadLayersModel("./tfjs_model/model.json"),
  fetch("./data/output_master_hash.txt"),
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
    StrixhavenDraftPackage.setupAfterPromise(data);
    console.log(StrixhavenDraftPackage.masterHash);
  })
  .catch(function (error) {
    // if there's an error, log it
    console.log(error);
  });

////////////////////////////////// EVENT LISTENERS //////////////////////////////////// 

for (let i = 0; i < 15; i++) {
  StrixhavenDraftPackage.elements["DisplayedPack"][i].addEventListener("click", StrixhavenDraftPackage.humanMakesPick);
}

for (let j = 0; j < StrixhavenDraftPackage.elements["PoolArray"].length; j++){
  for (let i = 0; i < StrixhavenDraftPackage.elements["PoolArray"][j].length; i++) {
    StrixhavenDraftPackage.elements["PoolArray"][j][i].addEventListener("click", StrixhavenDraftPackage.displayPoolAfterSideboard)
  }
}

for (let i = 0; i < 30; i++) {
  StrixhavenDraftPackage.elements["SideboardArray"][i].addEventListener("click", StrixhavenDraftPackage.moveSideboardToPool);
}

StrixhavenDraftPackage.elements["ResetPool"].addEventListener("click", StrixhavenDraftPackage.displayPoolAfterReset);
StrixhavenDraftPackage.elements["ToggleFeedback"].addEventListener("click", StrixhavenDraftPackage.displayFeedbackToggle);
StrixhavenDraftPackage.elements["Restart"].addEventListener("click", StrixhavenDraftPackage.resetDraft);
StrixhavenDraftPackage.elements["PoolToggle"].addEventListener("click", StrixhavenDraftPackage.updatePoolToggled);
StrixhavenDraftPackage.elements["RestartIcon"].addEventListener("click", StrixhavenDraftPackage.resetDraft);