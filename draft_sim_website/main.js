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
let poolSideboard = [sideboardPoolOneCmc, sideboardPoolTwoCmc, sideboardPoolThreeCmc, sideboardPoolFourCmc, sideboardPoolFiveCmc, sideboardPoolSixCmc];

let prevActivePicks;  // the previous active pick made by all the bots
let prevPrevActivePicks;  // two picks back

///////////////////////////////// GENERATING ACTIVE VARIABLES //////////////////////////////////

activePools = DraftMethods.generateActivePools();
activeFeatureVectors = DraftMethods.generateActiveFeatures();

// Generate function to split arrays of cards by rarity
function generateRarityArrays() {
  commons = [];
  uncommons = [];
  rares = [];
  mythics = []
  snowLands = [
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
  cardsAvailable = [];
  for (let key in masterHash["name_to_collector"]) {
    if (masterHash["name_to_collector"][key] < 286) {
      cardsAvailable.push(key);
    }
  }
  for (m = 0; m < cardsAvailable.length; m++) {
    if (masterHash["name_to_rarity"][cardsAvailable[m]] === "common" && !snowLands.includes(cardsAvailable[m])) {
      commons.push(cardsAvailable[m]);
    }
    if (masterHash["name_to_rarity"][cardsAvailable[m]] === "uncommon") {
      uncommons.push(cardsAvailable[m]);
    }
    if (masterHash["name_to_rarity"][cardsAvailable[m]] === "rare") {
      rares.push(cardsAvailable[m]);
    }
    if (masterHash["name_to_rarity"][cardsAvailable[m]] === "mythic"){
      mythics.push(cardsAvailable[m]);
    }
  }
  return [commons, uncommons, rares, mythics, snowLands];
}

///////////////////////////////////////////
///////////////////////////////////////////
///////////////////////////////////////////
///////////////////////////////////////////
///////////////////////////////////////////


///////////////////////////////// UPDATEFUNCS //////////////////////////////////

function humanMakesPick() {
  // Changing border color of the card the player picked
  if (picksActive === true) {
    for (i = 0; i < 15; i++) {
      displayedPack[i].removeEventListener("click", humanMakesPick);
    }
    picksActive = false;
    pickSRC = this.src;
    for (i = 0; i < displayedPack.length; i++) {
      if (displayedPack[i].src === pickSRC) {
        displayedPack[i].style.border = "thick solid #ff9966";
      }
    }
    // Highlighting bot pick and calculating accuracy of human pick
    pickName = masterHash["url_to_name"][pickSRC];
    pickIndex = masterHash["name_to_index"][pickName];

    activePicks = JSON.parse(JSON.stringify(activePreds)); //this creates a deepcopy, because JS using shallowcopy for arrays
    activePicks[0] = pickIndex;

    DraftMethods.displayBotPred(activePreds[0]);
    DraftMethods.generatePickAccuracy(activePickSoftmax, activePicks, activePreds);

    // Updating event listeners
    setTimeout(() => {
      for (i = 0; i < 15; i++) {
        displayedPack[i].addEventListener("click", humanSeesResults);
      }
    }, 100);

    // Updating pools, feature vectors, and packs
  }
}

function humanSeesResults() {
  if (picksActive === false) {
    for (i = 0; i < 15; i++) {
      displayedPack[i].removeEventListener("click", humanSeesResults);
    }
    DraftMethods.updatePick();
    if (currentPick < 45) {
      DraftMethods.updatePools(activePicks, activePools);
      activeFeatureVectors = DraftMethods.updateFeatureVectors(activePicks, activeFeatureVectors);
      activePacks = DraftMethods.updatePacks(currentPick, activePacks, activePicks);
      packnumb = Math.floor(currentPick/15)
      for (f = 0; f < 8; f++) {
        sum = DraftMethods.findSum(activePacks[f][packnumb]);
      }
      activeOnehots = DraftMethods.updateOnehots(activePacks, activeFeatureVectors, activePools, currentPack);
      [activePreds, activePickSoftmax] = DraftMethods.makeBatchPreds(activeOnehots);
      DraftMethods.displayPack(activeOnehots[0]);
      picksActive = true;
      DraftMethods.displayPoolImages(activePicks);
      setTimeout(() => {
        for (i = 0; i < 15; i++) {
          displayedPack[i].addEventListener("click", humanMakesPick);
        }
      }, 100);
      feedbackHTML.innerHTML = ""
    } else {
      DraftMethods.updateDraftIfOver();  
    }
  }
}

////////////////////////////////// IMPORT ////////////////////////////////////

Promise.all([
  tf.loadLayersModel("./draft_sim_website/tfjs_4/model.json"),
  fetch("./draft_sim_website/data/output_dict.txt"),
  fetch("./draft_sim_website/data/output_master_hash.txt"),
])
  .then(function (responses) {
    // Get a JSON object from each of the responses
    model = responses[0];
    json_response = responses.slice(1 - 3).map(function (response) {
      return response.json();
    });
    return Promise.all([model, json_response[0], json_response[1]]);
  })
  .then(function (data) {
    ///////////////////////////////// SETUP //////////////////////////////////
    masterHash = data[2];
    savedOutput = data[1];
    model = data[0];
    let [commons, uncommons, rares, mythics, snowLands] = generateRarityArrays();
    activePacks = DraftMethods.generateActivePacks();
    activeOnehots = DraftMethods.updateOnehots(activePacks, activeFeatureVectors, activePools, currentPack);
    loadingText.style.display = "none";
    loadingSpinner.style.display = "none";
    DraftMethods.displayPack(activeOnehots[0]);
    [activePreds, activePickSoftmax] = DraftMethods.makeBatchPreds(activeOnehots);
    picksActive = true;
    for (i = 0; i < 15; i++) {
      displayedPack[i].style.webkitAnimation = "none"
      displayedPack[i].style.webkitAnimation = 'fade-in';
    }
    for (h = 0; h < 8; h++) {
      for (w = 0;w < 3; w++) {
        sum = DraftMethods.findSum(activePacks[h][w])
      }
    }
  })
  .catch(function (error) {
    // if there's an error, log it
    console.log(error);
  });


////////////////////////////////// EVENT LISTENERS //////////////////////////////////// 

for (i = 0; i < 15; i++) {
  displayedPack[i].addEventListener("click", humanMakesPick);
}

for (j = 0; j < poolArray.length; j++){
  for (i = 0; i < poolArray[j].length; i++) {
    poolArray[j][i].addEventListener("click", DraftMethods.displayPoolAfterSideboard)
  }
}
resetSideboardButton.addEventListener("click", DraftMethods.displayPoolAfterReset);
toggleFeedbackButton.addEventListener("click", DraftMethods.displayFeedbackToggle);
resetDraftButton.addEventListener("click", DraftMethods.resetDraft)
poolToggle.addEventListener("click", DraftMethods.updatePoolToggled)

