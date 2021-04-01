"use strict";
///////////////////////////////// TO TEST, RUN ON LOCAL SERVER //////////////////////////////////
// python -m http.server (in console)
// http://localhost:8000/path

///////////////////////////////// FETCH CLASS WITH METHODS  //////////////////////////////////
let DraftMethods = new DraftSimPackage("Kaldheim");
console.log(DraftMethods.feature_vector_index);
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

// General variables used to store static information about the set
const setSize = 280;
const inputSize = 574;
const oddsOfRare = 0.875;

// Counters used to maintain the gamestate
let score = 0;
let currentPick = 0;
let currentPack = 0;
let picksActive = false;
let feedbackActive = true;
let poolToggled = false;
let draftOver = false;

// Variables that store the active state of players (human and bots)
let activePacks; // Onehot array of shape [8, 3, 280] representing all packs in the draft
let activeOnehots; // Array of shape [8, 574] representing the vector being fed into the prediction matrix
let activePreds; // Array of length 8 representing the bot pred of each pick being made
let activePicks; // Array of length 8 representing each being made.  For human, it is their choice
let activeFeatureVectors; // Array of shape [8, 14] representing all players feature vectors
let activePools; //Array of shape [8, 280] representing all pools for all players
let activePickSoftmax;  // the softmax output of the human pick
let activePoolUrls = [[], [], [], [], [], []] //array of 6 arrays representing pool pile urls
let sideboardPoolOneCmc = [];
let sideboardPoolTwoCmc = [];
let sideboardPoolThreeCmc = [];
let sideboardPoolFourCmc = [];
let sideboardPoolFiveCmc = [];
let sideboardPoolSixCmc = [];
let masterHash;

let commons = [];
let uncommons = [];
let rares = [];
let mythics = [];
let snowLands = [
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

let model;
let savedOutput;
let poolSideboard = [sideboardPoolOneCmc, sideboardPoolTwoCmc, sideboardPoolThreeCmc, sideboardPoolFourCmc, sideboardPoolFiveCmc, sideboardPoolSixCmc];

let prevActivePicks;  // the previous active pick made by all the bots
let prevPrevActivePicks;  // two picks back

////////////////////////////////// IMPORT ////////////////////////////////////

Promise.all([
  tf.loadLayersModel("./draft_sim_website/tfjs_4/model.json"),
  fetch("./draft_sim_website/data/output_dict.txt"),
  fetch("./draft_sim_website/data/output_master_hash.txt"),
])
  .then(function (responses) {
    // Get a JSON object from each of the responses
    let model = responses[0];
    let json_response = responses.slice(1 - 3).map(function (response) {
      return response.json();
    });
    return Promise.all([model, json_response[0], json_response[1]]);
  })
  .then(function (data) {
/////////////////////////////////// SETUP ////////////////////////////////////
    masterHash = data[2];
    savedOutput = data[1];
    model = data[0];
    activePools = DraftMethods.generateActivePools();
    activeFeatureVectors = DraftMethods.generateActiveFeatures();
    [commons, uncommons, rares, mythics, snowLands] = DraftMethods.generateRarityArrays();
    activePacks = DraftMethods.generateActivePacks();
    activeOnehots = DraftMethods.updateOnehots(activePacks, activeFeatureVectors, activePools, currentPack);
    loadingText.style.display = "none";
    loadingSpinner.style.display = "none";
    DraftMethods.displayPack(activeOnehots[0]);
    [activePreds, activePickSoftmax] = DraftMethods.makeBatchPreds(activeOnehots);
    picksActive = true;
    for (let i = 0; i < 15; i++) {
      displayedPack[i].style.webkitAnimation = "none"
      displayedPack[i].style.webkitAnimation = 'fade-in';
    }
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

