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

elements["FeedbackHTML"] = document.getElementById("feedback");
elements["LoadingSpinner"] = document.getElementById("loadingSpinner");
elements["RestartIcon"] = document.getElementById("restartIcon")
elements["PoolToggle"] = document.getElementById("pool-toggler");

elements["ResetPool"] = document.getElementById("resetSideboard");
elements["ToggleFeedback"] = document.getElementById("toggleFeedback");
elements["Restart"] = document.getElementById("resetDraft")

elements["packCountHTML"] = document.getElementById("packCountHTML");
elements["deckCountHTML"] = document.getElementById("deckCountHTML");
elements["creatureCountHTML"] = document.getElementById("creatureCountHTML");
elements["spellCountHTML"] = document.getElementById("spellCountHTML");
elements["landCountHTML"] = document.getElementById("landCountHTML");
elements["accuracyCountHTML"] = document.getElementById("accuracyCountHTML");
elements["imageSizeSlider"] = document.getElementById("myRange")

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
const MLPreds = true;
const genericPack = true;


////////////////////////////////// IMPORT ////////////////////////////////////
let KaldheimDraftPackage = new DraftSimPackage("Kaldheim", setSize, inputSize, oddsRare, landSlot, elements, MLPreds, genericPack);

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
    KaldheimDraftPackage.setupAfterPromise(data);
    console.log(KaldheimDraftPackage.masterHash);
  })
  .catch(function (error) {
    // if there's an error, log it
    console.log(error);
  });

////////////////////////////////// EVENT LISTENERS ////////////////////////////////////

elements["imageSizeSlider"].oninput = function () {
  for (let i = 0; i < StrixhavenDraftPackage.elements["DisplayedPackDiv"].length; i++) {
    StrixhavenDraftPackage.elements["DisplayedPackDiv"][i].style.maxWidth = `${this.value}vh`;
  }
};

for (let i = 0; i < 15; i++) {
  KaldheimDraftPackage.elements["DisplayedPack"][i].addEventListener("click", KaldheimDraftPackage.humanMakesPick);
}

for (let j = 0; j < KaldheimDraftPackage.elements["PoolArray"].length; j++){
  for (let i = 0; i < KaldheimDraftPackage.elements["PoolArray"][j].length; i++) {
    KaldheimDraftPackage.elements["PoolArray"][j][i].addEventListener("click", KaldheimDraftPackage.displayPoolAfterSideboard)
  }
}

for (let i = 0; i < 30; i++) {
  KaldheimDraftPackage.elements["SideboardArray"][i].addEventListener("click", KaldheimDraftPackage.moveSideboardToPool);
}

KaldheimDraftPackage.elements["ResetPool"].addEventListener("click", KaldheimDraftPackage.displayPoolAfterReset);
KaldheimDraftPackage.elements["ToggleFeedback"].addEventListener("click", KaldheimDraftPackage.displayFeedbackToggle);
KaldheimDraftPackage.elements["Restart"].addEventListener("click", KaldheimDraftPackage.resetDraft);
KaldheimDraftPackage.elements["PoolToggle"].addEventListener("click", KaldheimDraftPackage.updatePoolToggled);
KaldheimDraftPackage.elements["RestartIcon"].addEventListener("click", KaldheimDraftPackage.resetDraft);